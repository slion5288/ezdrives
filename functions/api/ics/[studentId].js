// GET /api/ics/[studentId] — public ICS feed of a student's upcoming lessons.
// Subscribe from the phone calendar app (iOS/Android) to auto-sync.
// NOTE: this is an unauthenticated demo feed keyed by student id.
import { json } from '../../lib/util.js'

function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
function icsDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
}

export async function onRequestGet({ env, params }) {
  const studentId = String(params.studentId || '')
  if (!/^s\d+$/.test(studentId)) return json({ ok: false, error: 'invalid student' }, 400)

  const student = await env.DB.prepare('SELECT payload FROM students WHERE id = ?').bind(studentId).first()
  if (!student) return json({ ok: false, error: 'not found' }, 404)
  const s = JSON.parse(student.payload)

  const appts = await env.DB.prepare(
    "SELECT payload FROM appointments WHERE student_id = ? AND status IN ('confirmed','pending') ORDER BY start_iso",
  ).bind(studentId).all()

  const now = new Date()
  const events = (appts.results || [])
    .map((r) => JSON.parse(r.payload))
    .filter((a) => new Date(a.start.replace(' ', 'T')).getTime() > now.getTime())

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
    lines.push('DTSTAMP:' + icsDate(now))
    lines.push('DTSTART:' + icsDate(start))
    lines.push('DTEND:' + icsDate(end))
    lines.push('SUMMARY:' + icsEscape(`Driving lesson (${a.courseId})`))
    lines.push('DESCRIPTION:' + icsEscape('EZDRIVES driving lesson'))
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')

  const crlf = String.fromCharCode(13, 10)
  return new Response(lines.join(crlf), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
