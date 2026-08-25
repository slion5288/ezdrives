// ============================================================================
// EZDRIVES — ICS calendar-file generation (student-owned)
// Source of truth: docs/ARCHITECTURE.md (src/utils/ics.ts row). Pure functions,
// no i18n imports — callers build localized SUMMARY/DESCRIPTION/LOCATION text
// and pass plain IcsEvent objects. Times are LOCAL floating times (no Z suffix)
// per the app-wide local-datetime contract — no timezone libraries.
// ============================================================================

export interface IcsEvent {
  uid: string
  summary: string
  description: string
  location: string
  start: Date
  end: Date
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 'YYYYMMDDTHHMMSS' — local floating time, no timezone suffix. */
function icsStamp(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
}

/** Escape text values per RFC 5545 (backslash, semicolon, comma, newline). */
function escapeText(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Fold lines longer than 75 octets with CRLF + single space (RFC 5545). */
function foldLines(input: string): string {
  return input
    .split('\r\n')
    .map((line) => {
      if (line.length <= 75) return line
      const chunks: string[] = []
      let rest = line
      while (rest.length > 75) {
        chunks.push(rest.slice(0, 75))
        rest = rest.slice(75)
      }
      chunks.push(rest)
      return chunks.join('\r\n ')
    })
    .join('\r\n')
}

const CRLF = '\r\n'

/** Build a complete VCALENDAR document from the given events. */
export function buildICS(events: IcsEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EZDRIVES//EZDRIVES//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(event.start)}`,
      `DTEND:${icsStamp(event.end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      `LOCATION:${escapeText(event.location)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return foldLines(lines.join(CRLF)) + CRLF
}

/** Build and trigger a browser download of the .ics file. */
export function downloadICS(events: IcsEvent[], filename: string): void {
  const ics = buildICS(events)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
