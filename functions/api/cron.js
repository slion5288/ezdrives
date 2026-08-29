// ============================================================================
// EZDRIVES — Scheduled reminders (Cloudflare Pages Cron, America/Toronto)
// Runs from a [[triggers]] cron entry in wrangler.toml — reminders no longer
// depend on somebody keeping a browser tab open and polling.
//
// Two jobs, both idempotent:
//  1. LESSON REMINDER (every 30 min): any confirmed/pending lesson starting
//     within the next 2 hours gets ONE student notification (reminder_2h) and
//     is marked `reminded`.
//  2. DAILY SCHEDULE (07:00 Toronto): the instructor receives today's lesson
//     list as an in-app notification AND an email (DAILY_SCHEDULE template).
//
// The handler is exported as onRequestSchedule (Pages cron convention); the
// same logic is exposed via POST /api/cron?job=… guarded by CRON_SECRET for
// manual/local triggering.
// ============================================================================

import { json, fail, readJson } from '../lib/util.js'
import { readFullState } from '../lib/db.js'
import { sendNotification } from '../lib/notification.js'

function pad2(n) { return String(n).padStart(2, '0') }
function toLocalISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
function fromLocal(iso) {
  const [date, time = '00:00:00'] = String(iso || '').split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, ss)
}
function dateKeyOf(iso) { return String(iso || '').slice(0, 10) }

/** Current wall-clock time in America/Toronto as { y, m, d, hh, mm, ts } where
 *  ts is a local-time Date usable for comparisons with fromLocal(). */
function torontoNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const get = (t) => Number(parts.find((p) => p.type === t).value)
  let hh = get('hour')
  if (hh === 24) hh = 0
  return {
    y: get('year'), m: get('month'), d: get('day'), hh, mm: get('minute'),
    ts: new Date(get('year'), get('month') - 1, get('day'), hh, get('minute'), get('second')),
  }
}

async function nextNotifSeq(env) {
  const row = await env.DB.prepare("SELECT id FROM notifications ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1").first()
  return row ? Number(row.id.slice(1)) : 0
}

/** Job 1: 2h-before-lesson reminders (bilingual, idempotent via `reminded`). */
async function runLessonReminders(env) {
  const state = await readFullState(env)
  const now = torontoNow()
  const windowMs = 2 * 60 * 60 * 1000
  const due = (state.appointments || []).filter((a) => {
    if (a.status !== 'confirmed' && a.status !== 'pending') return false
    if (a.reminded) return false
    const start = fromLocal(a.start)
    if (isNaN(start.getTime())) return false
    if (start.getTime() <= now.ts.getTime()) return false
    return start.getTime() - now.ts.getTime() <= windowMs
  })
  if (due.length === 0) return { reminded: 0 }

  const nowIso = toLocalISO(new Date())
  const updates = []
  const inserts = []
  let seq = await nextNotifSeq(env)
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
      body: { en: bodyEn, zh: bodyZh }, read: false, at: nowIso,
    }
    const updated = { ...a, reminded: true }
    updates.push(env.DB.prepare('UPDATE appointments SET payload = ? WHERE id = ?').bind(JSON.stringify(updated), a.id))
    inserts.push(env.DB.prepare('INSERT INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
      .bind(nId, 'student', a.studentId, JSON.stringify(notif)))
  }
  await env.DB.batch([...updates, ...inserts])
  return { reminded: due.length }
}

