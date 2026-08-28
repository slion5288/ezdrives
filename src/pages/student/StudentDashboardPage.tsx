// ============================================================================
// EZDRIVES — StudentDashboardPage (预约时间)
// For every PURCHASED course (instructor confirmed the payment), shows its
// booking panel directly — the calendar with booked cards + selectable
// start-time boxes; package courses list all lessons (✓ done, tap to select
// 1–2 consecutive). No notifications here — those live under 通知.
// ============================================================================

import { courseRepeatable, getSession, isCoursePurchased, purchaseCount, useAppState } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { CalendarPlus } from 'lucide-react'
import { StudentShell } from './StudentShell'
import { CourseBookingPanel } from './CourseBookingPanel'
import './student.css'
import { Button } from '../../components/shared/Button'

export default function StudentDashboardPage(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()

  const session = getSession()
  const studentId = session.studentId ?? ''
  const student = (state.students ?? []).find((s) => s.id === studentId)

  const activeCourses = (state.courses ?? []).filter((c) => c.active)
  // Purchased = the instructor confirmed the payment (支付已确认) — booked or not.
  const purchased = activeCourses.filter((c) => isCoursePurchased(state, studentId, c.id))

  return (
    <StudentShell>
      <div className="student-page">
        <header className="student-page-head">
          <h1>{t('student.dashboard.title')}</h1>
          <p className="student-page-sub">
            {student ? `${t('student.dashboard.greeting', { name: student.name })}` : ''}
          </p>
        </header>

        {purchased.length === 0 ? (
          <div className="student-card">
            <div className="student-empty-catalog">
              <span className="student-empty-catalog__icon">
                <CalendarPlus size={26} />
              </span>
              <h2>{t('student.dashboard.noCourses')}</h2>
              <p>{t('student.dashboard.noCoursesBody')}</p>
              <Button to="/student/book" variant="primary">
                {t('student.dashboard.backToBook')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="student-lessons-list">
            {purchased.map((course) => (
              <section key={course.id} className="student-card">
                <div className="student-card-header">
                  <h2 className="student-card-title">{locale === 'zh' ? course.name.zh : course.name.en}</h2>
                  <span className="student-card-subtitle">
                    {course.type === 'package'
                      ? t('courses.lessons', { count: course.lessons?.length ?? 10 })
                      : courseRepeatable(course)
                        ? t('student.dashboard.units', { count: purchaseCount(state, studentId, course.id) })
                        : t('courses.duration', { duration: course.durationMin })}
                  </span>
                </div>
                <CourseBookingPanel key={`panel-${course.id}`} course={course} />
              </section>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  )
}
