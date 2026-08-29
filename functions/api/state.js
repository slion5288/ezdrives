// GET /api/state — the authenticated user's view of the app state.
// Instructor: full state. Student: public courses/vehicles/videos + their own
// bookings/payments/notifications + anonymized appointments (for conflicts).
//
// § P0: the instructor full-state PUT is ABOLISHED — instructor writes go
// through POST /api/instructor/actions (fine-grained, versioned). The response
// carries `version` so clients can detect staleness.
import { json, fail } from '../lib/util.js'
import { authUser } from '../lib/auth.js'
import { readFullState, studentView } from '../lib/db.js'
import { readVersion } from './instructor/actions.js'

function pad2(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
function fromLocal(iso) {
  const [date, time = '00:00:00'] = iso.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, ss)
}
function dateKeyOf(iso) { return iso.slice(0, 10) }

/**
 * Lazy 2h-before-lesson reminders. On every state read the server looks for
 * confirmed/pending appointments that are (a) in the future, (b) within 2h of
 * the client's local "now", and (c) not yet reminded — and creates ONE student
 * reminder notification, marking the appointment reminded. Idempotent via the
 * `reminded` flag; each lesson reminds exactly once.
 */
async function ensureReminders(env, state, tzOffsetMin) {
  const nowMs = Date.now() + (Number(tzOffsetMin) || 0) * 60000
  const windowMs = 2 * 60 * 60 * 1000
  const due = []
  for (const a of state.appointments || []) {
    if (a.status !== 'confirmed' && a.status !== 'pending') continue
    if (a.reminded) continue
    const start = fromLocal(a.start).getTime()
    if (start <= nowMs) continue
    if (start - nowMs > windowMs) continue
    due.push(a)
  }
  if (due.length === 0) return
  const now = toLocalISO(new Date())
  const updates = []
  const inserts = []
  const maxRow = await env.DB.prepare("SELECT id FROM notifications ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1").first()
  let seq = maxRow ? Number(maxRow.id.slice(1)) : 0
  for (const a of due) {
    seq += 1
    const nId = 'n' + seq
    const course = (state.courses || []).find((c) => c.id === a.courseId)
    const d = fromLocal(a.start)
    const when = `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    const bodyEn = `Your ${course ? course.name.en : ''} lesson starts at ${when} — see you there!`
    const bodyZh = `您的${course ? course.name.zh : ''}课程将于 ${when} 开始，到时见！`
    const notif = {
      id: nId, role: 'student', recipientId: a.studentId, type: 'reminder_2h',
      title: { en: 'Lesson starting soon', zh: '课程即将开始' },
      body: { en: bodyEn, zh: bodyZh }, read: false, at: now,
    }
    const updated = { ...a, reminded: true }
    updates.push(env.DB.prepare('UPDATE appointments SET payload = ? WHERE id = ?').bind(JSON.stringify(updated), a.id))
    inserts.push(env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
      .bind(nId, 'student', a.studentId, JSON.stringify(notif)))
    // reflect in the returned state
    a.reminded = true
    state.notifications.unshift(notif)
  }
  await env.DB.batch([...updates, ...inserts])
}

export async function onRequestGet({ env, request }) {
  const user = await authUser(env, request)
  if (!user) return fail('Not authenticated', 401)

  try {
    const url = new URL(request.url)
    const tz = url.searchParams.get('tz') || '0'
    const state = await readFullState(env)
    await ensureReminders(env, state, tz)
    const version = await readVersion(env)
    if (user.role === 'instructor') return json({ ok: true, version, state })
    // student: find their student row id
    const studentRow = await env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(user.id).first()
    return json({ ok: true, version, state: studentView(state, studentRow ? studentRow.id : '') })
  } catch (e) {
    return fail(e.message || 'State unavailable', 500)
  }
}

/** § P0: the full-state PUT is abolished — use POST /api/instructor/actions. */
export async function onRequestPut() {
  return fail('The full-state PUT was replaced by fine-grained instructor actions. Use POST /api/instructor/actions.', 410)
}
