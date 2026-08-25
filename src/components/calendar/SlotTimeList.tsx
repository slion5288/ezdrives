// ============================================================================
// EZDRIVES — SlotTimeList (shell-owned) — iOS Calendar "list" view
// A single day rendered as a vertical list of VALID lesson start times
// (break-aware, whole-hour lessons). Left time column, green 3px bar,
// "Available" label. Used e.g. for the student dashboard "Today" strip.
// ============================================================================

import type { AppState, Slot } from '../../data/store'
import { getLessonStarts } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { hourLabel } from './WeekCalendar'
import './calendar.css'

export interface SlotTimeListProps {
  /** The day whose available starts are listed. */
  date: Date
  state: AppState
  /** Lesson duration (whole hours). Defaults to 60. */
  durationMin?: number
  /** Called with an available start. */
  onSelectSlot: (slot: Slot) => void
}

export function SlotTimeList({ date, state, durationMin = 60, onSelectSlot }: SlotTimeListProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const starts = getLessonStarts(date, state, durationMin)

  if (starts.length === 0) {
    return <div className="ios-list ios-list--empty">{t('calendar.empty.title')}</div>
  }

  return (
    <div className="ios-list">
      {starts.map((start) => (
        <button
          key={start.getTime()}
          type="button"
          className="ios-list__item ios-list__item--clickable"
          onClick={() => onSelectSlot({ start, end: new Date(start.getTime() + durationMin * 60000), available: true })}
        >
          <span className="ios-list__time">{hourLabel(start, locale)}</span>
          <span className="ios-list__bar ios-list__bar--avail" />
          <span className="ios-list__body">
            <span className="ios-list__title">{t('student.booking.available')}</span>
            <span className="ios-list__sub">{t('courses.duration', { duration: durationMin })}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
