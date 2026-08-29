// ============================================================================
// EZDRIVES — POST /api/instructor/actions — fine-grained instructor writes
// § P0: replaces the old full-state PUT /api/state. Each request mutates ONE
// instructor-owned entity (course / vehicle / video / weekly rule / exception /
// instructor profile / receive settings) atomically server-side and bumps a
// global `state_version`. Student-created appointments, payments and
// notifications are NEVER written by this endpoint — the 30s polling client
// can no longer write student cancellations/payments back.
// Every response returns { ok, version, state } where state is the full
// authoritative AppState (same shape as GET /api/state).
// ============================================================================

import { json, fail, readJson } from '../../lib/util.js'
import { authUser } from '../../lib/auth.js'
import { readFullState } from '../../lib/db.js'

function pad2(n) { return String(n).padStart(2, '0') }
function nowISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
function fromLocal(iso) {
  const [date, time = '00:00:00'] = String(iso || '').split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  if (!y || !m || !d || isNaN(hh)) return new Date(NaN)
  return new Date(y, m - 1, d, hh, mm, ss)
}
function dateKeyOf(iso) { return String(iso || '').slice(0, 10) }
function dayStartMs(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }

/**
 * § P0: fill every EMPTY English field on a course before it is published —
 * translate zh→en, or fall back to the Chinese text as a visible placeholder.
 * Empty English must never reach the database (it renders blank on the site).
 */
async function fillMissingEnglish(env, course) {
  const texts = []
  const targets = []
  const zhText = (v) => (typeof v === 'string' ? v : '')
  const push = (field) => {
    const zh = zhText(field.zh)
    const en = zhText(field.en)
    if (zh && !en.trim()) {
      texts.push(zh)
      targets.push(field)
    }
  }
  push(course.name)
  push(course.description)
  if (Array.isArray(course.lessons)) {
    for (const l of course.lessons) {
      push(l.name)
      push(l.description)
    }
  }
  if (texts.length > 0) {
    const { translateZhToEn } = await import('../../lib/translate.js')
    const enList = await translateZhToEn(env, texts)
    targets.forEach((field, i) => {
      const en = (enList[i] || '').trim()
      field.en = en || zhText(field.zh) // never empty — zh placeholder fallback
    })
  }
  return course
}

