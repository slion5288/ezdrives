// ============================================================================
// EZDRIVES — MiniCalendar (shell-owned) — iOS Calendar month view
// Sunday-first grid with single-letter weekday header ('S M T W T F S' /
// '日 一 二 三 四 五 六'), red today ring, accent-filled selected circle,
// soft highlight for the active week, and indicator dots per day
// (green = availability, blue = lesson, red = day exception e.g. 调休).
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import type { AppState } from '../../data/store'
import { addDays, dateKey, fromLocalISO, startOfDay } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './calendar.css'

export interface MiniCalendarMarkers {
  /** Dates ('YYYY-MM-DD') that get a marker dot. */
  dates: ReadonlySet<string>
  tone?: 'danger' | 'warning'
}

export interface MiniCalendarProps {
  /** Currently selected date (its week is highlighted; same month is shown). */
  value: Date
  /** Called with the picked day — the parent converts it to a weekStart. */
  onChange: (date: Date) => void
  state: AppState
  /** Optional marker dots (e.g. days with a temporary schedule exception). */
  markers?: MiniCalendarMarkers
}

/** Monday of the week containing d. */
function mondayOf(d: Date): Date {
  const day = startOfDay(d)
  const dow = day.getDay()
  return addDays(day, dow === 0 ? -6 : 1 - dow)
}

const DOW_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DOW_ZH = ['日', '一', '二', '三', '四', '五', '六']

export function MiniCalendar({ value, onChange, state, markers }: MiniCalendarProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(value.getFullYear(), value.getMonth(), 1))

  useEffect(() => {
    setViewMonth(new Date(value.getFullYear(), value.getMonth(), 1))
  }, [value.getFullYear(), value.getMonth()])

  const viewYear = viewMonth.getFullYear()
  const viewMonthIndex = viewMonth.getMonth()

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonthIndex, 1)
    const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay()) // Sunday-first
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [viewYear, viewMonthIndex])

  const hasEventMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const a of state.appointments) {
      if (a.status !== 'confirmed' && a.status !== 'pending') continue
      map.set(dateKey(fromLocalISO(a.start)), true)
    }
    return map
  }, [state.appointments])

  const todayKey = dateKey(new Date())
  const valueKey = dateKey(value)
  const weekStartKey = dateKey(mondayOf(value))
  const weekEnd = addDays(mondayOf(value), 6)
  const weekEndKey = dateKey(weekEnd)

  const title =
    locale === 'zh' ? `${viewYear}年${t(`calendar.month.${viewMonthIndex}`)}` : `${t(`calendar.month.${viewMonthIndex}`)} ${viewYear}`

  return (
    <div className="ios-mini">
      <div className="ios-mini__head">
        <span className="ios-mini__title">{title}</span>
        <div className="ios-mini__nav">
          <button
            type="button"
            className="ios-mini__nav-btn"
            onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
            aria-label={t('calendar.week')}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="ios-mini__nav-btn"
            onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
            aria-label={t('calendar.week')}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="ios-mini__dow-row">
        {(locale === 'zh' ? DOW_ZH : DOW_EN).map((d, i) => (
          <span key={`${d}-${i}`} className="ios-mini__dow">
            {d}
          </span>
        ))}
      </div>

      <div className="ios-mini__grid">
        {cells.map((day) => {
          const key = dateKey(day)
          const otherMonth = day.getMonth() !== viewMonthIndex
          const isToday = key === todayKey
          const isSelected = key === valueKey
          const inWeek = key >= weekStartKey && key <= weekEndKey
          const hasEvent = hasEventMap.get(key) ?? false
          const isMarked = markers ? markers.dates.has(key) : false
          const markerTone = markers?.tone ?? 'danger'
          const classes = [
            'ios-mini__cell',
            otherMonth ? 'ios-mini__cell--muted' : '',
            inWeek && !isSelected ? 'ios-mini__cell--week' : '',
            isSelected ? 'ios-mini__cell--selected' : '',
            isToday ? 'ios-mini__cell--today' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={key}
              type="button"
              className={classes}
              onClick={() => onChange(day)}
              aria-label={day.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-CA', { month: 'long', day: 'numeric', weekday: 'short' })}
            >
              {day.getDate()}
              {(hasEvent || isMarked) && !otherMonth ? (
                <span className="ios-mini__dots" aria-hidden="true">
                  {hasEvent ? <span className="ios-mini__dot ios-mini__dot--event" /> : null}
                  {isMarked ? <span className={`ios-mini__dot ios-mini__dot--${markerTone}`} /> : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
