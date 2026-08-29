// ============================================================================
// EZDRIVES — StudentDashboardPage (预约时间)
// § payment overhaul: a compact "My Orders" list (every payment with its
// status) sits above the unified booking calendar.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { getSession, isCoursePurchased, isStateLoaded, paymentMethodLabel, useAppState } from '../../data/store'
import { useLocale, useT } from '../../i18n'
import { CalendarPlus, Receipt } from 'lucide-react'
import { StudentShell } from './StudentShell'
import { CourseBookingPanel } from './CourseBookingPanel'
import { fromLocalISO } from '../../data/timeEngine'
import './student.css'
import { Button } from '../../components/shared/Button'
import { formatPrice } from './studentFormat'

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

  // § payment overhaul: this student's own orders only (newest first).
  const myOrders = (state.payments ?? [])
    .filter((p) => p.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

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
          <>
            {/* § payment overhaul: My Orders — real order list, never demo data */}
            <div className="student-orders">
              <div className="student-orders__head">
                <Receipt size={16} />
                <span>{t('student.orders.title')}</span>
              </div>
              {myOrders.length === 0 ? (
                <p className="student-orders__empty">{t('student.orders.empty')}</p>
              ) : (
                <div className="student-orders__list">
                  {myOrders.map((o) => {
                    const oc = (state.courses ?? []).find((c) => c.id === o.courseId)
                    const st =
                      o.status === 'paid' || o.status === 'confirmed'
                        ? { text: t('payment.statusPaid'), cls: 'is-paid' }
                        : o.status === 'submitted'
                          ? { text: t('payment.statusSubmitted'), cls: 'is-submitted' }
                          : o.status === 'rejected'
                            ? { text: t('payment.statusRejected'), cls: 'is-rejected' }
                            : o.status === 'cash_pending'
                              ? { text: t('payment.statusCashPending'), cls: 'is-pending' }
                              : o.status === 'cash_approved'
                                ? { text: t('payment.statusCashPending'), cls: 'is-pending' }
                                : { text: t('payment.statusPending'), cls: 'is-pending' }
                    return (
                      <div key={o.id} className="student-orders__row">
                        <div className="student-orders__main">
                          <span className="student-orders__name">
                            {oc ? (locale === 'zh' ? oc.name.zh : oc.name.en) : o.courseId}
                          </span>
                          <span className="student-orders__sub tabular-nums">
                            {o.order_no || o.id} · {paymentMethodLabel(o.method, locale)} · {formatPrice(o.amount ?? o.final_price ?? 0)} CAD
                          </span>
                          {o.status === 'submitted' ? (
                            <span className="student-orders__note">{t('student.orders.submittedNote')}</span>
                          ) : o.status === 'paid' ? (
                            <span className="student-orders__note is-ok">{t('student.orders.paidNote')}</span>
                          ) : o.status === 'rejected' && o.rejectReason ? (
                            <span className="student-orders__note is-bad">
                              {t('student.orders.rejectReason')} {o.rejectReason}
                            </span>
                          ) : null}
                        </div>
                        <span className={`student-orders__status ${st.cls}`}>{st.text}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="student-lessons-list">
              {effectiveId ? (
                <CourseBookingPanel
                  courses={purchased}
                  selectedCourseId={effectiveId}
                  onSelectCourse={setSelCourseId}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </StudentShell>
  )
}
