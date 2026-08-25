// ============================================================================
// EZDRIVES — Statistics (code contract)
// Source of truth: docs/ARCHITECTURE.md §6. Pure functions over AppState.
// "This month" = the current calendar month in local time. Only CONFIRMED
// appointments count (cancelled/pending excluded). Charts render from these.
// ============================================================================

import type { AppState } from './types'
import { addDays, dateKey, fromLocalISO, startOfDay } from './timeEngine'

export interface MonthStats {
  lessons: number
  revenue: number
  newStudents: number
}

export function monthStats(state: AppState): MonthStats {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const inMonth = (iso: string): boolean => {
    const d = fromLocalISO(iso)
    return d.getFullYear() === year && d.getMonth() === month
  }

  const confirmedThisMonth = state.appointments.filter((a) => a.status === 'confirmed' && inMonth(a.start))
  const revenue = confirmedThisMonth.reduce((sum, a) => {
    const course = state.courses.find((c) => c.id === a.courseId)
    // Packages price per lesson — use the price captured at booking time.
    return sum + (a.price ?? (course ? course.price : 0))
  }, 0)
  const newStudents = state.students.filter((s) => inMonth(s.registeredAt)).length

  return { lessons: confirmedThisMonth.length, revenue, newStudents }
}

/** Confirmed appointments grouped by courseId, count desc; zero-count courses omitted. */
export function courseDistribution(state: AppState): { courseId: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const a of state.appointments) {
    if (a.status !== 'confirmed') continue
    counts.set(a.courseId, (counts.get(a.courseId) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([courseId, count]) => ({ courseId, count }))
    .sort((x, y) => y.count - x.count)
}

/** One zero-filled entry per 'YYYY-MM-DD' for the last `days` days ending today (inclusive). */
export function bookingsTrend(state: AppState, days = 14): { date: string; count: number }[] {
  const today = startOfDay(new Date())
  const byDay = new Map<string, number>()
  for (const a of state.appointments) {
    if (a.status !== 'confirmed') continue
    const key = dateKey(fromLocalISO(a.start))
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }
  const out: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const key = dateKey(addDays(today, -i))
    out.push({ date: key, count: byDay.get(key) ?? 0 })
  }
  return out
}

/** Confirmed appointments grouped by start hour (0–23), zero-filled, sorted hour asc. */
export function peakHours(state: AppState): { hour: number; count: number }[] {
  const counts = new Array<number>(24).fill(0)
  for (const a of state.appointments) {
    if (a.status !== 'confirmed') continue
    counts[fromLocalISO(a.start).getHours()] += 1
  }
  return counts.map((count, hour) => ({ hour, count }))
}
