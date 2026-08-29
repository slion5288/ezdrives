// ============================================================================
// EZDRIVES — WeekCalendar (shell-owned) — iOS Calendar style
// Week (day-columns) timeline view: sticky day header (today in red), hour
// gutter with AM/PM (en) or 24h (zh) labels, 30-min grid lines, available
// slots as green blocks, live appointments as iOS-style event cards (colored
// by course / green for the student's own booking / red for taken), closed &
// past hours as hatched washes, and a red "now" line with a gutter dot that
// updates every minute.
// Two modes: 'availability' (student booking — green blocks clickable) and
// 'schedule' (instructor — event cards clickable, batch checkboxes optional).
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import type { AppState, Appointment, Slot } from '../../data/store'
import { lessonLabel } from '../../data/store'
import { addDays, dateKey, formatDateEn, formatDateZh, formatHM, fromLocalISO, generateSlots, getLessonStarts, getWeekSlots } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import type { Locale } from '../../i18n'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import './calendar.css'

export interface WeekCalendarProps {
  /** First displayed day of the week (typically a Monday). */
  weekStart: Date
  state: AppState
  /** 'availability' = student booking (green start blocks clickable); 'schedule' = instructor (event cards only, no availability shown). */
  mode?: 'availability' | 'schedule'
  /** Availability mode: lesson duration (whole hours) used to compute valid start times. */
  courseDurationMin?: number
  /** Availability mode: the student making the booking (enables back-to-back without break). */
  studentId?: string
  /** Called only for available starts (availability mode). */
  onSelectSlot?: (slot: Slot) => void
  /** Called when an appointment card is clicked (schedule mode). */
  onSelectAppointment?: (appt: Appointment) => void
  /** Id from slotId() — the highlighted available block. */
  selectedSlotId?: string
  /** Student booking mode: mark this student's own bookings as "mine". */
  myStudentId?: string
  /** § unified student view: color the student's own event cards per course
   *  (multi-course calendar) instead of the default "mine" green. */
  colorMineByCourse?: boolean
  /** Instructor mode: show the student's name on event cards. */
  showStudentName?: boolean
  /** Batch mode: show per-appointment checkboxes (schedule mode). */
  batchMode?: boolean
  selectedIds?: ReadonlySet<string>
  onToggleSelected?: (id: string) => void
  /** Optional prev / next / today navigation header. */
  nav?: { onPrev: () => void; onNext: () => void; onToday: () => void }
  /** Single-day mode: render only this day, full width (mobile-friendly). */
  singleDay?: Date | null
  /** Smaller row height, for summary panels. */
  compact?: boolean
}

/** Stable slot id: 'YYYY-MM-DD@HH:mm'. Used for selection highlighting. */
export function slotId(slot: Slot): string {
  return `${dateKey(slot.start)}@${formatHM(slot.start)}`
}

/**
 * iOS-style hour label: '9 AM' / '12 PM' for English, 24h '09:00' for Chinese.
 */
