// ============================================================================
// EZDRIVES — Instructor OverviewPage (instructor-owned)
// Stat cards (this month), course-mix donut, 14-day bookings-trend line,
// peak-hours bars, and a compact upcoming-appointments panel.
// ============================================================================

import type { AppState } from '../../data/store'
import { courseDistribution, monthStats } from '../../data/stats'
import { useLocale, useT } from '../../i18n'
import { dateKey, formatDateEn, formatDateZh, formatHM, fromLocalISO } from '../../data/timeEngine'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { BarChart, DonutChart, LineChart } from './charts'
import { courseById, formatMoney, isLiveAppointment, statusLabel, studentById } from './helpers'
import type { InstructorTab } from './helpers'
import { Badge, EmptyState, StatCard } from './ui'

interface MonthCounts {
  lessons: number
  revenue: number
  newStudents: number
}

function countsForMonth(state: AppState, year: number, month: number): MonthCounts {
  const inMonth = (iso: string): boolean => {
    const d = fromLocalISO(iso)
    return d.getFullYear() === year && d.getMonth() === month
  }
  const lessons = state.appointments.filter((a) => a.status === 'confirmed' && inMonth(a.start))
  const revenue = lessons.reduce((sum, a) => sum + (courseById(state, a.courseId)?.price ?? 0), 0)
  const newStudents = state.students.filter((s) => inMonth(s.registeredAt)).length
  return { lessons: lessons.length, revenue, newStudents }
}

function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export default function OverviewPage({ state, onNavigate }: { state: AppState; onNavigate: (tab: InstructorTab) => void }): JSX.Element {
  const t = useT()
  const locale = useLocale()

  const now = new Date()
  const stats = monthStats(state)
  const prev = countsForMonth(state, now.getFullYear() - (now.getMonth() === 0 ? 1 : 0), now.getMonth() === 0 ? 11 : now.getMonth() - 1)
  const distribution = courseDistribution(state)

  const deltaText = (pct: number): string => `${pct >= 0 ? '+' : ''}${pct}%`
  const vsLastMonth = t('instructor.overview.vsLastMonth')

  const upcoming = state.appointments
    .filter((a) => isLiveAppointment(a) && dateKey(fromLocalISO(a.start)) >= dateKey(new Date()))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6)

  return (
    <div className="ins-overview">
      <div className="ins-stats-grid">
        <StatCard
          label={t('instructor.overview.lessons')}
          value={String(stats.lessons)}
          delta={{ text: deltaText(deltaPct(stats.lessons, prev.lessons)), up: stats.lessons >= prev.lessons }}
          hint={vsLastMonth}
        />
        <StatCard
          label={t('instructor.overview.revenue')}
          value={`${formatMoney(stats.revenue)} ${t('common.cad')}`}
          delta={{ text: deltaText(deltaPct(stats.revenue, prev.revenue)), up: stats.revenue >= prev.revenue }}
          hint={vsLastMonth}
        />
        <StatCard
          label={t('instructor.overview.newStudents')}
          value={String(stats.newStudents)}
          delta={{ text: deltaText(deltaPct(stats.newStudents, prev.newStudents)), up: stats.newStudents >= prev.newStudents }}
          hint={vsLastMonth}
        />
        <StatCard label={t('instructor.overview.courseMix')} value={String(distribution.length)} />
      </div>

      {/* Upcoming appointments — first block, right below the stats */}
      <section className="ins-panel">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">{t('instructor.overview.appointments')}</h2>
          <button type="button" className="ins-link-btn" onClick={() => onNavigate('schedule')}>
            {t('instructor.overview.viewSchedule')} <ArrowRight size={14} />
          </button>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon={<CalendarClock size={24} />} title={t('instructor.overview.noAppointments')} />
        ) : (
          <ul className="ins-upcoming">
            {upcoming.map((a) => {
              const start = fromLocalISO(a.start)
              const student = studentById(state, a.studentId)
              const course = courseById(state, a.courseId)
              const courseName = course ? (locale === 'zh' ? course.name.zh : course.name.en) : a.courseId
              const dayLabel = locale === 'zh' ? formatDateZh(start) : formatDateEn(start)
              return (
                <li key={a.id} className="ins-upcoming-item">
                  <div className="ins-upcoming-when">
                    <span className="ins-upcoming-date tabular-nums">{dayLabel}</span>
                    <span className="ins-upcoming-time tabular-nums">{formatHM(start)}</span>
                  </div>
                  <div className="ins-upcoming-main">
                    <span className="ins-upcoming-name">{student ? student.name : a.studentId}</span>
                    <span className="ins-upcoming-course">{courseName}</span>
                  </div>
                  <div className="ins-upcoming-side">
                    <Badge tone={a.status === 'confirmed' ? 'success' : 'warning'}>{statusLabel(a.status, t)}</Badge>
                    <span className="ins-upcoming-price tabular-nums">{course ? formatMoney(course.price) : ''}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="ins-chart-grid">
        <section className="ins-panel">
          <div className="ins-panel-head">
            <h2 className="ins-panel-title">{t('instructor.overview.trend')}</h2>
            <span className="ins-panel-sub">{t('stats.trendAxis', { days: 14 })}</span>
          </div>
          <LineChart state={state} locale={locale} />
        </section>
        <section className="ins-panel">
          <div className="ins-panel-head">
            <h2 className="ins-panel-title">{t('stats.courseMix')}</h2>
            <span className="ins-panel-sub">{t('instructor.overview.courseDistribution')}</span>
          </div>
          <DonutChart state={state} locale={locale} />
        </section>
      </div>

      <div className="ins-chart-grid ins-chart-grid--bar">
        <section className="ins-panel">
          <div className="ins-panel-head">
            <h2 className="ins-panel-title">{t('instructor.overview.peakHours')}</h2>
            <span className="ins-panel-sub">{t('stats.peakAxis')}</span>
          </div>
          <BarChart state={state} />
        </section>
      </div>
    </div>
  )
}
