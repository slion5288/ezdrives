// ============================================================================
// EZDRIVES — Instructor SchedulePage (instructor-owned)
// WeekCalendar + MiniCalendar; appointment detail modal with reschedule
// (precise time picker + conflict check) and cancel (confirm); batch mode
// with per-appointment checkboxes and batchReschedule; CSV export.
// ============================================================================

import { useEffect, useState } from 'react'
import type { AppState, Appointment } from '../../data/store'
import { cancelAppointment, lessonLabel, rescheduleAppointment } from '../../data/store'
import {
  addDays,
  addMinutes,
  dateKey,
  formatDateEn,
  formatDateZh,
  formatHM,
  fromLocalISO,
  getEffectiveInterval,
  parseDateKey,
  toLocalISO,
} from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { DayStrip } from '../../components/calendar/DayStrip'
import { WeekCalendar } from '../../components/calendar/WeekCalendar'
import { Badge, ConfirmDialog, Modal } from './ui'
import { useToast } from './toast'
import { appointmentsToCSV, downloadCSV } from '../../utils/csv'
import type { AppointmentCSVRow } from '../../utils/csv'
import { courseById, fmtMin, isLiveAppointment, overlappingIds, startOfWeek, statusLabel, studentById, weekDates } from './helpers'

// --- Precise time picker (single reschedule + batch move) -----------------

function TimePickerModal({
  title,
  body,
  state,
  windowMin,
  exceptIds,
  initialDate,
  dateOnly,
  onClose,
  onConfirm,
}: {
  title: string
  body?: string
  state: AppState
  windowMin: number
  exceptIds: string[]
  initialDate?: string
  /** Batch mode: pick a DATE only — every selected lesson keeps its own time. */
  dateOnly?: boolean
  onClose: () => void
  onConfirm: (startISO: string) => void
}): JSX.Element {
  const t = useT()
  const [date, setDate] = useState<string>(() => initialDate ?? dateKey(addDays(new Date(), 1)))
  const [time, setTime] = useState<string>('09:00')

  const day = parseDateKey(date)
  const interval = getEffectiveInterval(day, state.weeklyRules, state.exceptions)
  const nowMs = Date.now()
  const br = Math.max(0, state.instructor.breakMin ?? 0) * 60000

  /**
   * Candidate start minutes (15-min granularity — break-aware starts like
   * 10:15 are valid) that are FREE: not overlapping another live appointment
   * (or its post-lesson break) and not colliding with the other appointments
   * being moved (exceptIds).
   */
  const futureMinutes: number[] = []
  if (interval) {
    const except = new Set(exceptIds)
    const exceptAppts = state.appointments.filter((a) => except.has(a.id))
    for (let m = interval.startMin; m + windowMin <= interval.endMin; m += 15) {
      const s = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60, 0).getTime()
      if (s <= nowMs) continue
      const e = s + windowMin * 60000
      let blocked = false
      for (const a of state.appointments) {
        if (a.status !== 'confirmed' && a.status !== 'pending') continue
        const aS = fromLocalISO(a.start).getTime()
        const aE = fromLocalISO(a.end).getTime()
        if (except.has(a.id)) {
          // Moving appointments must not land on top of each other.
          if (s < aE && e > aS) {
            blocked = true
            break
          }
          continue
        }
        // Other appointments: same student may chain back-to-back (no break);
        // different students must respect the instructor's break.
        const sameStudent = exceptAppts.some((x) => x.studentId === a.studentId)
        const effEnd = sameStudent ? aE : aE + br
        if (s < effEnd && e > aS) {
          blocked = true
          break
        }
      }
      if (!blocked) futureMinutes.push(m)
    }
  }

  useEffect(() => {
    const next = futureMinutes[0]
    if (next !== undefined) setTime(fmtMin(next))
    else setTime('09:00')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, state.weeklyRules, state.exceptions])

  const startISO = `${date}T${time}:00`
  const endISO = toLocalISO(addMinutes(fromLocalISO(startISO), windowMin))
  const conflictIds = overlappingIds(state, startISO, endISO, exceptIds)
  const hasConflict = conflictIds.length > 0
  const canConfirm = dateOnly ? date !== '' : !hasConflict && futureMinutes.length > 0

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ins-btn ins-btn--secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="ins-btn ins-btn--primary" disabled={!canConfirm} onClick={() => onConfirm(dateOnly ? `${date}T00:00:00` : startISO)}>
            {t('common.confirm')}
          </button>
        </>
      }
    >
      {body ? <p className="ins-confirm-body">{body}</p> : null}
      <div className="ins-field">
        <label className="ins-field-label" htmlFor="ins-picker-date">
          {t('instructor.workinghours.date')}
        </label>
        <input
          id="ins-picker-date"
          type="date"
          className="ins-input"
          value={date}
          min={dateKey(new Date())}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {!dateOnly ? (
        <div className="ins-field">
          <label className="ins-field-label" htmlFor="ins-picker-time">
            {t('instructor.schedule.pickNewTime')}
          </label>
          <select id="ins-picker-time" className="ins-input" value={time} disabled={futureMinutes.length === 0} onChange={(e) => setTime(e.target.value)}>
            {futureMinutes.map((m) => (
              <option key={m} value={fmtMin(m)}>
                {fmtMin(m)}
              </option>
            ))}
          </select>
          {futureMinutes.length === 0 ? <p className="ins-field-hint">{t('calendar.dayClosed')}</p> : null}
          {hasConflict ? <p className="ins-field-error">{t('student.booking.slotTaken')}</p> : null}
        </div>
      ) : null}
    </Modal>
  )
}

