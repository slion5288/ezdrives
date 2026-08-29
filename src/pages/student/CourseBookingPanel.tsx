// ============================================================================
// EZDRIVES — CourseBookingPanel (student-owned reusable component)
// Booking UI for ONE course (per-student, sequential).
// TOP: the 10-lesson progress list (ordered 1→10 easy→hard, own progress) —
// completed lessons show 已完成 (✓); the student taps the list IN ORDER to
// select the next lesson (1) or the next two consecutive lessons (2). No
// count buttons. BELOW: the calendar (week day strip + booked cards +
// selectable start-time boxes) to pick the date and the day's start time —
// selected lessons are booked back-to-back from that start.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CalendarClock, Coffee } from 'lucide-react'
import { bookAppointment, bookPackageLessons, cancelAppointment, courseRepeatable, courseTypeOf, getSession, isStateLoaded, lessonStatus, packageProgress, paymentEligibility, purchaseCount, rescheduleAppointment, uploadCertificateDocs, useAppState } from '../../data/store'
import type { Course, Slot } from '../../data/store'
import { addDays, dateKey, formatHM, fromLocalISO, getEffectiveInterval, parseDateKey, toLocalISO } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import type { Appointment } from '../../data/store'
import { MapPin, Phone, X } from 'lucide-react'
import { DayStrip } from '../../components/calendar/DayStrip'
import { courseColor, slotId, WeekCalendar } from '../../components/calendar/WeekCalendar'
import { lessonLabel } from '../../data/store'
import { formatDateLabel, formatPrice, mondayOf } from './studentFormat'
import { useToast } from '../../components/shared'
import { Button } from '../../components/shared/Button'
import { ModalFrame } from './StudentShared'
import { downloadICS } from '../../utils/ics'
import type { IcsEvent } from '../../utils/ics'

const ICS_FILENAME = 'ezdrives-lessons.ics'

interface CourseBookingPanelProps {
  /** All purchased courses — ONE unified calendar shows them together. */
  courses: Course[]
  /** The course currently selected for booking (chips above the calendar). */
  selectedCourseId: string
  onSelectCourse: (courseId: string) => void
}