export function hourLabel(d: Date, locale: Locale): string {
  if (locale === 'zh') return formatHM(d)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const minuteOf = (d: Date): number => d.getHours() * 60 + d.getMinutes()

/** Course identity palette — each course gets a stable iOS-calendar color. */
const COURSE_COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#10B981', '#F97316', '#EC4899']

function courseColor(state: AppState, courseId: string): string {
  const idx = state.courses.findIndex((c) => c.id === courseId)
  return COURSE_COLORS[idx >= 0 ? idx % COURSE_COLORS.length : 0]
}
/** Export for the multi-course student panel (chip dots match card colors). */
export { courseColor }

/** Timeline window covering every slot and appointment of the week, ±1h, clamped 6:00–22:00. */
function weekRange(weekSlots: Record<string, Slot[]>, appts: Appointment[]): { start: number; end: number } {
  let min = Infinity
  let max = -Infinity
  for (const slots of Object.values(weekSlots)) {
    for (const s of slots) {
      const sm = minuteOf(s.start)
      const em = minuteOf(s.end)
      if (sm < min) min = sm
      if (em > max) max = em
    }
  }
  for (const a of appts) {
    const sm = minuteOf(fromLocalISO(a.start))
    const em = minuteOf(fromLocalISO(a.end))
    if (sm < min) min = sm
    if (em > max) max = em
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { start: 9 * 60, end: 18 * 60 }
  return {
    start: Math.max(6 * 60, Math.floor(min / 60) * 60 - 60),
    end: Math.min(22 * 60, Math.ceil(max / 60) * 60 + 60),
  }
}

interface Wash {
  top: number
  height: number
  kind: 'closed' | 'override' | 'past'
}

/** Merge contiguous closed / override / past units into single wash zones. */
function washesFor(slots: Slot[], rangeStart: number, minH: number): Wash[] {
  const out: Wash[] = []
  let cur: Wash | null = null
  for (const s of slots) {
    if (s.available || s.closedReason === 'booked') {
      cur = null
      continue
    }
    const kind = s.closedReason as Wash['kind']
    const top = (minuteOf(s.start) - rangeStart) * minH
    if (cur && cur.kind === kind && Math.abs(cur.top + cur.height - top) < 1) {
      cur.height += 30 * minH
    } else {
      cur = { top, height: 30 * minH, kind }
      out.push(cur)
    }
  }
  return out
}

interface PlacedEvent {
  appt: Appointment
  top: number
  height: number
  leftPct: number
  widthPct: number
}

/** Greedy lane layout so overlapping appointments sit side-by-side (iOS-like). */
function layoutEvents(appts: Appointment[], rangeStart: number, minH: number): PlacedEvent[] {
  const sorted = [...appts].sort((a, b) => a.start.localeCompare(b.start))
  const laneEnds: number[] = []
  const laneIdx = new Map<string, number>()
  for (const a of sorted) {
    const s = fromLocalISO(a.start).getTime()
    const e = fromLocalISO(a.end).getTime()
    let lane = laneEnds.findIndex((le) => le <= s)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    laneEnds[lane] = e
    laneIdx.set(a.id, lane)
  }
  const laneCount = Math.max(1, laneEnds.length)
  return sorted.map((a) => {
    const s = fromLocalISO(a.start)
    const e = fromLocalISO(a.end)
    const top = (minuteOf(s) - rangeStart) * minH
    const height = Math.max(20, ((e.getTime() - s.getTime()) / 60000) * minH - 2)
    const lane = laneIdx.get(a.id) ?? 0
    return { appt: a, top, height, leftPct: (lane * 100) / laneCount, widthPct: 100 / laneCount }
  })
}

const liveAppointment = (a: Appointment): boolean => a.status === 'confirmed' || a.status === 'pending'

export function WeekCalendar({
  weekStart,
  state,
  mode = 'availability',
  courseDurationMin,
  studentId,
  onSelectSlot,
  onSelectAppointment,
  selectedSlotId,
  myStudentId,
  colorMineByCourse = false,
  showStudentName = false,
  batchMode = false,
  selectedIds,
  onToggleSelected,
  nav,
  singleDay,
  compact = false,
}: WeekCalendarProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const [now, setNow] = useState(() => new Date())

  // Refresh the red "now" line every minute.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(id)
  }, [])

  const minH = compact ? 0.55 : 0.8

  const days = useMemo(
    () => (singleDay ? [singleDay] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))),
    [weekStart, singleDay],
  )
  const dayKeys = useMemo(() => days.map((d) => dateKey(d)), [days])
  const weekSlots = useMemo(
    () => (singleDay ? { [dateKey(singleDay)]: generateSlots(singleDay, state) } : getWeekSlots(weekStart, state)),
    [weekStart, singleDay, state],
  )

  const weekAppts = useMemo(
    () =>
      state.appointments
        .filter((a) => liveAppointment(a) && dayKeys.includes(dateKey(fromLocalISO(a.start))))
        .sort((a, b) => a.start.localeCompare(b.start)),
    [state.appointments, dayKeys],
  )

  const range = useMemo(() => weekRange(weekSlots, weekAppts), [weekSlots, weekAppts])
  const bodyH = (range.end - range.start) * minH

  const studentName = (id: string): string => state.students.find((s) => s.id === id)?.name ?? id
  /** Course name + package lesson suffix, e.g. 'G2 路考强化（10 课时套餐）第 1 课时'. */
  const courseLabel = (courseId: string, lessonIndex?: number): string => {
    const c = state.courses.find((x) => x.id === courseId)
    return c ? `${c.name[locale]}${lessonLabel(c, lessonIndex, locale)}` : courseId
  }

  const todayKey = dateKey(new Date())
  const nowMin = minuteOf(now)
  const showNow = dayKeys.includes(todayKey) && nowMin >= range.start && nowMin < range.end
  const nowTop = (nowMin - range.start) * minH

  const hourMarks = useMemo(() => {
    const marks: number[] = []
    for (let m = range.start; m < range.end; m += 60) marks.push(m)
    return marks
  }, [range])

  const hasAnyContent = dayKeys.some((k) => (weekSlots[k] ?? []).length > 0) || weekAppts.length > 0

  const studentNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of state.students) map.set(s.id, s.name)
    return map
  }, [state.students])

  const rootStyle = { '--min-h': `${minH}px` } as CSSProperties

  if (!hasAnyContent) {
    return (
      <div className="ios-week">
        <div className="ios-week__empty">
          <p>{t('calendar.empty.title')}</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>{t('calendar.empty.body')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`ios-week${compact ? ' ios-week--compact' : ''}`} style={rootStyle}>
      {nav ? (
        <div className="ios-week__nav">
          <button type="button" className="ios-week__nav-btn" onClick={nav.onPrev} aria-label={t('calendar.week')}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="ios-week__nav-btn" onClick={nav.onNext} aria-label={t('calendar.week')}>
            <ChevronRight size={16} />
          </button>
          <span className="ios-week__range tabular-nums">
            {singleDay
              ? locale === 'zh'
                ? formatDateZh(singleDay)
                : formatDateEn(singleDay)
              : locale === 'zh'
                ? formatDateZh(weekStart)
                : formatDateEn(weekStart)}
            {singleDay ? '' : ` – ${locale === 'zh' ? formatDateZh(addDays(weekStart, 6)) : formatDateEn(addDays(weekStart, 6))}`}
          </span>
          <button type="button" className="ios-week__today-btn" onClick={nav.onToday}>
            {t('calendar.today')}
          </button>
        </div>
      ) : null}

      <div className="ios-week__scroller">
        <div className="ios-week__head">
          <div className="ios-week__corner" aria-hidden="true" />
          {days.map((day) => {
            const key = dateKey(day)
            const isToday = key === todayKey
            return (
              <div key={key} className={`ios-week__dayhead${isToday ? ' ios-week__dayhead--today' : ''}`}>
                <span className="ios-week__dow">{t(`calendar.weekday.${day.getDay()}`)}</span>
                <span className="ios-week__num">{day.getDate()}</span>
              </div>
            )
          })}
        </div>

        <div className="ios-week__body">
          <div className="ios-week__gutter" style={{ height: bodyH }}>
            {hourMarks.map((m) => (
              <span key={m} className="ios-week__hour" style={{ top: (m - range.start) * minH }}>
                {hourLabel(new Date(2020, 0, 1, Math.floor(m / 60), m % 60), locale)}
              </span>
            ))}
            {showNow ? <span className="ios-week__nowdot" style={{ top: nowTop }} /> : null}
          </div>

          <div className="ios-week__cols" style={{ height: bodyH }}>
            {days.map((day) => {
              const key = dateKey(day)
              const slots = weekSlots[key] ?? []
              const washes = washesFor(slots, range.start, minH)
              const dayApps = weekAppts.filter((a) => dateKey(fromLocalISO(a.start)) === key)
              const placed = layoutEvents(dayApps, range.start, minH)
              const dayClosed = state.exceptions.some((e) => e.date === key && e.closed)
              const pickable = mode === 'availability' && onSelectSlot !== undefined && courseDurationMin !== undefined

              // Visible break zones (课间休息): after a DIFFERENT student's lesson,
              // the instructor's configured break is shown as a grey strip — the
              // next bookable time starts after lesson + break (may be off the hour).
              const breakZones =
                mode === 'availability' && (state.instructor.breakMin ?? 0) > 0
                  ? dayApps
                      .filter((a) => a.studentId !== studentId && fromLocalISO(a.end).getTime() > now.getTime())
                      .map((a) => {
                        const endMin = minuteOf(fromLocalISO(a.end))
                        return {
                          key: `${a.id}-break`,
                          top: (endMin - range.start) * minH,
                          height: Math.max(8, (state.instructor.breakMin ?? 0) * minH),
                        }
                      })
                  : []

              /** Click on empty (available) timeline area → snap to the hour and book. */
              const handleTimelineClick = (e: ReactMouseEvent<HTMLDivElement>): void => {
                if (!pickable) return
                const rect = e.currentTarget.getBoundingClientRect()
                const minute = range.start + (e.clientY - rect.top) / minH
                const hour = Math.max(0, Math.floor(minute / 60))
                const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0)
                const valid = getLessonStarts(day, state, courseDurationMin as number, studentId).some(
                  (d) => d.getTime() === start.getTime(),
                )
                if (valid && onSelectSlot) {
                  onSelectSlot({
                    start,
                    end: new Date(start.getTime() + (courseDurationMin as number) * 60000),
                    available: true,
                  })
                }
              }

              return (
                <div
                  key={key}
                  className={`ios-week__col${pickable ? ' ios-week__col--pickable' : ''}`}
                  onClick={handleTimelineClick}
                >
                  {breakZones.map((z) => (
                    <div key={z.key} className="ios-week__break" style={{ top: z.top, height: z.height }}>
                      <span>{t('calendar.break')}</span>
                    </div>
                  ))}
                  {washes.map((w, i) => (
                    <div key={i} className={`ios-week__wash ios-week__wash--${w.kind}`} style={{ top: w.top, height: w.height }} />
                  ))}
                  {dayClosed ? <span className="ios-week__dayclosed">{t('calendar.dayClosed')}</span> : null}

                  {/* Selectable start-time boxes (可选时间方框) for the chosen course */}
                  {mode === 'availability' && courseDurationMin !== undefined
                    ? getLessonStarts(day, state, courseDurationMin, studentId).map((start) => {
                        const slot: Slot = {
                          start,
                          end: new Date(start.getTime() + courseDurationMin * 60000),
                          available: true,
                        }
                        const id = slotId(slot)
                        const top = (minuteOf(start) - range.start) * minH
                        const height = courseDurationMin * minH - 2
                        const selected = selectedSlotId === id
                        return onSelectSlot ? (
                          <button
                            key={id}
                            type="button"
                            className={`ios-week__block ios-week__block--start${selected ? ' ios-week__block--selected' : ''}`}
                            style={{ top, height }}
                            onClick={() => onSelectSlot(slot)}
                            title={`${hourLabel(start, locale)} · ${t('student.booking.available')}`}
                            aria-label={`${hourLabel(start, locale)} · ${t('student.booking.available')}`}
                          >
                            {height >= 22 ? hourLabel(start, locale) : ''}
                          </button>
                        ) : null
                      })
                    : null}

                  {placed.map((p) => {
                    const { appt } = p
                    const selected = selectedIds ? selectedIds.has(appt.id) : false
                    const isMine = myStudentId !== undefined && appt.studentId === myStudentId
                    const clickable =
                      (mode === 'schedule' || (mode === 'availability' && isMine)) && onSelectAppointment !== undefined
                    const student = state.students.find((s) => s.id === appt.studentId)
                    // Completed = confirmed/pending lesson that has already finished.
                    const done = fromLocalISO(appt.end).getTime() < now.getTime()
                    const evClass = [
                      'ios-week__event',
                      isMine ? 'ios-week__event--mine' : mode === 'availability' ? 'ios-week__event--other' : '',
                      done ? 'ios-week__event--done' : '',
                      appt.status === 'pending' ? 'ios-week__event--pending' : '',
                      clickable ? 'ios-week__event--clickable' : '',
                      batchMode && selected ? 'ios-week__event--checked' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                    const evStyle = {
                      top: p.top,
                      height: p.height,
                      left: `${p.leftPct}%`,
                      width: `calc(${p.widthPct}% - 4px)`,
                      '--ev-color':
                        mode === 'schedule' || colorMineByCourse ? courseColor(state, appt.courseId) : undefined,
                    } as CSSProperties
                    const title =
                      done
                        ? mode === 'schedule'
                          ? showStudentName
                            ? studentName(appt.studentId)
                            : courseLabel(appt.courseId, appt.lessonIndex)
                          : isMine
                            ? `✓ ${courseLabel(appt.courseId, appt.lessonIndex)}`
                            : t('student.booking.completed')
                        : mode === 'schedule'
                          ? showStudentName
                            ? studentName(appt.studentId)
                            : courseLabel(appt.courseId, appt.lessonIndex)
                          : isMine
                            ? courseLabel(appt.courseId, appt.lessonIndex)
                            : t('student.booking.slotTaken')
                    // Instructor blocks show the student's phone and address.
                    const sub = mode === 'schedule' ? (showStudentName ? (student?.phone ?? '') : courseLabel(appt.courseId, appt.lessonIndex)) : undefined
                    const sub2 = mode === 'schedule' && showStudentName ? student?.address : undefined
                    const time = hourLabel(fromLocalISO(appt.start), locale)
                    const tall = p.height >= 42
                    const cardTitle = `${studentNames.get(appt.studentId) ?? appt.studentId} · ${courseLabel(appt.courseId, appt.lessonIndex)}${
                      student ? ` · ${student.phone}${student.address ? ` · ${student.address}` : ''}` : ''
                    }`
                    return (
                      <div
                        key={appt.id}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        className={evClass}
                        style={evStyle}
                        onClick={clickable && onSelectAppointment ? () => onSelectAppointment(appt) : undefined}
                        onKeyDown={
                          clickable
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  if (onSelectAppointment) onSelectAppointment(appt)
                                }
                              }
                            : undefined
                        }
                        title={cardTitle}
                      >
                        {batchMode && onToggleSelected ? (
                          <span
                            className="ios-week__event-check"
                            role="checkbox"
                            aria-checked={selected}
                            tabIndex={-1}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleSelected(appt.id)
                            }}
                          >
                            {selected ? <Check size={11} strokeWidth={3.5} /> : null}
                          </span>
                        ) : null}
                        {tall ? <span className="ios-week__event-time">{time}</span> : null}
                        <span className="ios-week__event-title">{title}</span>
                        {tall && sub ? <span className="ios-week__event-sub">{sub}</span> : null}
                        {p.height >= 58 && sub2 ? <span className="ios-week__event-sub2">{sub2}</span> : null}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {showNow ? <div className="ios-week__nowline" style={{ top: nowTop }} aria-hidden="true" /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