/** Read + bump the state version (returns the NEW version). */
async function bumpVersion(env) {
  const row = await env.DB.prepare("SELECT value FROM meta WHERE key = 'state_version'").first()
  const next = (row ? Number(row.value) || 0 : 0) + 1
  await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('state_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(String(next))
    .run()
  return next
}

/** Current version (without bumping). */
export async function readVersion(env) {
  const row = await env.DB.prepare("SELECT value FROM meta WHERE key = 'state_version'").first()
  return row ? Number(row.value) || 0 : 0
}

const bookingNote = (en, zh) => ({ en, zh })

/**
 * Auto-cancel every future live appointment that no longer fits the rules/
 * exceptions (server-side port of the client helper). Sends a student
 * notification per cancellation.
 */
async function autoCancelUnfitServer(env, state) {
  const nowMs = Date.now()
  const inserts = []
  const updates = []
  let seq = await nextSeq(env, 'notifications', 'n')
  for (const appt of state.appointments || []) {
    if (appt.status !== 'confirmed' && appt.status !== 'pending') continue
    const start = fromLocal(appt.start)
    if (isNaN(start.getTime()) || start.getTime() <= nowMs) continue
    const interval = effectiveInterval(appt.start, state.weeklyRules, state.exceptions)
    const course = (state.courses || []).find((c) => c.id === appt.courseId)
    const duration = course ? course.durationMin : 60
    let fits = interval !== null
    if (interval) {
      const startMin = (start.getTime() - dayStartMs(start)) / 60000
      fits = startMin >= interval.startMin && startMin + duration <= interval.endMin
    }
    if (!fits) {
      appt.status = 'cancelled'
      appt.history = appt.history || []
      appt.history.push({ at: nowISO(), note: bookingNote('Cancelled — schedule changed', '已取消 — 时间安排变更') })
      const dayClosed = (state.exceptions || []).some((e) => e.date === dateKeyOf(appt.start) && e.closed)
      const cname = course ? course.name : null
      const nId = 'n' + (++seq)
      const notif = {
        id: nId, role: 'student', recipientId: appt.studentId, type: dayClosed ? 'day_closed' : 'booking_cancelled',
        title: dayClosed ? bookingNote('Day closed — lesson cancelled', '当日休息 — 课程已取消') : bookingNote('Lesson cancelled', '课程已取消'),
        body: bookingNote(
          `Your ${cname ? cname.en : 'lesson'} on ${formatDate(start)} at ${pad2(start.getHours())}:${pad2(start.getMinutes())} was cancelled because the schedule changed.`,
          `您的${cname ? cname.zh : '课程'}（${formatDate(start)} ${pad2(start.getHours())}:${pad2(start.getMinutes())}）因时间安排变更已被取消。`,
        ),
        read: false, at: nowISO(),
      }
      updates.push(env.DB.prepare('UPDATE appointments SET payload = ? WHERE id = ?').bind(JSON.stringify(appt), appt.id))
      inserts.push(env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
        .bind(nId, 'student', appt.studentId, JSON.stringify(notif)))
      state.notifications.unshift(notif)
    }
  }
  if (updates.length > 0) await env.DB.batch([...updates, ...inserts])
}

function formatDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** Effective open interval for a local date ISO (rules + exceptions).
 *  § P0: reads the model fields exactly — weekly rules use weekday/startMin/
 *  endMin (no `enabled`/`day`), exceptions use startMin/endMin + closed. */
function effectiveInterval(dateISO, rules, exceptions) {
  const key = dateKeyOf(dateISO)
  const ex = (exceptions || []).find((e) => e.date === key)
  if (ex) {
    if (ex.closed) return null
    if (ex.startMin !== undefined && ex.endMin !== undefined) {
      return { startMin: ex.startMin, endMin: ex.endMin }
    }
    return null
  }
  const d = fromLocal(dateISO)
  if (isNaN(d.getTime())) return null
  const dow = d.getDay()
  const rule = (rules || []).find((r) => r.weekday === dow)
  if (!rule) return null
  return { startMin: rule.startMin, endMin: rule.endMin }
}

async function nextSeq(env, table, prefix) {
  const row = await env.DB.prepare(
    `SELECT id FROM ${table} ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1`,
  ).first()
  return row ? Number(row.id.slice(1)) : 0
}

export async function onRequestPost({ env, request }) {
  const user = await authUser(env, request)
  if (!user) return fail('Not authenticated', 401)
  if (user.role !== 'instructor') return fail('Only the instructor can update global state.', 403)

  const body = await readJson(request)
  const action = String(body.action || '')
  const args = body.args || {}

  const state = await readFullState(env)
  const reply = async () => {
    const version = await bumpVersion(env)
    return json({ ok: true, version, state })
  }

  const instructor = state.instructor

  // ---- courses ----
  if (action === 'saveCourse') {
    let c = args.course
    if (!c || !c.name) return fail('Invalid course.')
    // § P0: empty English must never be published — auto-translate (or fall
    // back to the Chinese text as a visible placeholder) before saving.
    try {
      c = await fillMissingEnglish(env, c)
    } catch (e) {
      // keep saving the instructor's content even if translation fails
    }
    if (!c.id) {
      // server-side id allocation (avoids client collisions)
      const row = await env.DB.prepare('SELECT id FROM courses ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1').first()
      const max = row ? Number(row.id.slice(1)) : 0
      c = { ...c, id: 'c' + (max + 1) }
    }
    await env.DB.prepare('INSERT OR REPLACE INTO courses (id, active, payload) VALUES (?, ?, ?)')
      .bind(c.id, c.active ? 1 : 0, JSON.stringify(c))
      .run()
    state.courses = (state.courses || []).filter((x) => x.id !== c.id).concat(c)
    return reply()
  }
  if (action === 'deleteCourse') {
    const id = String(args.id || '')
    const referenced = (state.appointments || []).some((a) => a.courseId === id)
    const existing = (state.courses || []).find((c) => c.id === id)
    if (!existing) return reply()
    if (referenced) {
      await env.DB.prepare('UPDATE courses SET payload = ? WHERE id = ?')
        .bind(JSON.stringify({ ...existing, active: false }), id)
        .run()
    } else {
      await env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(id).run()
    }
    return reply()
  }
  if (action === 'toggleCourse') {
    const id = String(args.id || '')
    const existing = (state.courses || []).find((c) => c.id === id)
    if (!existing) return fail('Course not found.')
    await env.DB.prepare('UPDATE courses SET active = ?, payload = ? WHERE id = ?')
      .bind(existing.active ? 0 : 1, JSON.stringify({ ...existing, active: !existing.active }), id)
      .run()
    return reply()
  }

  // ---- vehicles ----
  if (action === 'saveVehicle') {
    const v = args.vehicle
    if (!v || !v.id) return fail('Invalid vehicle.')
    await env.DB.prepare('INSERT OR REPLACE INTO vehicles (id, active, payload) VALUES (?, ?, ?)')
      .bind(v.id, v.active ? 1 : 0, JSON.stringify(v))
      .run()
    return reply()
  }
  if (action === 'deleteVehicle') {
    await env.DB.prepare('DELETE FROM vehicles WHERE id = ?').bind(String(args.id || '')).run()
    return reply()
  }

  // ---- teaching videos ----
  if (action === 'saveVideo') {
    const v = args.video
    if (!v || !v.id) return fail('Invalid video.')
    await env.DB.prepare('INSERT OR REPLACE INTO videos (id, order_no, active, payload) VALUES (?, ?, ?, ?)')
      .bind(v.id, v.order || 0, v.active ? 1 : 0, JSON.stringify(v))
      .run()
    return reply()
  }
  if (action === 'deleteVideo') {
    await env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(String(args.id || '')).run()
    return reply()
  }

  // ---- weekly rules + break ----
  if (action === 'saveWeeklyRules') {
    const rules = Array.isArray(args.rules) ? args.rules : []
    const stmts = [env.DB.prepare('DELETE FROM weekly_rules')]
    for (const r of rules) stmts.push(env.DB.prepare('INSERT INTO weekly_rules (payload) VALUES (?)').bind(JSON.stringify(r)))
    await env.DB.batch(stmts)
    state.weeklyRules = rules
    await autoCancelUnfitServer(env, state)
    return reply()
  }
  if (action === 'saveException') {
    const e = args.exception
    if (!e || !e.date) return fail('Invalid exception.')
    await env.DB.prepare('INSERT OR REPLACE INTO day_exceptions (date, payload) VALUES (?, ?)')
      .bind(e.date, JSON.stringify(e))
      .run()
    state.exceptions = (state.exceptions || []).filter((x) => x.date !== e.date).concat(e).sort((a, b) => a.date.localeCompare(b.date))
    await autoCancelUnfitServer(env, state)
    return reply()
  }
  if (action === 'removeException') {
    const date = String(args.date || '')
    await env.DB.prepare('DELETE FROM day_exceptions WHERE date = ?').bind(date).run()
    state.exceptions = (state.exceptions || []).filter((x) => x.date !== date)
    await autoCancelUnfitServer(env, state)
    return reply()
  }

  // ---- instructor profile + settings (one atomic payload merge) ----
  if (action === 'updateInstructorProfile') {
    const patch = args.profile || {}
    const next = { ...instructor, ...patch }
    await env.DB.prepare('INSERT OR REPLACE INTO instructor (id, payload) VALUES (1, ?)').bind(JSON.stringify(next)).run()
    state.instructor = next
    return reply()
  }
  if (action === 'updateReceiveSettings') {
    const settings = args.settings || {}
    const next = { ...instructor }
    if (settings.paymentMethods !== undefined) next.paymentMethods = Array.isArray(settings.paymentMethods) ? settings.paymentMethods : next.paymentMethods
    if (settings.wechatQr !== undefined) next.wechatQr = settings.wechatQr || undefined
    if (settings.wechatId !== undefined) next.wechatId = settings.wechatId || undefined
    if (settings.emtEmail !== undefined) next.emtEmail = settings.emtEmail || undefined
    if (settings.bank !== undefined) next.bank = settings.bank || undefined
    if (settings.payConfig !== undefined) next.payConfig = settings.payConfig || undefined
    if (settings.breakMin !== undefined) next.breakMin = Math.max(0, Math.min(60, Math.round(Number(settings.breakMin) || 0)))
    await env.DB.prepare('INSERT OR REPLACE INTO instructor (id, payload) VALUES (1, ?)').bind(JSON.stringify(next)).run()
    state.instructor = next
    return reply()
  }

  return fail(`Unknown instructor action: ${action}`)
}
