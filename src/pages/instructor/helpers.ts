// ============================================================================
// EZDRIVES — Instructor-local helpers (instructor-owned)
// Pure helpers shared by the instructor dashboard pages: tab ids, week
// navigation, lookups and time math. All Date values are local time.
// ============================================================================

import type { AppState, Appointment, Course, Student } from '../../data/store'
import { addDays, dateKey, fromLocalISO, startOfDay } from '../../data/timeEngine'

export type InstructorTab = 'overview' | 'schedule' | 'courses' | 'students' | 'payments' | 'notifications' | 'settings'

/** Tab id → i18n key of the tab label (tabs share the page-title keys). */
export const TAB_KEYS: Record<InstructorTab, string> = {
  overview: 'instructor.overview.title',
  schedule: 'instructor.schedule.title',
  courses: 'instructor.courses.title',
  settings: 'instructor.settings.title',
  notifications: 'instructor.notifications.title',
  students: 'instructor.students.title',
  payments: 'instructor.payments.title',
}

/** Monday-based start of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const day = startOfDay(d)
  const dow = day.getDay()
  return addDays(day, dow === 0 ? -6 : 1 - dow)
}

/** 'YYYY-MM-DD' keys for the 7 consecutive days starting at weekStart. */
export function weekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => dateKey(addDays(weekStart, i)))
}

export function studentById(state: AppState, id: string): Student | undefined {
  return state.students.find((s) => s.id === id)
}

export function courseById(state: AppState, id: string): Course | undefined {
  return state.courses.find((c) => c.id === id)
}

/** '$1,240' — CAD formatting for stats and lists. */
export function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US')}`
}

/** '09:30' from minutes-from-midnight. */
export function fmtMin(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Parse 'HH:mm' → minutes-from-midnight. */
export function minOf(hhmm: string): number {
  const [h, m] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

/** Step boundaries in [startMin, endMin) at the given granularity (default 30 min). */
export function minuteOptions(startMin: number, endMin: number, step = 30): number[] {
  const out: number[] = []
  for (let m = startMin; m < endMin; m += step) out.push(m)
  return out
}

/** Ids of confirmed/pending appointments overlapping [startISO, endISO), excluding exceptIds. */
export function overlappingIds(state: AppState, startISO: string, endISO: string, exceptIds: string[]): string[] {
  const s = fromLocalISO(startISO).getTime()
  const e = fromLocalISO(endISO).getTime()
  const except = new Set(exceptIds)
  return state.appointments
    .filter((a) => a.status === 'confirmed' || a.status === 'pending')
    .filter((a) => !except.has(a.id))
    .filter((a) => {
      const aStart = fromLocalISO(a.start).getTime()
      const aEnd = fromLocalISO(a.end).getTime()
      return s < aEnd && e > aStart
    })
    .map((a) => a.id)
}

/** Whether `appt` is a live (confirmed/pending) appointment. */
export function isLiveAppointment(a: Appointment): boolean {
  return a.status === 'confirmed' || a.status === 'pending'
}

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * Status badge label. Uses dedicated appointment-status keys (a cancelled
 * lesson must never render as "Deleted").
 */
export function statusLabel(status: Appointment['status'], t: TranslateFn): string {
  switch (status) {
    case 'confirmed':
      return t('stats.legend.confirmed')
    case 'pending':
      return t('student.booking.pending')
    case 'cancelled':
      return t('student.booking.cancelled')
  }
}
