// ============================================================================
// EZDRIVES — StudentBookingModal (student-owned local component)
// Shown after clicking an available start on the calendar. For SINGLE courses
// it just confirms. For PACKAGE courses (套餐) it shows the 10 lessons with
// status: done lessons get a ✓, upcoming-booked are tagged, free lessons are
// selectable; the student picks the FIRST lesson and how many consecutive
// lessons to book (1..N) at the chosen start time.
// ============================================================================

import { Calendar, Check, XCircle } from 'lucide-react'
import type { Course, Slot } from '../../data/store'
import { formatHM } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { ModalFrame } from './StudentShared'
import { formatDateLabel, formatPrice } from './studentFormat'

export type LessonStatus = 'free' | 'booked' | 'done'

interface StudentBookingModalProps {
  open: boolean
  slot: Slot | null
  course: Course | undefined
  /** Package: per-lesson status for this student (10 entries). */
  lessonStatuses?: LessonStatus[]
  selectedLesson: number
  count: number
  maxCount: number
  error: 'conflict' | 'closed' | 'past' | null
  success: boolean
  onLessonChange: (i: number) => void
  onCountChange: (n: number) => void
  onConfirm: () => void
  onClose: () => void
}

export function StudentBookingModal({
  open,
  slot,
  course,
  lessonStatuses,
  selectedLesson,
  count,
  maxCount,
  error,
  success,
  onLessonChange,
  onCountChange,
  onConfirm,
  onClose,
}: StudentBookingModalProps): JSX.Element | null {
  const t = useT()
  const locale = useLocale()

  if (!slot || !course) return null

  const isPackage = course.type === 'package'
  const totalPrice = isPackage
    ? (lessonStatuses ?? []).reduce((sum, st, i) => (i >= selectedLesson && i < selectedLesson + count && st === 'free' ? sum + (course.lessons?.[i]?.price ?? course.price) : sum), 0)
    : course.price
  const canConfirm = !isPackage || (count >= 1 && count <= maxCount && (lessonStatuses ?? [])[selectedLesson] === 'free')

  const errorTitle =
    error === 'conflict' ? t('student.booking.slotTaken') : error === 'closed' ? t('student.booking.closedDay') : t('student.booking.past')
  const errorBody = error === 'conflict' ? t('student.booking.slotTakenBody') : error === 'closed' ? t('student.booking.noSlotsBody') : null

  return (
    <ModalFrame
      open={open}
      title={isPackage ? t('student.booking.packageTitle') : t('student.booking.confirmDialogTitle')}
      onClose={onClose}
      footer={
        success ? null : (
          <>
            <button type="button" className="student-btn student-btn-ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="button" className="student-btn student-btn-primary" disabled={!canConfirm} onClick={onConfirm}>
              {isPackage && count > 1
                ? t('student.booking.packageConfirm', { count, total: formatPrice(totalPrice) })
                : t('student.booking.confirm')}
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="student-success-state">
          <span className="student-check-circle">
            <Check size={24} strokeWidth={3} />
          </span>
          <h4>{t('student.booking.successTitle')}</h4>
          <p>
            {t('student.booking.successBody', {
              course: `${course.name[locale]}${isPackage ? ` · ${t('courses.lesson', { n: selectedLesson + 1 })}` : ''}`,
              date: formatDateLabel(locale, slot.start),
              time: formatHM(slot.start),
            })}
          </p>
        </div>
      ) : (
        <>
          <div className="student-slot-line">
            <Calendar size={16} />
            <span>
              {formatDateLabel(locale, slot.start)} · {formatHM(slot.start)}
              {isPackage && count > 1 ? ` – ${formatHM(new Date(slot.start.getTime() + count * 60 * 60000))}` : ''}
            </span>
          </div>

          {isPackage ? (
            <div className="student-package">
              <p className="student-field-label">{t('student.booking.packageLessons')}</p>
              <div className="student-package-list">
                {(course.lessons ?? []).map((lesson, i) => {
                  const status = lessonStatuses?.[i] ?? 'free'
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={status !== 'free'}
                      className={`student-package-lesson${selectedLesson === i ? ' checked' : ''}${status !== 'free' ? ` is-${status}` : ''}`}
                      onClick={() => onLessonChange(i)}
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
                        ) : (
                          <span className="student-package-price">{formatPrice(lesson.price)}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="student-package-count">
                <span className="student-package-count-label">{t('student.booking.packageCount')}</span>
                <div className="student-package-count-opts">
                  {Array.from({ length: maxCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`student-package-count-btn${count === n ? ' checked' : ''}`}
                      onClick={() => onCountChange(n)}
                    >
                      {t('courses.lessons', { count: n })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="student-package-total">
                <span>{t('student.booking.total')}</span>
                <span className="tabular-nums">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          ) : (
            <div className="student-single-confirm">
              <p className="student-single-confirm-course">
                {course.name[locale]} · {t('courses.duration', { duration: course.durationMin })}
              </p>
              <p className="student-single-confirm-price">
                {formatPrice(course.price)}
                <span className="text-muted"> · {t('student.booking.perLesson')}</span>
              </p>
            </div>
          )}

          {error && (
            <div className="student-error-banner" role="alert">
              <XCircle size={16} />
              <div>
                <p className="student-error-title">{errorTitle}</p>
                {errorBody && <p className="student-error-body">{errorBody}</p>}
              </div>
            </div>
          )}
        </>
      )}
    </ModalFrame>
  )
}
