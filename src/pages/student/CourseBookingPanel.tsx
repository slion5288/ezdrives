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
import { bookAppointment, bookPackageLessons, courseTypeOf, getSession, isCoursePurchased, lessonStatus, packageProgress, uploadCertificateDocs, useAppState } from '../../data/store'
import type { Course, Slot } from '../../data/store'
import { formatHM, fromLocalISO, toLocalISO } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import type { Appointment } from '../../data/store'
import { MapPin, Phone, X } from 'lucide-react'
import { DayStrip } from '../../components/calendar/DayStrip'
import { slotId, WeekCalendar } from '../../components/calendar/WeekCalendar'
import { lessonLabel } from '../../data/store'
import { formatDateLabel, formatPrice, mondayOf } from './studentFormat'
import { useToast } from '../../components/shared'
import { Button } from '../../components/shared/Button'
import { ModalFrame } from './StudentShared'
import { downloadICS } from '../../utils/ics'
import type { IcsEvent } from '../../utils/ics'

const ICS_FILENAME = 'ezdrives-lessons.ics'

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
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null)
  /** Appointments just created — shows the "add to calendar" prompt. */
  const [justBooked, setJustBooked] = useState<Appointment[] | null>(null)

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
  const canBook = selectedStart !== null && (!isPackage || lessonStatuses.some((s) => s === 'free'))

  const handleTapLesson = (offset: number): void => {
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
      case 'not_purchased':
        return t('payment.notPurchased')
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

  return (
    <div className="course-booking">
      {/* §39/§46: Full Course Certificate — document upload workflow, no driving calendar */}
      {courseTypeOf(course) === 'FULL_COURSE_CERTIFICATE' ? (
        <CertificateUploadCard course={course} studentId={studentId} t={t} />
      ) : (
      <>
      {/* Instructor break notice — links the break setting to available times */}
      {(state.instructor.breakMin ?? 0) > 0 ? (
        <div className="course-booking__break">
          <Coffee size={15} aria-hidden="true" />
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
        onSelectAppointment={(appt) => setDetailAppt(appt)}
      />

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
                  {locale === 'zh' ? course.name.zh : course.name.en}
                  {detailAppt.lessonIndex !== undefined ? <span className="student-detail-sub">{lessonLabel(course, detailAppt.lessonIndex, locale)}</span> : null}
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
          </div>
        </div>
      ) : null}

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
        <Button variant="primary" disabled={!canBook} onClick={handleBook}>
          {isPackage
            ? t('student.booking.packageConfirm', { count: selCount, total: formatPrice(selectedTotal) })
            : t('student.booking.confirm')}
        </Button>
      </div>
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