// --- Schedule page --------------------------------------------------------

export default function SchedulePage({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [view, setView] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [detail, setDetail] = useState<Appointment | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const dates = weekDates(weekStart)
  const weekApps = state.appointments
    .filter((a) => isLiveAppointment(a) && dates.includes(dateKey(fromLocalISO(a.start))))
    .sort((a, b) => a.start.localeCompare(b.start))

  const weekEnd = addDays(weekStart, 6)
  const rangeLabel = `${locale === 'zh' ? formatDateZh(weekStart) : formatDateEn(weekStart)} – ${
    locale === 'zh' ? formatDateZh(weekEnd) : formatDateEn(weekEnd)
  }`

  const toggleSelected = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllWeek = (): void => setSelected(new Set(weekApps.map((a) => a.id)))

  const handleExport = (): void => {
    const rows: AppointmentCSVRow[] = [...state.appointments]
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((a) => {
        const start = fromLocalISO(a.start)
        const student = studentById(state, a.studentId)
        const course = courseById(state, a.courseId)
        const courseName = course
          ? `${locale === 'zh' ? course.name.zh : course.name.en}${course.type === 'package' && a.lessonIndex !== undefined ? lessonLabel(course, a.lessonIndex, locale) : ''}`
          : a.courseId
        return {
          date: dateKey(start),
          start: formatHM(start),
          end: formatHM(fromLocalISO(a.end)),
          student: student ? student.name : a.studentId,
          phone: student ? student.phone : '',
          course: courseName,
          price: a.price ?? (course ? course.price : 0),
          status: a.status,
        }
      })
    downloadCSV(`appointments-${dateKey(new Date())}.csv`, appointmentsToCSV(rows))
    toast({ tone: 'success', title: t('instructor.schedule.exportCsv') })
  }

  const detailCourse = detail ? courseById(state, detail.courseId) : undefined
  const detailStudent = detail ? studentById(state, detail.studentId) : undefined

  const confirmReschedule = async (startISO: string): Promise<void> => {
    if (!detail) return
    const result = await rescheduleAppointment(detail.id, startISO)
    if (result.ok) {
      toast({ tone: 'success', title: t('common.toast.saved') })
      setShowReschedule(false)
      setDetail(null)
    } else {
      const message =
        result.error === 'conflict'
          ? t('student.booking.slotTaken')
          : result.error === 'closed'
            ? t('calendar.dayClosed')
            : result.error === 'past'
              ? t('student.booking.past')
              : t('common.toast.error')
      toast({ tone: 'error', title: message })
    }
  }

  const confirmCancel = async (): Promise<void> => {
    if (!detail) return
    const result = await cancelAppointment(detail.id)
    if (result.ok) {
      toast({ tone: 'success', title: t('common.toast.deleted') })
      setShowCancel(false)
      setDetail(null)
    } else {
      toast({ tone: 'error', title: result.error === 'past' ? t('student.booking.past') : t('common.toast.error') })
    }
  }

  /** Batch move: all selected lessons go to the same DATE, each keeping its own start time. */
  const confirmBatch = async (targetISO: string): Promise<void> => {
    const targetDate = dateKey(fromLocalISO(targetISO))
    const moved: string[] = []
    const failed: { id: string; error: string }[] = []
    for (const id of [...selected]) {
      const appt = state.appointments.find((a) => a.id === id)
      if (!appt) {
        failed.push({ id, error: 'not found' })
        continue
      }
      const orig = fromLocalISO(appt.start)
      const hh = String(orig.getHours()).padStart(2, '0')
      const mm = String(orig.getMinutes()).padStart(2, '0')
      const newStart = `${targetDate}T${hh}:${mm}:00`
      const result = await rescheduleAppointment(id, newStart)
      if (result.ok) moved.push(id)
      else failed.push({ id, error: result.error })
    }
    if (moved.length > 0) toast({ tone: 'success', title: t('instructor.schedule.moved', { count: moved.length }) })
    if (failed.length > 0) toast({ tone: 'error', title: t('instructor.schedule.failed', { count: failed.length }) })
    setShowBatch(false)
    setSelected(new Set())
    setBatchMode(false)
  }

  return (
    <div className="ins-schedule">
      <div className="ins-toolbar">
        <div className="ins-toolbar-group">
          <button type="button" className="ins-icon-btn" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label={t('calendar.week')}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="ins-icon-btn" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label={t('calendar.week')}>
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="ins-btn ins-btn--secondary ins-btn--sm"
            onClick={() => {
              setWeekStart(startOfWeek(new Date()))
              setSelectedDate(new Date())
            }}
          >
            {t('calendar.today')}
          </button>
          <span className="ins-toolbar-range tabular-nums">{rangeLabel}</span>
        </div>
        <div className="ins-toolbar-group">
          <div className="ins-view-toggle" role="tablist" aria-label={t('calendar.day')}>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'day'}
              className={`ins-view-toggle-btn${view === 'day' ? ' is-active' : ''}`}
              onClick={() => setView('day')}
            >
              {t('calendar.day')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'week'}
              className={`ins-view-toggle-btn${view === 'week' ? ' is-active' : ''}`}
              onClick={() => setView('week')}
            >
              {t('calendar.week')}
            </button>
          </div>
          {batchMode ? (
            <>
              <span className="ins-toolbar-chip">{t('instructor.schedule.selected', { count: selected.size })}</span>
              <button type="button" className="ins-btn ins-btn--ghost ins-btn--sm" onClick={selectAllWeek}>
                {t('instructor.schedule.selectAll')}
              </button>
              <button
                type="button"
                className="ins-btn ins-btn--primary ins-btn--sm"
                disabled={selected.size === 0}
                onClick={() => setShowBatch(true)}
              >
                {t('instructor.schedule.batchMove')}
              </button>
              <button
                type="button"
                className="ins-icon-btn"
                aria-label={t('common.close')}
                onClick={() => {
                  setBatchMode(false)
                  setSelected(new Set())
                }}
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <button type="button" className="ins-btn ins-btn--secondary ins-btn--sm" onClick={() => setBatchMode(true)}>
              {t('instructor.schedule.batchMove')}
            </button>
          )}
          <button type="button" className="ins-btn ins-btn--secondary ins-btn--sm" onClick={handleExport}>
            <Download size={14} /> {t('instructor.schedule.exportCsv')}
          </button>
        </div>
      </div>

      <div className="ins-schedule-top">
        <section className="ins-panel ins-panel--strip">
          <DayStrip
            weekStart={weekStart}
            selectedDate={selectedDate}
            onSelect={(d) => {
              setSelectedDate(d)
              setWeekStart(startOfWeek(d))
            }}
            onPrevWeek={() => {
              setWeekStart((w) => addDays(w, -7))
              setSelectedDate((d) => addDays(d, -7))
            }}
            onNextWeek={() => {
              setWeekStart((w) => addDays(w, 7))
              setSelectedDate((d) => addDays(d, 7))
            }}
            onToday={() => {
              setWeekStart(startOfWeek(new Date()))
              setSelectedDate(new Date())
            }}
          />
        </section>
      </div>

      <div className="ins-schedule-layout">
        <section className="ins-panel ins-panel--calendar">
          <div className="ins-panel-head">
            <h2 className="ins-panel-title">
              {view === 'day' ? t('instructor.schedule.title') : t('calendar.week')}
            </h2>
          </div>
          <WeekCalendar
            weekStart={weekStart}
            state={state}
            mode="schedule"
            showStudentName
            singleDay={view === 'day' ? selectedDate : null}
            onSelectAppointment={setDetail}
            batchMode={batchMode}
            selectedIds={selected}
            onToggleSelected={toggleSelected}
          />
        </section>
      </div>

      {/* Legend — placed below the calendar so the day strip + schedule stay together */}
      <section className="ins-panel ins-panel--legend">
        <div className="ins-panel-head">
          <h2 className="ins-panel-title">{t('instructor.schedule.status')}</h2>
        </div>
        <div className="ins-legend">
          <span className="ins-legend-item">
            <i className="ins-legend-swatch is-booked" /> {t('student.booking.booked')}
          </span>
          <span className="ins-legend-item">
            <i className="ins-legend-swatch is-closed" /> {t('calendar.dayClosed')}
          </span>
          <span className="ins-legend-item">
            <i className="ins-legend-swatch is-past" /> {t('student.booking.past')}
          </span>
        </div>
      </section>

      {/* Detail modal */}
      {detail ? (
        <Modal
          title={`${detailStudent ? detailStudent.name : detail.studentId} · ${
            detailCourse ? (locale === 'zh' ? detailCourse.name.zh : detailCourse.name.en) : detail.courseId
          }`}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button type="button" className="ins-btn ins-btn--danger-ghost" onClick={() => setShowCancel(true)}>
                {t('student.dashboard.cancel')}
              </button>
              <button type="button" className="ins-btn ins-btn--primary" onClick={() => setShowReschedule(true)}>
                {t('instructor.schedule.reschedule')}
              </button>
            </>
          }
        >
          <div className="ins-detail">
            <div className="ins-detail-row">
              <span className="ins-detail-label">{t('instructor.schedule.student')}</span>
              <span className="ins-detail-value">
                {detailStudent ? detailStudent.name : detail.studentId}
                {detailStudent ? (
                  <span className="ins-detail-phone tabular-nums">
                    <a href={`tel:${detailStudent.phone.replace(/\s/g, '')}`}>{detailStudent.phone}</a>
                    <span className="ins-detail-phone-actions">
                      <a href={`sms:${detailStudent.phone.replace(/\s/g, '')}`} className="ins-detail-action">
                        {t('instructor.schedule.sms')}
                      </a>
                    </span>
                  </span>
                ) : null}
              </span>
            </div>
            {detailStudent ? (
              <div className="ins-detail-row">
                <span className="ins-detail-label">{t('instructor.schedule.address')}</span>
                <span className="ins-detail-value">
                  {detailStudent.address ? (
                    <a
                      className="ins-detail-action"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailStudent.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {detailStudent.address} <ArrowUpRight size={13} />
                    </a>
                  ) : (
                    <span className="ins-detail-sub">{t('student.profile.noAddress')}</span>
                  )}
                </span>
              </div>
            ) : null}
            <div className="ins-detail-row">
              <span className="ins-detail-label">{t('instructor.schedule.course')}</span>
              <span className="ins-detail-value">
                {detailCourse ? (locale === 'zh' ? detailCourse.name.zh : detailCourse.name.en) : detail.courseId}
                {detail.lessonIndex !== undefined && detailCourse ? (
                  <span className="ins-detail-sub tabular-nums">{lessonLabel(detailCourse, detail.lessonIndex, locale)}</span>
                ) : null}
                {detailCourse ? (
                  <span className="ins-detail-sub tabular-nums">
                    {`$${detail.price ?? detailCourse.price}`} ·{' '}
                    {detailCourse.type === 'package'
                      ? t('courses.duration', { duration: 60 })
                      : t(`instructor.courses.duration${detailCourse.durationMin}`)}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="ins-detail-row">
              <span className="ins-detail-label">{t('instructor.schedule.time')}</span>
              <span className="ins-detail-value">
                <span className="tabular-nums">
                  {locale === 'zh' ? formatDateZh(fromLocalISO(detail.start)) : formatDateEn(fromLocalISO(detail.start))} ·{' '}
                  {formatHM(fromLocalISO(detail.start))}–{formatHM(fromLocalISO(detail.end))}
                </span>
              </span>
            </div>
            <div className="ins-detail-row">
              <span className="ins-detail-label">{t('instructor.schedule.status')}</span>
              <span className="ins-detail-value">
                <Badge tone={detail.status === 'confirmed' ? 'success' : 'warning'}>{statusLabel(detail.status, t)}</Badge>
              </span>
            </div>
          </div>
        </Modal>
      ) : null}

      {showReschedule && detail ? (
        <TimePickerModal
          title={t('instructor.schedule.rescheduleTitle')}
          body={t('instructor.schedule.rescheduleBody', {
            student: detailStudent ? detailStudent.name : detail.studentId,
            course: detailCourse ? (locale === 'zh' ? detailCourse.name.zh : detailCourse.name.en) : detail.courseId,
          })}
          state={state}
          windowMin={detailCourse ? detailCourse.durationMin : 60}
          exceptIds={[detail.id]}
          initialDate={dateKey(fromLocalISO(detail.start))}
          onClose={() => setShowReschedule(false)}
          onConfirm={confirmReschedule}
        />
      ) : null}

      {showBatch ? (
        <TimePickerModal
          title={t('instructor.schedule.batchMove')}
          body={t('instructor.schedule.moveHint', { count: selected.size })}
          state={state}
          windowMin={60}
          exceptIds={[...selected]}
          dateOnly
          onClose={() => setShowBatch(false)}
          onConfirm={confirmBatch}
        />
      ) : null}

      {showCancel && detail ? (
        <ConfirmDialog
          title={t('student.dashboard.cancelConfirmTitle')}
          body={t('student.dashboard.cancelConfirmBody')}
          confirmLabel={t('student.dashboard.cancel')}
          danger
          onConfirm={confirmCancel}
          onClose={() => setShowCancel(false)}
        />
      ) : null}

      {weekApps.length === 0 && !batchMode ? (
        <div className="ins-schedule-hint">
          <CalendarDays size={16} />
          <span>{t('instructor.schedule.empty')}</span>
        </div>
      ) : null}
    </div>
  )
}