export function CourseBookingPanel({ courses, selectedCourseId, onSelectCourse }: CourseBookingPanelProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const { showToast } = useToast()

  const session = getSession()
  const studentId = session.studentId ?? ''
  // The selected course; fall back to the first one defensively.
  const course = courses.find((c) => c.id === selectedCourseId) ?? courses[0]
  if (!course) return <></>
  const courseId = course.id
  const isPackage = courseTypeOf(course) === 'TEN_HOUR_PACKAGE'
  const duration = isPackage ? 60 : course.durationMin

  // §28 Purchase gate: 'full' (paid) / 'first' (cash approved → Lesson 1 or
  // first unit only) / 'none' (not purchased or request still pending).
  const elig = studentId !== '' ? paymentEligibility(state, studentId, courseId) : 'none'
  const purchased = elig !== 'none'
  const cashApprovedOnly = elig === 'first'
  const cashPending = studentId !== '' && (state.payments ?? []).some(
    (p) => p.studentId === studentId && p.courseId === courseId && p.status === 'cash_pending',
  )
  const onlinePending = studentId !== '' && (state.payments ?? []).some(
    (p) => p.studentId === studentId && p.courseId === courseId && p.status === 'pending',
  )

  const lessonStatuses = useMemo(
    () => (isPackage && course.lessons ? course.lessons.map((_, i) => lessonStatus(state, studentId, courseId, i)) : []),
    [isPackage, course, state, studentId, courseId],
  )
  const progress = useMemo(
    () => (isPackage ? packageProgress(state, studentId, courseId) : undefined),
    [isPackage, state, studentId, courseId],
  )

  /** First undone lesson — sequential, cannot be chosen freely.
   *  CASH_APPROVED package: ONLY Lesson 1 (index 0) until the cash is received. */
  const autoLesson = useMemo(
    () => (cashApprovedOnly && isPackage ? 0 : Math.max(0, lessonStatuses.findIndex((s) => s === 'free'))),
    [lessonStatuses, cashApprovedOnly, isPackage],
  )

  /** Whether the second-next lesson is also free (allows selecting 2). */
  const canTwo = useMemo(
    () => !cashApprovedOnly && lessonStatuses[autoLesson + 1] === 'free',
    [lessonStatuses, autoLesson, cashApprovedOnly],
  )

  /** §28 CASH_APPROVED individual: only the first unit — no active appointment may exist. */
  const individualFirstUsed = cashApprovedOnly && !isPackage &&
    (state.appointments ?? []).some(
      (a) => a.studentId === studentId && a.courseId === courseId && a.status !== 'cancelled',
    )

  // Tap-in-list selection: 0 / 1 / 2 consecutive lessons from autoLesson.
  const [selCount, setSelCount] = useState(1)

  /** §: an upcoming live booking for the SELECTED course. Individual lessons:
   *  one at a time — while one exists the student manages it from the calendar
   *  popup and the confirm-booking button is hidden. Packages book the next
   *  free lesson(s) sequentially, so the lesson list stays available. */
  const hasActiveBooking = (state.appointments ?? []).some(
    (a) =>
      a.studentId === studentId && a.courseId === courseId &&
      (a.status === 'confirmed' || a.status === 'pending') &&
      fromLocalISO(a.start).getTime() > Date.now(),
  )
  /** § interaction: individuals lock into "manage mode" while booked; packages
   *  only lock the booking UI when no lesson is left free (all booked/done). */
  const manageMode = !isPackage && hasActiveBooking
  const pkgNothingFree = isPackage && !lessonStatuses.some((s) => s === 'free')
  const bookingLocked = manageMode || pkgNothingFree

  /** §: initial calendar view — jump straight to the next booked lesson's day
   *  (across ALL of the student's courses) when one exists; otherwise today. */
  const initialTarget = (): Date => {
    const appts = (state.appointments ?? [])
      .filter(
        (a) =>
          a.studentId === studentId &&
          (a.status === 'confirmed' || a.status === 'pending') &&
          fromLocalISO(a.start).getTime() > Date.now(),
      )
      .sort((a, b) => a.start.localeCompare(b.start))
    return appts.length > 0 ? fromLocalISO(appts[0].start) : new Date()
  }
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(initialTarget()))
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialTarget())
  const [selectedStart, setSelectedStart] = useState<Slot | null>(null)
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null)
  const [showResched, setShowResched] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  /** Appointments just created — shows the "add to calendar" prompt. */
  const [justBooked, setJustBooked] = useState<Appointment[] | null>(null)

  /** § unified view: switching the selected course re-centres the calendar —
   *  to that course's next booked day, or back to today when it has none.
   *  Runs only on real course switches (the initial all-courses jump stays). */
  const prevCourseRef = useRef(courseId)
  useEffect(() => {
    if (prevCourseRef.current === courseId) return
    prevCourseRef.current = courseId
    const appts = (state.appointments ?? [])
      .filter(
        (a) =>
          a.studentId === studentId && a.courseId === courseId &&
          (a.status === 'confirmed' || a.status === 'pending') &&
          fromLocalISO(a.start).getTime() > Date.now(),
      )
      .sort((a, b) => a.start.localeCompare(b.start))
    const target = appts.length > 0 ? fromLocalISO(appts[0].start) : new Date()
    setWeekStart(mondayOf(target))
    setSelectedDate(target)
    setSelectedStart(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  /** § initial all-courses jump — deferred until the REAL bookings arrive, so
   *  a seed first-paint (demo appointments) never locks the view on the wrong
   *  day. */
  const jumpedRef = useRef(false)
  useEffect(() => {
    if (jumpedRef.current) return
    if (!isStateLoaded()) return // wait for the real server state, not the seed
    const live = (state.appointments ?? [])
      .filter(
        (a) =>
          a.studentId === studentId &&
          (a.status === 'confirmed' || a.status === 'pending') &&
          fromLocalISO(a.start).getTime() > Date.now(),
      )
      .sort((a, b) => a.start.localeCompare(b.start))
    if (live.length === 0) return
    jumpedRef.current = true
    const target = fromLocalISO(live[0].start)
    setWeekStart(mondayOf(target))
    setSelectedDate(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.appointments])

  /** One .ics event for an appointment (per this course panel). */
  const apptToEvent = (appt: Appointment): IcsEvent => {
    const name = locale === 'zh' ? course.name.zh : course.name.en
    const label = `${name}${course.type === 'package' && appt.lessonIndex !== undefined ? lessonLabel(course, appt.lessonIndex, locale) : ''}`
    return {
      uid: `lesson-${appt.id}@ezdrives.net`,
      summary: t('ics.summary', { course: label }),
      description: t('ics.description'),
      location: t('ics.location'),
      start: fromLocalISO(appt.start),
      end: fromLocalISO(appt.end),
    }
  }

  const addJustBookedToCalendar = (): void => {
    if (!justBooked) return
    downloadICS(justBooked.map(apptToEvent), ICS_FILENAME)
    showToast('success', t('ics.exported'))
    setJustBooked(null)
  }

  const selectedLessons = isPackage && course.lessons ? course.lessons.slice(autoLesson, autoLesson + selCount) : []
  const selectedTotal =
    selectedStart && isPackage && course.lessons
      ? course.lessons.slice(autoLesson, autoLesson + selCount).reduce((sum, l) => sum + l.price, 0)
      : course.price
  const canBook = selectedStart !== null &&
    (!isPackage ? !individualFirstUsed : lessonStatuses.some((s) => s === 'free'))

  const handleTapLesson = (offset: number): void => {
    // CASH_APPROVED package: Lesson 1 only — never select a second lesson.
    if (cashApprovedOnly && isPackage && offset !== 0) return
    // offset 0 = first undone lesson, offset 1 = second undone lesson.
    if (selCount === offset + 1) setSelCount(offset) // tapping the selected tail deselects it
    else setSelCount(offset + 1) // tapping further selects through it
  }

  const bookingErrorMessage = (error: string): string => {
    switch (error) {
      case 'conflict':
        return t('student.booking.slotTaken')
      case 'closed':
        return t('calendar.dayClosed')
      case 'past':
        return t('student.booking.past')
      case 'today':
        return t('student.booking.today')
      case 'not_purchased':
        return t('payment.notPurchased')
      case 'cash_approved_first_lesson':
        return t('student.booking.cashFirstLesson')
      case 'cash_approved_first_unit':
        return t('student.booking.cashFirstUnit')
      default:
        return t('common.toast.error')
    }
  }

  const handleBook = async (): Promise<void> => {
    if (!selectedStart || !canBook) return
    const startISO = toLocalISO(selectedStart.start)
    if (isPackage) {
      const result = await bookPackageLessons(studentId, course.id, startISO, autoLesson, selCount)
      if (result.ok) {
        showToast(
          'success',
          t('student.booking.packageConfirmed', { count: selCount, n: autoLesson + 1, total: formatPrice(selectedTotal) }),
        )
        setSelectedStart(null)
        setJustBooked(result.appointments)
      } else {
        showToast('error', bookingErrorMessage(String(result.error)))
      }
      return
    }
    const result = await bookAppointment(studentId, course.id, startISO)
    if (result.ok) {
      showToast('success', t('student.booking.bookedOk'))
      setSelectedStart(null)
      setJustBooked([result.appointment])
    } else {
      showToast('error', bookingErrorMessage(String(result.error)))
    }
  }

  /** §: cancel a booked lesson from the calendar popup (same as instructor). */
  const confirmCancelAppt = async (): Promise<void> => {
    if (!detailAppt) return
    const result = await cancelAppointment(detailAppt.id)
    if (result.ok) {
      showToast('success', t('common.toast.deleted'))
      setShowCancelConfirm(false)
      setDetailAppt(null)
      setSelectedStart(null)
      // §: no booking left anywhere → the calendar returns to the current week;
      // otherwise it re-centres on the next upcoming booking (any course).
      const remaining = (state.appointments ?? [])
        .filter(
          (a) =>
            a.id !== detailAppt.id && a.studentId === studentId &&
            (a.status === 'confirmed' || a.status === 'pending') &&
            fromLocalISO(a.start).getTime() > Date.now(),
        )
        .sort((a, b) => a.start.localeCompare(b.start))
      if (remaining.length === 0) {
        setWeekStart(mondayOf(new Date()))
        setSelectedDate(new Date())
      } else {
        const target = fromLocalISO(remaining[0].start)
        setWeekStart(mondayOf(target))
        setSelectedDate(target)
      }
    } else {
      showToast('error', result.error === 'past' ? t('student.booking.past') : t('common.toast.error'))
      setShowCancelConfirm(false)
    }
  }

  /** §: reschedule a booked lesson from the calendar popup (same as instructor). */
  const confirmResched = async (startISO: string): Promise<void> => {
    if (!detailAppt) return
    const result = await rescheduleAppointment(detailAppt.id, startISO)
    if (result.ok) {
      showToast('success', t('common.toast.saved'))
      setShowResched(false)
      setDetailAppt(null)
      setSelectedStart(null)
    } else {
      const message =
        result.error === 'conflict'
          ? t('student.booking.slotTaken')
          : result.error === 'closed'
            ? t('calendar.dayClosed')
            : result.error === 'past'
              ? t('student.booking.past')
              : result.error === 'today'
                ? t('student.booking.today')
                : t('common.toast.error')
      showToast('error', message)
      setShowResched(false)
    }
  }

  return (
    <div className="course-booking">
      {/* § unified view: ONE calendar for all purchased courses — pick which
          course to book next via the chips; every course's bookings are shown
          in the same calendar (color-coded). */}
      <div className="course-booking__courses">
        <span className="course-booking__courses-label">{t('student.booking.selectCourse')}</span>
        <div className="course-booking__courses-list">
          {courses.map((c) => {
            const active = c.id === courseId
            // § status shown to the right of each course box (colored text).
            const st = ((): 'none' | 'booked' | 'done' => {
              const appts = (state.appointments ?? []).filter(
                (a) => a.studentId === studentId && a.courseId === c.id && a.status !== 'cancelled',
              )
              if (appts.some((a) => fromLocalISO(a.start).getTime() > Date.now())) return 'booked'
              if (appts.some((a) => fromLocalISO(a.end).getTime() < Date.now())) return 'done'
              const enroll = (state.enrollments ?? []).find((e) => e.studentId === studentId && e.courseId === c.id)
              if (enroll && (enroll.completedLessonCount ?? 0) > 0) return 'done'
              return 'none'
            })()
            return (
              <button
                key={c.id}
                type="button"
                className={`course-booking__chip${active ? ' course-booking__chip--active' : ''}`}
                onClick={() => onSelectCourse(c.id)}
              >
                <span className="course-booking__chip-dot" style={{ background: courseColor(state, c.id) }} aria-hidden="true" />
                <span>{locale === 'zh' ? c.name.zh : c.name.en}</span>
                <span className={`course-booking__chip-status is-${st}`}>
                  {st === 'booked'
                    ? t('student.booking.statusBooked')
                    : st === 'done'
                      ? t('student.booking.statusDone')
                      : t('student.booking.statusNone')}
                </span>
              </button>
            )
          })}
        </div>
        <span className="course-booking__courses-sub">
          {isPackage
            ? t('courses.lessons', { count: course.lessons?.length ?? 10 })
            : courseRepeatable(course)
              ? t('student.dashboard.units', { count: purchaseCount(state, studentId, courseId) })
              : t('courses.duration', { duration: course.durationMin })}
        </span>
      </div>
      {/* §39/§46: Full Course Certificate — document upload workflow, no driving calendar */}
      {courseTypeOf(course) === 'FULL_COURSE_CERTIFICATE' ? (
        <CertificateUploadCard course={course} studentId={studentId} t={t} />
      ) : (
      <>
      {!purchased ? (
        <div className="course-booking__locked">
          <p>
            {cashPending
              ? t('payment.cashPendingNotice')
              : onlinePending
                ? t('payment.pendingNotice')
                : t('payment.notPurchased')}
          </p>
        </div>
      ) : (
        <>
          {/* §28 CASH_APPROVED: first-lesson / first-unit only until the cash is received */}
          {cashApprovedOnly && isPackage ? (
            <div className="course-booking__notice">
              <span>{t('student.booking.cashApprovedPackage')}</span>
            </div>
          ) : null}
          {cashApprovedOnly && !isPackage && individualFirstUsed ? (
            <div className="course-booking__notice">
              <span>{t('student.booking.cashApprovedUnitUsed')}</span>
            </div>
          ) : null}
          {/* §: individual booked → manage from the popup; package fully
              booked/done → nothing left to book */}
          {manageMode ? (
            <div className="course-booking__notice">
              <span>{t('student.booking.manageHint')}</span>
            </div>
          ) : null}
          {pkgNothingFree && !manageMode ? (
            <div className="course-booking__notice">
              <span>{t('student.booking.pkgFull')}</span>
            </div>
          ) : null}
          {/* TOP: per-student sequential lesson progress — tap to select 1 or 2 consecutive.
              Always visible for packages so the 1–10 selection never disappears. */}
      {isPackage && course.lessons ? (
        <div className="course-booking__select">
          <div className="course-booking__select-head">
            <span className="student-field-label">{t('student.booking.progressRef')}</span>
            <span className="course-booking__progress tabular-nums">
              {t('courses.lessonProgress', { done: progress?.done ?? 0, total: progress?.total ?? 0 })}
            </span>
          </div>
          <div className="student-package-list">
            {course.lessons.map((lesson, i) => {
              const status = lessonStatuses[i] ?? 'free'
              const offset = i - autoLesson // 0 = next lesson, 1 = second-next
              const selected = offset >= 0 && offset < selCount
              const tappable = offset === 0 || (offset === 1 && canTwo)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={status !== 'free' || !tappable}
                  className={`student-package-lesson${selected ? ' checked' : ''}${status !== 'free' ? ` is-${status}` : ''}${
                    tappable && status === 'free' ? ' is-tappable' : ''
                  }`}
                  onClick={() => handleTapLesson(offset)}
                >
                  <span className="student-package-num">{i + 1}</span>
                  <span className="student-package-info">
                    <span className="student-package-name">
                      {status === 'done' ? <Check size={13} className="student-package-done-icon" /> : null}
                      {locale === 'zh' ? lesson.name.zh : lesson.name.en}
                    </span>
                    <span className="student-package-desc">{locale === 'zh' ? lesson.description.zh : lesson.description.en}</span>
                  </span>
                  <span className="student-package-meta">
                    {status === 'done' ? (
                      <span className="student-package-status is-done">{t('student.booking.lessonDone')}</span>
                    ) : status === 'booked' ? (
                      <span className="student-package-status is-booked">{t('student.booking.booked')}</span>
                    ) : selected ? (
                      <span className="student-package-price">{formatPrice(lesson.price)}</span>
                    ) : tappable ? (
                      <span className="student-package-status is-next">{t('student.booking.select')}</span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="course-booking__auto">
            <span className="course-booking__auto-label">{t('student.booking.autoLessons')}</span>
            <span className="course-booking__auto-list">
              {selCount > 0
                ? selectedLessons.map((lesson, i) => (
                    <span key={i} className="course-booking__auto-item">
                      {t('student.booking.autoLessonItem', {
                        n: autoLesson + i + 1,
                        name: locale === 'zh' ? lesson.name.zh : lesson.name.en,
                      })}
                    </span>
                  ))
                : t('student.booking.selectFirst')}
            </span>
          </p>
          <p className="course-booking__hint">
            {cashApprovedOnly && isPackage ? t('student.booking.cashPackageHint') : t('student.booking.maxTwoHint')}
          </p>
        </div>
      ) : null}

      {/* Calendar — day strip + booked cards + selectable start boxes */}
      <DayStrip
        weekStart={weekStart}
        selectedDate={selectedDate}
        onSelect={(d) => {
          setSelectedDate(d)
          setWeekStart(mondayOf(d))
        }}
        onPrevWeek={() => {
          setWeekStart((w) => mondayOf(new Date(w.getTime() - 7 * 86400000)))
          setSelectedDate((d) => new Date(d.getTime() - 7 * 86400000))
        }}
        onNextWeek={() => {
          setWeekStart((w) => mondayOf(new Date(w.getTime() + 7 * 86400000)))
          setSelectedDate((d) => new Date(d.getTime() + 7 * 86400000))
        }}
        onToday={() => {
          setWeekStart(mondayOf(new Date()))
          setSelectedDate(new Date())
        }}
      />

      {/* § P2: same-day booking is never allowed — say WHY, not just hide it */}
      {dateKey(selectedDate) === dateKey(new Date()) ? (
        <div className="course-booking__today-note">
          <CalendarClock size={15} aria-hidden="true" />
          <span>{t('student.booking.todayReason')}</span>
        </div>
      ) : null}

      <WeekCalendar
        weekStart={weekStart}
        state={state}
        mode="availability"
        singleDay={selectedDate}
        courseDurationMin={duration}
        studentId={studentId}
        myStudentId={studentId}
        colorMineByCourse
        selectedSlotId={selectedStart ? slotId(selectedStart) : undefined}
        // §: with an active booking the student manages it from the popup —
        // new start boxes are not offered (confirm button is hidden too).
        onSelectSlot={bookingLocked ? undefined : (slot) => setSelectedStart(slot)}
        onSelectAppointment={(appt) => setDetailAppt(appt)}
      />

      {/* § user decision: the break notice sits BELOW the calendar so the
          course chips stay visually attached to the time grid. */}
      {(state.instructor.breakMin ?? 0) > 0 ? (
        <div className="course-booking__break">
          <Coffee size={15} aria-hidden="true" />
          <span>{t('student.booking.breakInfo', { break: state.instructor.breakMin })}</span>
        </div>
      ) : null}

      {/* Appointment detail — click an existing lesson to see full info */}
      {detailAppt ? (
        <div className="student-detail-scrim" onMouseDown={() => setDetailAppt(null)}>
          <div className="student-detail-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="student-detail-card__head">
              <span className="student-detail-card__title">{t('student.dashboard.detail')}</span>
              <button type="button" className="student-icon-btn" onClick={() => setDetailAppt(null)} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>
            <div className="student-detail-card__body">
              <div className="student-detail-row">
                <span className="student-detail-label">{t('instructor.schedule.course')}</span>
                <span className="student-detail-value">
                  {(() => {
                    const dc = (state.courses ?? []).find((c) => c.id === detailAppt.courseId)
                    const dcName = dc ? (locale === 'zh' ? dc.name.zh : dc.name.en) : detailAppt.courseId
                    return dc && detailAppt.lessonIndex !== undefined
                      ? `${dcName} · ${lessonLabel(dc, detailAppt.lessonIndex, locale)}`
                      : dcName
                  })()}
                </span>
              </div>
              <div className="student-detail-row">
                <span className="student-detail-label">{t('instructor.schedule.time')}</span>
                <span className="student-detail-value tabular-nums">
                  {formatDateLabel(locale, fromLocalISO(detailAppt.start))} · {formatHM(fromLocalISO(detailAppt.start))}–{formatHM(fromLocalISO(detailAppt.end))}
                </span>
              </div>
              <div className="student-detail-row">
                <span className="student-detail-label">{t('landing.instructors.title')}</span>
                <span className="student-detail-value">{state.instructor.name}</span>
              </div>
              <div className="student-detail-row">
                <span className="student-detail-label">{t('instructor.schedule.address')}</span>
                <span className="student-detail-value">
                  <MapPin size={13} /> {t('ics.location')}
                </span>
              </div>
              <div className="student-detail-row">
                <span className="student-detail-label">{t('student.profile.phone')}</span>
                <span className="student-detail-value">
                  <a href={`tel:${state.instructor.phone.replace(/\s/g, '')}`}>
                    <Phone size={13} /> {state.instructor.phone}
                  </a>
                </span>
              </div>
            </div>
            {/* §: manage the booked lesson — cancel or change time (same as instructor) */}
            {detailAppt.status === 'confirmed' || detailAppt.status === 'pending' ? (
              <div className="student-detail-card__actions">
                <Button variant="dangerGhost" size="sm" onClick={() => setShowCancelConfirm(true)}>
                  {t('student.dashboard.cancel')}
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowResched(true)}>
                  <CalendarClock size={15} /> {t('instructor.schedule.reschedule')}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* §: reschedule — precise 15-min picker, same logic as the instructor's */}
      {showResched && detailAppt ? (
        <StudentRescheduleModal
          state={state}
          appointment={detailAppt}
          onClose={() => setShowResched(false)}
          onConfirm={confirmResched}
        />
      ) : null}

      {/* §: cancel confirmation */}
      {showCancelConfirm && detailAppt ? (
        <div className="student-detail-scrim" onMouseDown={() => setShowCancelConfirm(false)}>
          <div className="student-detail-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="student-detail-card__head">
              <span className="student-detail-card__title">{t('student.dashboard.cancelConfirmTitle')}</span>
              <button type="button" className="student-icon-btn" onClick={() => setShowCancelConfirm(false)} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>
            <div className="student-detail-card__body">
              <p className="student-confirm-body">{t('student.dashboard.cancelConfirmBody')}</p>
              {/* §: two package lessons booked together cancel as ONE pair */}
              {detailAppt.consecutiveGroup ? (
                <p className="student-confirm-body course-booking__pair-note">
                  {t('student.booking.cancelPairNote')}
                </p>
              ) : null}
              <div className="student-detail-card__actions">
                <Button variant="secondary" onClick={() => setShowCancelConfirm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" onClick={() => void confirmCancelAppt()}>
                  {t('student.dashboard.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirm footer — §: hidden while booking is locked (individual booked
          → manage via popup; package fully booked/done → nothing to book) */}
      {!bookingLocked ? (
      <div className="course-booking__foot">
        <div className="course-booking__summary">
          {selectedStart ? (
            <>
              <span className="course-booking__when">
                <CalendarClock size={15} />
                {formatDateLabel(locale, selectedStart.start)} · {formatHM(selectedStart.start)}
                {isPackage && selCount > 1 ? ` – ${formatHM(new Date(selectedStart.start.getTime() + selCount * 3600000))}` : ''}
              </span>
              <span className="course-booking__total tabular-nums">{formatPrice(selectedTotal)}</span>
            </>
          ) : (
            <span className="course-booking__hint">{t('student.booking.pickSlot')}</span>
          )}
        </div>
        <Button variant="primary" disabled={!canBook} onClick={handleBook}>
          {isPackage
            ? t('student.booking.packageConfirm', { count: selCount, total: formatPrice(selectedTotal) })
            : t('student.booking.confirm')}
        </Button>
      </div>
      ) : null}
        </>
      )}

      {/* Post-booking prompt: add the new lesson(s) to the phone calendar */}
      {justBooked ? (
        <ModalFrame open title={t('student.booking.bookedOk')} onClose={() => setJustBooked(null)}>
          <p className="student-confirm-body">{t('ics.addCalendarHint')}</p>
          <div className="student-modal-actions">
            <Button variant="secondary" onClick={() => setJustBooked(null)}>
              {t('ics.addLater')}
            </Button>
            <Button variant="primary" onClick={addJustBookedToCalendar}>
              <CalendarClock size={16} /> {t('ics.addToCalendar')}
            </Button>
          </div>
        </ModalFrame>
      ) : null}
      </>
      )}
    </div>
  )
}

/** §39/§46: certificate course — student uploads licence front/back. */
function CertificateUploadCard({
  course,
  studentId,
  t,
}: {
  course: Course
  studentId: string
  t: (key: string, vars?: Record<string, string | number>) => string
}): JSX.Element {
  const state = useAppState()
  const { showToast } = useToast()
  const payment = (state.payments ?? [])
    .filter((p) => p.studentId === studentId && p.courseId === course.id && p.status === 'confirmed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const docs = payment?.certDocs as { front?: string; back?: string; status?: string } | undefined
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [busy, setBusy] = useState(false)
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  const upload = async (): Promise<void> => {
    if (!payment || (!front && !back) || busy) return
    setBusy(true)
    const res = await uploadCertificateDocs(payment.id, front, back)
    setBusy(false)
    if (res.ok) showToast('success', t('payment.docUploaded'))
    else showToast('error', t('common.toast.error'))
  }
  return (
    <div className="cert-upload">
      <p className="student-field-label">{t('payment.certUploadHint')}</p>
      {docs?.status === 'complete' ? (
        <p className="student-payment__hint is-ok">✓ {t('payment.certUploaded')}</p>
      ) : (
        <div className="cert-upload__row">
          <label className="cert-upload__label">
            <span>{t('payment.certFront')}</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setFront(await fileToDataUrl(f)) }}
            />
          </label>
          <label className="cert-upload__label">
            <span>{t('payment.certBack')}</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setBack(await fileToDataUrl(f)) }}
            />
          </label>
          <Button variant="primary" disabled={(!front && !back) || busy} onClick={() => void upload()}>
            {t('payment.certSubmit')}
          </Button>
        </div>
      )}
      {front ? <img src={front} alt="" className="cert-upload__preview" /> : null}
      {back ? <img src={back} alt="" className="cert-upload__preview" /> : null}
    </div>
  )
}

/**
 * §: student reschedule — precise 15-min date+time picker, the SAME UI/logic
 * as the instructor's TimePickerModal (conflict + break aware). Students may
 * only move a lesson to TOMORROW or later (never same-day).
 */
function StudentRescheduleModal({
  state,
  appointment,
  onClose,
  onConfirm,
}: {
  state: ReturnType<typeof useAppState>
  appointment: Appointment
  onClose: () => void
  onConfirm: (startISO: string) => void
}): JSX.Element {
  const t = useT()
  const course = (state.courses ?? []).find((c) => c.id === appointment.courseId)
  const windowMin = course ? (course.type === 'package' ? 60 : course.durationMin) : 60
  const minDate = dateKey(addDays(new Date(), 1)) // tomorrow — same-day is never offered
  const [date, setDate] = useState<string>(() => {
    const orig = dateKey(fromLocalISO(appointment.start))
    return orig >= minDate ? orig : minDate
  })
  const [time, setTime] = useState('09:00')

  const day = parseDateKey(date)
  const interval = getEffectiveInterval(day, state.weeklyRules, state.exceptions)
  const nowMs = Date.now()
  const br = Math.max(0, state.instructor.breakMin ?? 0) * 60000
  const todayKey = dateKey(new Date())

  /** Free 15-min start minutes — same algorithm as the instructor's picker,
   *  plus: same-day minutes are skipped for students. */
  const futureMinutes: number[] = []
  if (interval) {
    for (let m = interval.startMin; m + windowMin <= interval.endMin; m += 15) {
      const s = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60, 0).getTime()
      if (s <= nowMs) continue
      if (dateKey(new Date(s)) === todayKey) continue // § no same-day
      const e = s + windowMin * 60000
      let blocked = false
      for (const a of state.appointments) {
        if (a.status !== 'confirmed' && a.status !== 'pending') continue
        if (a.id === appointment.id) continue
        const aS = fromLocalISO(a.start).getTime()
        const aE = fromLocalISO(a.end).getTime()
        const sameStudent = a.studentId === appointment.studentId
        const effEnd = sameStudent ? aE : aE + br
        if (s < effEnd && e > aS) {
          blocked = true
          break
        }
      }
      if (!blocked) futureMinutes.push(m)
    }
  }

  // Auto-select the first free minute whenever the date changes (instructor parity).
  useEffect(() => {
    const next = futureMinutes[0]
    if (next !== undefined) {
      const hh = String(Math.floor(next / 60)).padStart(2, '0')
      const mm = String(next % 60).padStart(2, '0')
      setTime(`${hh}:${mm}`)
    } else {
      setTime('09:00')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, state.weeklyRules, state.exceptions])

  const startISO = `${date}T${time}:00`
  const endISO = toLocalISO(new Date(fromLocalISO(startISO).getTime() + windowMin * 60000))
  const hasConflict = (state.appointments ?? []).some(
    (a) =>
      a.id !== appointment.id &&
      (a.status === 'confirmed' || a.status === 'pending') &&
      fromLocalISO(a.start).getTime() < fromLocalISO(endISO).getTime() &&
      fromLocalISO(a.end).getTime() > fromLocalISO(startISO).getTime(),
  )
  const canConfirm = futureMinutes.length > 0 && !hasConflict

  return (
    <div className="student-detail-scrim" onMouseDown={onClose}>
      <div className="student-detail-card student-detail-card--picker" onMouseDown={(e) => e.stopPropagation()}>
        <div className="student-detail-card__head">
          <span className="student-detail-card__title">{t('student.dashboard.rescheduleTitle')}</span>
          <button type="button" className="student-icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        <div className="student-detail-card__body">
          <p className="student-confirm-body">{t('student.dashboard.rescheduleBody')}</p>
          <div className="student-field">
            <label className="student-field-label" htmlFor="stu-resched-date">{t('instructor.workinghours.date')}</label>
            <input
              id="stu-resched-date"
              type="date"
              className="student-input"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="student-field">
            <label className="student-field-label" htmlFor="stu-resched-time">{t('instructor.schedule.pickNewTime')}</label>
            <select
              id="stu-resched-time"
              className="student-input"
              value={time}
              disabled={futureMinutes.length === 0}
              onChange={(e) => setTime(e.target.value)}
            >
              {futureMinutes.map((m) => (
                <option key={m} value={`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`}>
                  {`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`}
                </option>
              ))}
            </select>
            {futureMinutes.length === 0 ? <p className="student-field-hint">{t('calendar.dayClosed')}</p> : null}
            {hasConflict ? <p className="student-field-error">{t('student.booking.slotTaken')}</p> : null}
          </div>
          <div className="student-detail-card__actions">
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" disabled={!canConfirm} onClick={() => onConfirm(startISO)}>
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
