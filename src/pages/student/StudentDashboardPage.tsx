// ============================================================================
// EZDRIVES — StudentDashboardPage (预约时间)
// ONE unified calendar for ALL purchased courses (not one calendar per course):
// every booked lesson shows as a color-coded card (one color per course); a
// course chip row above the calendar picks which course to book next — its
// availability start boxes, package lesson list and the confirm button follow
// the selection. Booked lessons are managed from the calendar popup
// (cancel / reschedule, same interaction as the instructor).
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { getSession, isCoursePurchased, isStateLoaded, useAppState } from '../../data/store'
import { useT } from '../../i18n'
import { CalendarPlus } from 'lucide-react'
import { StudentShell } from './StudentShell'
import { CourseBookingPanel } from './CourseBookingPanel'
import { fromLocalISO } from '../../data/timeEngine'
import './student.css'
import { Button } from '../../components/shared/Button'

export default function StudentDashboardPage(): JSX.Element {
  const t = useT()
  const state = useAppState()

  const session = getSession()
  const studentId = session.studentId ?? ''
  const student = (state.students ?? []).find((s) => s.id === studentId)

  const activeCourses = (state.courses ?? []).filter((c) => c.active)
  // Purchased = the instructor confirmed the payment (支付已确认) — booked or not.
  const purchased = activeCourses.filter((c) => isCoursePurchased(state, studentId, c.id))

  // Default selection: the first purchased course WITHOUT an upcoming booking
  // (so the student can book right away); fall back to the first course.
  const defaultCourseId = ((): string => {
    const now = Date.now()
    const free = purchased.find(
      (c) =>
        !(state.appointments ?? []).some(
          (a) =>
            a.studentId === studentId && a.courseId === c.id &&
            (a.status === 'confirmed' || a.status === 'pending') &&
            fromLocalISO(a.start).getTime() > now,
        ),
    )
    return (free ?? purchased[0])?.id ?? ''
  })()

  // §: pick the default course ONCE the real data is present — the seed
  // first-paint must never lock the selection (it has no real bookings).
  const [selCourseId, setSelCourseId] = useState<string>('')
  const defaultPickedRef = useRef(false)
  useEffect(() => {
    if (defaultPickedRef.current) return
    if (!isStateLoaded()) return // wait for real data, not the seed first-paint
    if (purchased.length === 0) return
    defaultPickedRef.current = true
    setSelCourseId(defaultCourseId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchased.length, defaultCourseId])
  const effectiveId = purchased.some((c) => c.id === selCourseId) ? selCourseId : defaultCourseId

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
            {effectiveId ? (
              <CourseBookingPanel
                courses={purchased}
                selectedCourseId={effectiveId}
                onSelectCourse={setSelCourseId}
              />
            ) : null}
          </div>
        )}
      </div>
    </StudentShell>
  )
}
