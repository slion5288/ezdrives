// GET /api/ics/[studentId]?t=<icsToken>&tz=<offsetMin>
// Private ICS feed of a student's upcoming lessons for phone-calendar
// subscription. Auth: the per-student subscription token (generated at
// registration / lazily backfilled); the sequential student id alone is not
// enough. `tz` is the client's UTC offset in minutes (e.g. -240 for Toronto)
// so "upcoming" is evaluated against the client's local clock.
import { json } from '../../lib/util.js'

function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
function icsDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
}
/** Fold lines longer than 75 octets per RFC 5545 (CRLF + space). */
function fold(line) {
  const crlf = String.fromCharCode(13, 10)
  if (line.length <= 75) return line
  const out = []
  for (let i = 0; i < line.length; i += 73) {
    out.push((i === 0 ? '' : ' ') + line.slice(i, i + 73))
  }
  return out.join(crlf)
}

export async function onRequestGet({ env, request, params }) {
  const studentId = String(params.studentId || '')
  if (!/^s\d+$/.test(studentId)) return json({ ok: false, error: 'invalid student' }, 400)

  const url = new URL(request.url)
  const token = url.searchParams.get('t') || ''
  const tzOffsetMin = Number(url.searchParams.get('tz') || '0') || 0

  const student = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(studentId).first()
  if (!student) return json({ ok: false, error: 'not found' }, 404)
  const s = JSON.parse(student.payload)
  // Token check: a missing stored token triggers a backfill on the next state
  // read; until then the feed stays locked.
  if (!s.icsToken || token !== s.icsToken) return json({ ok: false, error: 'forbidden' }, 403)

  const appts = await env.DB.prepare(
    "SELECT payload FROM appointments WHERE student_id = ? AND status IN ('confirmed','pending') ORDER BY start_iso",
  ).bind(studentId).all()

  // Client-local "now" expressed in the same wall-clock space as the stored
  // local start times (which parse as UTC on the worker).
  const nowMs = Date.now() + tzOffsetMin * 60000
  const events = (appts.results || [])
    .map((r) => JSON.parse(r.payload))
    .filter((a) => new Date(a.start.replace(' ', 'T')).getTime() > nowMs)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EZDRIVES//EZDRIVES//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsEscape(`EZDRIVES · ${s.name}`),
  ]
  for (const a of events) {
    const start = new Date(a.start.replace(' ', 'T'))
    const end = new Date(a.end.replace(' ', 'T'))
    lines.push('BEGIN:VEVENT')
    lines.push('UID:' + a.id + '@ezdrives')
    lines.push('DTSTAMP:' + icsDate(new Date()))
    lines.push('DTSTART:' + icsDate(start))
    lines.push('DTEND:' + icsDate(end))
    lines.push('SUMMARY:' + icsEscape(`Driving lesson (${a.courseId})`))
    lines.push('DESCRIPTION:' + icsEscape('EZDRIVES driving lesson'))
    lines.push('LOCATION:' + icsEscape('Greater Toronto Area'))
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')

  const crlf = String.fromCharCode(13, 10)
  return new Response(lines.map(fold).join(crlf), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
