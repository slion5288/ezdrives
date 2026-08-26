// ============================================================================
// EZDRIVES — Time engine (code contract)
// Source of truth: docs/ARCHITECTURE.md §5. Pure functions, no side effects,
// no state. Granularity is 30 minutes; a working interval [startMin, endMin)
// (minutes from midnight) is expanded into 30-min units. The effective interval
// for a date: closed exception → none; override exception (closed: false) →
// [startMin, endMin); otherwise the matching WeeklyRule (no rule → none).
// These are the ONLY datetime utilities in the app.
// ============================================================================

import type { AppState, Appointment, DayException, WeeklyRule } from './types'

export interface Slot {
  start: Date // 30-min unit start, aligned to :00 / :30
  end: Date // start + 30 min
  available: boolean
  takenById?: string // set when closedReason === 'booked' — the student who holds it
  closedReason?: 'closed' | 'override' | 'past' | 'booked' // present iff available === false
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 'YYYY-MM-DDTHH:mm:ss' local, no Z */
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** Parse a local ISO datetime (or a plain date) into a local Date. */
export function fromLocalISO(s: string): Date {
  const dt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(s)
  if (dt) return new Date(+dt[1], +dt[2] - 1, +dt[3], +dt[4], +dt[5], +dt[6])
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (d) return new Date(+d[1], +d[2] - 1, +d[3])
  return new Date(NaN)
}

/**
 * Parse a SERVER-written UTC wall-clock string ('YYYY-MM-DDTHH:mm:ss', no Z —
 * Workers run on UTC) into a LOCAL Date. The server stamps notifications /
 * payment records with its own clock; without this conversion they would
 * display 4–5h off for Toronto users.
 */
export function fromServerISO(s: string): Date {
  const dt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(s)
  if (!dt) return fromLocalISO(s)
  return new Date(Date.UTC(+dt[1], +dt[2] - 1, +dt[3], +dt[4], +dt[5], +dt[6]))
}

/** 'YYYY-MM-DD' local */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Parse a 'YYYY-MM-DD' key into a local midnight Date. */
export function parseDateKey(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(NaN)
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60000)
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** '09:00' (24h) */
export function formatHM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 'Mar 10' */
export function formatDateEn(d: Date): string {
  return `${MONTHS_EN[d.getMonth()]} ${d.getDate()}`
}

/** '3月10日' */
export function formatDateZh(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * The effective working interval [startMin, endMin) for a date, or null when
 * the day is closed / has no working hours. Override replaces weekly rules.
 */
export function getEffectiveInterval(
  date: Date,
  weeklyRules: WeeklyRule[],
  exceptions: DayException[],
): { startMin: number; endMin: number } | null {
  const key = dateKey(date)
  const exception = exceptions.find((e) => e.date === key)
  if (exception) {
    if (exception.closed) return null
    if (exception.startMin !== undefined && exception.endMin !== undefined) {
      return { startMin: exception.startMin, endMin: exception.endMin }
    }
    return null
  }
  const rule = weeklyRules.find((r) => r.weekday === date.getDay())
  return rule ? { startMin: rule.startMin, endMin: rule.endMin } : null
}

/**
 * true iff a confirmed/pending appointment (other than exceptAppointmentId)
 * overlaps [startISO, endISO). Overlap-only check — closed/past validation
 * lives in the store.
 */
export function isConflict(startISO: string, endISO: string, state: AppState, exceptAppointmentId?: string): boolean {
  const start = fromLocalISO(startISO).getTime()
  const end = fromLocalISO(endISO).getTime()
  return state.appointments.some((a) => {
    if (a.id === exceptAppointmentId) return false
    if (a.status !== 'confirmed' && a.status !== 'pending') return false
    const aStart = fromLocalISO(a.start).getTime()
    const aEnd = fromLocalISO(a.end).getTime()
    return start < aEnd && end > aStart
  })
}

/** The confirmed/pending appointment covering the given unit start, if any. */
function coveringAppointment(state: AppState, unitStart: Date): Appointment | undefined {
  const t = unitStart.getTime()
  return state.appointments.find((a) => {
    if (a.status !== 'confirmed' && a.status !== 'pending') return false
    const aStart = fromLocalISO(a.start).getTime()
    const aEnd = fromLocalISO(a.end).getTime()
    return aStart <= t && t < aEnd
  })
}

type SlotState = Pick<Slot, 'available' | 'closedReason' | 'takenById'>

function classifyUnit(state: AppState, date: Date, minuteOfDay: number, now: Date): SlotState {
  const start = addMinutes(startOfDay(date), minuteOfDay)
  if (start.getTime() < now.getTime()) return { available: false, closedReason: 'past' }
  const covering = coveringAppointment(state, start)
  if (covering) return { available: false, closedReason: 'booked', takenById: covering.studentId }
  return { available: true }
}

function buildUnits(date: Date, winStart: number, winEnd: number, classify: (minuteOfDay: number) => SlotState): Slot[] {
  const dayStart = startOfDay(date)
  const slots: Slot[] = []
  for (let m = winStart; m < winEnd; m += 30) {
    const start = addMinutes(dayStart, m)
    const rest = classify(m)
    slots.push({ start, end: addMinutes(start, 30), ...rest })
  }
  return slots
}

/**
 * All 30-min units of the date's working window, in chronological order.
 * - closed exception day → base window rendered as 'closed' units (hatchable)
 * - override day → units outside the override interval are 'override'
 * - plain rule day → units are available unless past ('past') or covered by a
 *   confirmed/pending appointment ('booked', with takenById)
 * - days with no working hours at all → []
 * - dates before today → []
 */
export function generateSlots(date: Date, state: AppState): Slot[] {
  const now = new Date()
  if (startOfDay(date).getTime() < startOfDay(now).getTime()) return []

  const key = dateKey(date)
  const exception = state.exceptions.find((e) => e.date === key)
  const rule = state.weeklyRules.find((r) => r.weekday === date.getDay())

  if (exception?.closed) {
    const winStart = rule ? rule.startMin : 540
    const winEnd = rule ? rule.endMin : 1080
    return buildUnits(date, winStart, winEnd, () => ({ available: false, closedReason: 'closed' }))
  }

  const interval = getEffectiveInterval(date, state.weeklyRules, state.exceptions)
  if (!interval) return []

  const override =
    exception && exception.startMin !== undefined && exception.endMin !== undefined
      ? { startMin: exception.startMin, endMin: exception.endMin }
      : null
  // Default fallback window (used only when no weekly rule exists for the day).
  const ruleBase = rule ? { startMin: rule.startMin, endMin: rule.endMin } : { startMin: 540, endMin: 1080 }
  // On an override day the display window covers rule ∪ override so units
  // outside the override can be rendered as 'override'. On a normal rule day
  // the window is exactly the rule interval — anything outside it is NOT
  // bookable and must not be exposed as available.
  const winStart = override ? Math.min(ruleBase.startMin, override.startMin) : ruleBase.startMin
  const winEnd = override ? Math.max(ruleBase.endMin, override.endMin) : ruleBase.endMin

  return buildUnits(date, winStart, winEnd, (m) => {
    if (override && (m < override.startMin || m >= override.endMin)) {
      return { available: false, closedReason: 'override' }
    }
    return classifyUnit(state, date, m, now)
  })
}

/** Keys are the 7 consecutive 'YYYY-MM-DD' dates starting at weekStart. */
export function getWeekSlots(weekStart: Date, state: AppState): Record<string, Slot[]> {
  const out: Record<string, Slot[]> = {}
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i)
    out[dateKey(d)] = generateSlots(d, state)
  }
  return out
}

