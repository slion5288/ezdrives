// ============================================================================
// EZDRIVES — DayStrip (shell-owned) — iOS-style week date strip
// A horizontally scrollable strip of the current week (Mon–Sun) with prev /
// next week navigation and a Today button. Tapping a day selects it; the
// schedule below then shows that single day full-width.
// ============================================================================

import { useMemo } from 'react'
import { addDays, dateKey, formatDateEn, formatDateZh } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './calendar.css'

export interface DayStripProps {
  /** Monday of the week currently displayed in the strip. */
  weekStart: Date
  /** The selected day (its schedule is shown below). */
  selectedDate: Date
  onSelect: (date: Date) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
}

export function DayStrip({ weekStart, selectedDate, onSelect, onPrevWeek, onNextWeek, onToday }: DayStripProps): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const selectedKey = dateKey(selectedDate)
  const todayKey = dateKey(new Date())
  const rangeLabel =
    locale === 'zh'
      ? `${formatDateZh(weekStart)} – ${formatDateZh(addDays(weekStart, 6))}`
      : `${formatDateEn(weekStart)} – ${formatDateEn(addDays(weekStart, 6))}`

  return (
    <div className="ios-strip">
      <div className="ios-strip__top">
        <button type="button" className="ios-strip__nav-btn" onClick={onPrevWeek} aria-label={t('calendar.week')}>
          <ChevronLeft size={16} />
        </button>
        <span className="ios-strip__range tabular-nums">{rangeLabel}</span>
        <button type="button" className="ios-strip__nav-btn" onClick={onNextWeek} aria-label={t('calendar.week')}>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="ios-strip__today" onClick={onToday}>
          {t('calendar.today')}
        </button>
      </div>
      <div className="ios-strip__scroller">
        {days.map((day) => {
          const key = dateKey(day)
          const isToday = key === todayKey
          const isSelected = key === selectedKey
          const classes = [
            'ios-strip__day',
            isToday ? 'ios-strip__day--today' : '',
            isSelected ? 'ios-strip__day--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={key} type="button" className={classes} onClick={() => onSelect(day)} aria-pressed={isSelected}>
              <span className="ios-strip__dow">{t(`calendar.weekday.${day.getDay()}`)}</span>
              <span className="ios-strip__num">{day.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