/** Job 2: 07:00 daily schedule — in-app notification + email to the instructor. */
async function runDailySchedule(env) {
  const now = torontoNow()
  const dateKey = `${now.y}-${pad2(now.m)}-${pad2(now.d)}`
  const state = await readFullState(env)
  const todayAppts = (state.appointments || [])
    .filter((a) => (a.status === 'confirmed' || a.status === 'pending') && dateKeyOf(a.start) === dateKey)
    .sort((a, b) => a.start.localeCompare(b.start))
  if (todayAppts.length === 0) return { sent: 0 }

  const linesEn = []
  const linesZh = []
  for (const a of todayAppts) {
    const d = fromLocal(a.start)
    const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    const course = (state.courses || []).find((c) => c.id === a.courseId)
    const student = (state.students || []).find((s) => s.id === a.studentId)
    const courseEn = course ? course.name.en : a.courseId
    const courseZh = course ? course.name.zh : a.courseId
    const name = student ? student.name : a.studentId
    linesEn.push(`${hhmm} — ${courseEn} (${name})`)
    linesZh.push(`${hhmm} — ${courseZh}（${name}）`)
  }
  const summaryEn = linesEn.join('\n')
  const summaryZh = linesZh.join('\n')

  // In-app instructor notification (idempotent per day via type+body marker).
  const marker = `daily-${dateKey}`
  const dup = await env.DB
    .prepare("SELECT id FROM notifications WHERE role = 'instructor' AND payload LIKE ?")
    .bind(`%"id":"${marker}"%`)
    .first()
  if (!dup) {
    const seq = await nextNotifSeq(env)
    const nId = 'n' + (seq + 1)
    const notif = {
      id: marker, role: 'instructor', recipientId: 'instructor', type: 'daily_schedule',
      title: { en: `Today's schedule (${dateKey})`, zh: `今日课表（${dateKey}）` },
      body: { en: summaryEn, zh: summaryZh }, read: false, at: toLocalISO(new Date()),
    }
    await env.DB.prepare('INSERT OR IGNORE INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)')
      .bind(marker, 'instructor', 'instructor', JSON.stringify(notif))
      .run()
  }

  // Email the instructor (idempotent via booking id = daily-<date>).
  const instructor = state.instructor
  if (instructor && instructor.email) {
    const res = await sendNotification(env, {
      type: 'DAILY_SCHEDULE',
      recipientEmail: instructor.email,
      student: null,
      instructor,
      booking: { id: `daily-${dateKey}`, date: dateKey },
      course: null,
      lesson: null,
      scheduleSummary: `${summaryEn}\n\n${summaryZh}`,
    })
    return { sent: res.ok ? 1 : 0, emailStatus: res.status }
  }
  return { sent: 0 }
}

/** Run the due jobs; returns a summary. */
export async function runCron(env) {
  const now = torontoNow()
  const out = { reminders: null, daily: null, tz: `America/Toronto ${now.y}-${now.m}-${now.d} ${now.hh}:${now.mm}` }
  out.reminders = await runLessonReminders(env)
  if (now.hh === 7) {
    out.daily = await runDailySchedule(env)
  } else {
    out.daily = { skipped: true }
  }
  return out
}

/** Cloudflare Pages Cron trigger (canonical handler at functions/cron.js). */
export async function onRequestSchedule({ env }) {
  try {
    const result = await runCron(env)
    return json({ ok: true, result })
  } catch (e) {
    return json({ ok: false, error: (e && e.message) ? e.message : String(e) }, 500)
  }
}

/** Manual / local trigger: POST /api/cron with ?job=reminders|daily|all and
 *  Authorization: Bearer <CRON_SECRET>. Never exposed without the secret. */
export async function onRequestPost({ env, request }) {
  const secret = env.CRON_SECRET
  if (!secret) return fail('Cron trigger is not configured.', 503)
  const header = request.headers.get('Authorization') || ''
  if (header !== `Bearer ${secret}`) return fail('Unauthorized', 401)

  const body = await readJson(request)
  const job = String(body.job || 'all')
  try {
    if (job === 'reminders') return json({ ok: true, result: { reminders: await runLessonReminders(env) } })
    if (job === 'daily') return json({ ok: true, result: { daily: await runDailySchedule(env) } })
    const result = await runCron(env)
    return json({ ok: true, result })
  } catch (e) {
    return json({ ok: false, error: (e && e.message) ? e.message : String(e) }, 500)
  }
}