/**
 * Valid lesson START times for a booking of `durationMin` on `date`.
 * Lessons use whole-hour units (1-hour granularity). After a booked lesson the
 * next start must respect the instructor's break (instructor.breakMin) UNLESS
 * the SAME student books back-to-back (consecutive lessons need no break) —
 * which can push later start times off the hour (e.g. 14:10). Passing
 * `studentId` enables the same-student exemption; omitting it (instructor /
 * generic view) always applies the break.
 */
export function getLessonStarts(
  date: Date,
  state: AppState,
  durationMin: number,
  studentId?: string,
  exceptAppointmentId?: string,
): Date[] {
  const interval = getEffectiveInterval(date, state.weeklyRules, state.exceptions)
  if (!interval) return []
  const dayStart = startOfDay(date)
  if (dayStart.getTime() < startOfDay(new Date()).getTime()) return []

  const breakMin = Math.max(0, state.instructor.breakMin ?? 0)
  const lessons = state.appointments
    .filter(
      (a) =>
        a.id !== exceptAppointmentId &&
        (a.status === 'confirmed' || a.status === 'pending') &&
        dateKey(fromLocalISO(a.start)) === dateKey(date),
    )
    .map((a) => ({ start: fromLocalISO(a.start), end: fromLocalISO(a.end), sid: a.studentId }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const minuteOfDay = (d: Date): number => d.getHours() * 60 + d.getMinutes()
  const D = durationMin
  const starts: number[] = []
  let cursor = interval.startMin
  for (const L of lessons) {
    const gapEnd = minuteOfDay(L.start) // new lesson must end before this one begins
    for (let m = cursor; m + D <= gapEnd; m += D) starts.push(m)
    cursor = minuteOfDay(L.end) + (L.sid === studentId ? 0 : breakMin)
  }
  for (let m = cursor; m + D <= interval.endMin; m += D) starts.push(m)

  const now = new Date()
  const isToday = dayStart.getTime() === startOfDay(now).getTime()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return starts.filter((m) => !isToday || m >= nowMin).map((m) => addMinutes(dayStart, m))
}
