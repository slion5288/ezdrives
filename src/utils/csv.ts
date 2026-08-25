// ============================================================================
// EZDRIVES — CSV export (instructor-owned)
// Source of truth: docs/ARCHITECTURE.md §2 (src/utils/csv.ts → instructor).
// Exports appointment records as UTF-8 CSV (BOM-prefixed for Excel) and
// triggers a Blob download. Column headers follow the code contract:
// date, start, end, student, phone, course, price, status.
// ============================================================================

export interface AppointmentCSVRow {
  date: string // 'YYYY-MM-DD'
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  student: string
  phone: string
  course: string
  price: number
  status: string
}

const HEADERS = ['date', 'start', 'end', 'student', 'phone', 'course', 'price', 'status'] as const

/** Quote a cell when it contains a comma, quote or newline. */
function escapeCell(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Serialize rows into a CSV string with a UTF-8 BOM (Excel-friendly). */
export function appointmentsToCSV(rows: AppointmentCSVRow[]): string {
  const lines = [HEADERS.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push([row.date, row.start, row.end, row.student, row.phone, row.course, row.price, row.status].map(escapeCell).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}`
}

/** Trigger a client-side Blob download. */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
