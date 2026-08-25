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

import { useMemo, useState } from 'react'
import { Check, CalendarClock, Coffee } from 'lucide-react'
import { bookAppointment, bookPackageLessons, getSession, isCoursePurchased, lessonStatus, packageProgress, useAppState } from '../../data/store'
import type { Course, Slot } from '../../data/store'
import { formatHM, toLocalISO } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { DayStrip } from '../../components/calendar/DayStrip'
import { slotId, WeekCalendar } from '../../components/calendar/WeekCalendar'
import { formatDateLabel, formatPrice, mondayOf } from './studentFormat'
import { useToast } from './StudentToast'

interface CourseBookingPanelProps {
  course: Course
}

export function CourseBookingPanel({ course }: CourseBookingPanelProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const state = useAppState()
  const { showToast } = useToast()

  const session = getSession()
  const studentId = session.studentId ?? ''
  const isPackage = course.type === 'package'
  const duration = isPackage ? 60 : course.durationMin

  // Purchase gate: only paid courses can be booked.
  const purchased = studentId !== '' && isCoursePurchased(state, studentId, course.id)

  const lessonStatuses = useMemo(
    () => (isPackage && course.lessons ? course.lessons.map((_, i) => lessonStatus(state, studentId, course.id, i)) : []),
    [isPackage, course, state, studentId],
  )
  const progress = useMemo(
    () => (isPackage ? packageProgress(state, studentId, course.id) : undefined),
    [isPackage, state, studentId, course.id],
  )

  /** First undone lesson — sequential, cannot be chosen freely. */
  const autoLesson = useMemo(() => Math.max(0, lessonStatuses.findIndex((s) => s === 'free')), [lessonStatuses])

  /** Whether the second-next lesson is also free (allows selecting 2). */
  const canTwo = useMemo(() => lessonStatuses[autoLesson + 1] === 'free', [lessonStatuses, autoLesson])

  // Tap-in-list selection: 0 / 1 / 2 consecutive lessons from autoLesson.
  const [selCount, setSelCount] = useState(1)
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [selectedStart, setSelectedStart] = useState<Slot | null>(null)

  const selectedLessons = isPackage && course.lessons ? course.lessons.slice(autoLesson, autoLesson + selCount) : []
  const selectedTotal =
    selectedStart && isPackage && course.lessons
      ? course.lessons.slice(autoLesson, autoLesson + selCount).reduce((sum, l) => sum + l.price, 0)
      : course.price
  const canBook = selectedStart !== null && (!isPackage || selCount >= 1)

  const handleTapLesson = (offset: number): void => {
    // offset 0 = first undone lesson, offset 1 = second undone lesson.
    if (selCount === offset + 1) setSelCount(offset) // tapping the selected tail deselects it
    else setSelCount(offset + 1) // tapping further selects through it
  }

  const handleBook = (): void => {
    if (!selectedStart || !canBook) return
    const startISO = toLocalISO(selectedStart.start)
    if (isPackage) {
      const result = bookPackageLessons(studentId, course.id, startISO, autoLesson, selCount)
      if (result.ok) {
        showToast(
          'success',
          t('student.booking.packageConfirmed', { count: selCount, n: autoLesson + 1, total: formatPrice(selectedTotal) }),
        )
        setSelectedStart(null)
      } else {
        showToast('error', result.error === 'conflict' ? t('student.booking.slotTaken') : t('student.booking.closedDay'))
      }
      return
    }
    const result = bookAppointment(studentId, course.id, startISO)
    if (result.ok) {
      showToast('success', t('student.booking.bookedOk'))
      setSelectedStart(null)
    } else {
      showToast('error', result.error === 'conflict' ? t('student.booking.slotTaken') : t('student.booking.closedDay'))
    }
  }

  return (
    <div className="course-booking">
      {/* Instructor break notice — links the break setting to available times */}
      {(state.instructor.breakMin ?? 0) > 0 ? (
        <div className="course-booking__break">
          <Coffee size={15} />
          <span>{t('student.booking.breakInfo', { break: state.instructor.breakMin })}</span>
        </div>
      ) : null}
      {!purchased ? (
        <div className="course-booking__locked">
          <p>{t('payment.notPurchased')}</p>
        </div>
      ) : (
        <>
          {/* TOP: per-student sequential lesson progress — tap to select 1 or 2 consecutive */}
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
          <p className="course-booking__hint">{t('student.booking.maxTwoHint')}</p>
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

      <WeekCalendar
        weekStart={weekStart}
        state={state}
        mode="availability"
        singleDay={selectedDate}
        courseDurationMin={duration}
        studentId={studentId}
        myStudentId={studentId}
        selectedSlotId={selectedStart ? slotId(selectedStart) : undefined}
        onSelectSlot={(slot) => setSelectedStart(slot)}
      />

      {/* Confirm footer */}
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
        <button type="button" className="student-btn student-btn-primary" disabled={!canBook} onClick={handleBook}>
          {isPackage
            ? t('student.booking.packageConfirm', { count: selCount, total: formatPrice(selectedTotal) })
            : t('student.booking.confirm')}
        </button>
      </div>
        </>
      )}
    </div>
  )
}
