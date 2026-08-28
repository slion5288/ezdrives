// ============================================================================
// EZDRIVES — Instructor WorkingHoursPage (instructor-owned)
// Simplified, calendar-based schedule editor:
//  1) Weekly schedule — the week is the unit: tap weekdays to enable/disable
//     them, pick one default time range applied to every enabled day, then
//     save. Repeats every week.
//  2) Temporary adjustments (调休) — an iOS-style month calendar marks days
//     that have an exception; pick a date to close it for the day or override
//     its hours. Saving auto-cancels conflicting bookings via the store.
// ============================================================================

import { useMemo, useState } from 'react'
import type { AppState, DayException, WeeklyRule } from '../../data/store'
import { addException, removeException, setBreakMin, setWeeklyRules } from '../../data/store'
import { dateKey, formatDateEn, formatDateZh, parseDateKey } from '../../data/timeEngine'
import { useLocale, useT } from '../../i18n'
import { Info, Pencil, Trash2 } from 'lucide-react'
import { MiniCalendar } from '../../components/calendar/MiniCalendar'
import { Badge } from './ui'
import { useToast } from '../../components/shared'
import { fmtMin, minuteOptions, minOf } from './helpers'
import { Button } from '../../components/shared/Button'

const DAYS = [1, 2, 3, 4, 5, 6, 0] // Mon..Sun
const START_OPTS = minuteOptions(360, 1260, 60) // 06:00–21:00, hourly
const END_OPTS_MAX = 1380 // 23:00
const BREAK_OPTS = [0, 5, 10, 15, 20, 30] // minutes between lessons of different students
/** Quick default-hour presets: [startMin, endMin]. */
const PRESETS: [number, number][] = [
  [540, 1080], // 09:00–18:00
  [480, 1020], // 08:00–17:00
  [600, 960], // 10:00–16:00
  [660, 1140], // 11:00–19:00
]

export default function WorkingHoursPage({ state }: { state: AppState }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const toast = useToast()

  // Edit/save pattern: read-only summary by default; click 编辑 to edit,
  // the button becomes 保存, saving returns to the summary.
  const firstRule = state.weeklyRules[0]
  const [editing, setEditing] = useState(false)
  const [enabled, setEnabled] = useState<boolean[]>(() => DAYS.map((wd) => state.weeklyRules.some((r) => r.weekday === wd)))
  const [defStart, setDefStart] = useState<number>(() => firstRule?.startMin ?? 540)
  const [defEnd, setDefEnd] = useState<number>(() => firstRule?.endMin ?? 1080)
  const [breakMin, setBreakMinState] = useState<number>(() => state.instructor.breakMin ?? 10)

  const startEdit = (): void => {
    setEnabled(DAYS.map((wd) => state.weeklyRules.some((r) => r.weekday === wd)))
    setDefStart(firstRule?.startMin ?? 540)
    setDefEnd(firstRule?.endMin ?? 1080)
    setBreakMinState(state.instructor.breakMin ?? 10)
    setEditing(true)
  }

  const toggleDay = (idx: number): void => {
    setEnabled((prev) => prev.map((on, i) => (i === idx ? !on : on)))
  }

  const enabledDaysLabel = enabled
    .map((on, i) => (on ? t(`calendar.weekday.${DAYS[i]}`) : null))
    .filter((x): x is string => x !== null)

  const handleSave = (): void => {
    const rules: WeeklyRule[] = enabled.flatMap((on, i) => (on ? [{ weekday: DAYS[i], startMin: defStart, endMin: defEnd }] : []))
    setWeeklyRules(rules)
    setBreakMin(breakMin)
    setEditing(false)
    toast.push({ tone: 'success', title: t('instructor.workinghours.saved') })
  }

  // --- Temporary adjustments (调休) ---
  const exceptions = useMemo(
    () => [...state.exceptions].sort((a, b) => a.date.localeCompare(b.date)),
    [state.exceptions],
  )
  const markerDates = useMemo(() => new Set(state.exceptions.map((e) => e.date)), [state.exceptions])

  const [selDate, setSelDate] = useState('')
  const [exClosed, setExClosed] = useState(true)
  const [exStart, setExStart] = useState('14:00')
  const [exEnd, setExEnd] = useState('17:00')

  const selException = exceptions.find((e) => e.date === selDate)

  const openEditor = (date: string): void => {
    const ex = state.exceptions.find((e) => e.date === date)
    setSelDate(date)
    if (ex) {
      setExClosed(ex.closed)
      if (!ex.closed && ex.startMin !== undefined && ex.endMin !== undefined) {
        setExStart(fmtMin(ex.startMin))
        setExEnd(fmtMin(ex.endMin))
      }
    } else {
      setExClosed(true)
      setExStart('14:00')
      setExEnd('17:00')
    }
  }

  const handleApplyException = (): void => {
    if (!selDate) return
    const exception: DayException = exClosed
      ? { date: selDate, closed: true }
      : { date: selDate, closed: false, startMin: minOf(exStart), endMin: minOf(exEnd) }
    addException(exception)
    toast.push({ tone: 'success', title: t('common.toast.saved') })
  }

  const handleRemoveException = (date: string): void => {
    removeException(date)
    if (selDate === date) setSelDate('')
    toast.push({ tone: 'success', title: t('common.toast.deleted') })
  }

  return (
    <div className="ins-wh">
      <div className="ins-info-banner">
        <Info size={16} aria-hidden="true" />
        <span>{t('instructor.workinghours.warning')}</span>
      </div>

      <div className="ins-wh-grid">
        {/* --- Weekly schedule --- */}
        <section className="ins-panel">
          <div className="ins-panel-head">
            <h2 className="ins-panel-title">{t('instructor.workinghours.weekly')}</h2>
            <span className="ins-panel-sub">{t('instructor.workinghours.weeklyBody')}</span>
            {!editing ? (
              <Button variant="secondary" size="sm" onClick={startEdit}>
                <Pencil size={14} /> {t('common.edit')}
              </Button>
            ) : null}
          </div>

          {!editing ? (
            <div className="ins-week-view">
              {state.weeklyRules.length === 0 ? (
                <p className="ins-week-summary ins-week-summary--off">{t('instructor.workinghours.offDay')}</p>
              ) : (
                <>
                  <p className="ins-week-summary">
                    <span>
                      {state.weeklyRules
                        .map((r) => t(`calendar.weekday.${r.weekday}`))
                        .join(' · ')}
                    </span>
                    <span className="ins-week-summary-range tabular-nums">
                      {fmtMin(state.weeklyRules[0].startMin)}–{fmtMin(state.weeklyRules[0].endMin)}
                    </span>
                  </p>
                  <p className="ins-field-hint">
                    {t('instructor.workinghours.break')}: {state.instructor.breakMin ?? 0}{' '}
                    {t('common.minutes')}
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
          <div className="ins-field-label">{t('instructor.workinghours.days')}</div>
          <div className="ins-week-strip">
            {DAYS.map((wd, i) => (
              <button
                key={wd}
                type="button"
                className={`ins-day-cell${enabled[i] ? ' is-on' : ''}`}
                onClick={() => toggleDay(i)}
                aria-pressed={enabled[i]}
              >
                <span className="ins-day-cell-dow">{t(`calendar.weekday.${wd}`)}</span>
                {enabled[i] ? <span className="ins-day-cell-dot" aria-hidden="true" /> : <span className="ins-day-cell-off">{t('instructor.workinghours.offDay')}</span>}
              </button>
            ))}
          </div>
          {enabledDaysLabel.length > 0 ? (
            <p className="ins-week-summary">
              <span>{enabledDaysLabel.join(' · ')}</span>
              <span className="ins-week-summary-range tabular-nums">
                {fmtMin(defStart)}–{fmtMin(defEnd)}
              </span>
            </p>
          ) : (
            <p className="ins-week-summary ins-week-summary--off">{t('instructor.workinghours.offDay')}</p>
          )}
          <p className="ins-field-hint">{t('instructor.workinghours.daysHint')}</p>

          <div className="ins-def-hours">
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="ins-wh-start">
                {t('instructor.workinghours.start')}
              </label>
              <select
                id="ins-wh-start"
                className="ins-input"
                value={fmtMin(defStart)}
                onChange={(e) => setDefStart(minOf(e.target.value))}
              >
                {START_OPTS.map((m) => (
                  <option key={m} value={fmtMin(m)}>
                    {fmtMin(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="ins-wh-end">
                {t('instructor.workinghours.end')}
              </label>
              <select
                id="ins-wh-end"
                className="ins-input"
                value={fmtMin(defEnd)}
                onChange={(e) => setDefEnd(minOf(e.target.value))}
              >
                {minuteOptions(defStart + 30, END_OPTS_MAX).map((m) => (
                  <option key={m} value={fmtMin(m)}>
                    {fmtMin(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="ins-field-hint">{t('instructor.workinghours.defaultHoursHint')}</p>
          <div className="ins-def-presets">
            {PRESETS.map(([s, e]) => (
              <button
                key={`${s}-${e}`}
                type="button"
                className={`ins-chip tabular-nums${s === defStart && e === defEnd ? ' is-active' : ''}`}
                onClick={() => {
                  setDefStart(s)
                  setDefEnd(e)
                }}
              >
                {fmtMin(s)}–{fmtMin(e)}
              </button>
            ))}
          </div>

          <div className="ins-break-field">
            <div className="ins-field">
              <label className="ins-field-label" htmlFor="ins-wh-break">
                {t('instructor.workinghours.break')}
              </label>
              <select
                id="ins-wh-break"
                className="ins-input"
                value={breakMin}
                onChange={(e) => setBreakMinState(Number(e.target.value))}
              >
                {BREAK_OPTS.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? t('instructor.workinghours.breakNone') : `${m} ${t('common.minutes')}`}
                  </option>
                ))}
              </select>
            </div>
            <p className="ins-field-hint">{t('instructor.workinghours.breakHint')}</p>
          </div>

          <div className="ins-panel-foot">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {t('instructor.workinghours.save')}
            </Button>
          </div>
            </>
          )}
        </section>

        {/* --- Temporary adjustments --- */}
        <section className="ins-panel">
          <div className="ins-panel-head">
            <h2 className="ins-panel-title">{t('instructor.workinghours.exceptions')}</h2>
            <span className="ins-panel-sub">{t('instructor.workinghours.exceptionsBody')}</span>
          </div>

          <div className="ins-exc-cal">
            <MiniCalendar
              value={new Date()}
              onChange={(d) => openEditor(dateKey(d))}
              state={state}
              markers={{ dates: markerDates, tone: 'danger' }}
            />
          </div>
          <p className="ins-field-hint">{t('instructor.workinghours.pickDateHint')}</p>

          {selDate ? (
            <div className="ins-exc-editor">
              <div className="ins-exc-editor-head">
                <span className="ins-exc-editor-date tabular-nums">
                  {locale === 'zh' ? formatDateZh(parseDateKey(selDate)) : formatDateEn(parseDateKey(selDate))}
                </span>
                {selException ? <Badge tone="warning">{t('instructor.workinghours.editException')}</Badge> : null}
              </div>
              <div className="ins-radio-row">
                <label className="ins-radio">
                  <input type="radio" name="exc-mode" checked={exClosed} onChange={() => setExClosed(true)} />
                  <span>{t('instructor.workinghours.closeDay')}</span>
                </label>
                <label className="ins-radio">
                  <input type="radio" name="exc-mode" checked={!exClosed} onChange={() => setExClosed(false)} />
                  <span>{t('instructor.workinghours.override')}</span>
                </label>
              </div>
              {!exClosed ? (
                <div className="ins-exc-times">
                  <select className="ins-input" aria-label={t('instructor.workinghours.start')} value={exStart} onChange={(e) => setExStart(e.target.value)}>
                    {START_OPTS.map((m) => (
                      <option key={m} value={fmtMin(m)}>
                        {fmtMin(m)}
                      </option>
                    ))}
                  </select>
                  <select className="ins-input" aria-label={t('instructor.workinghours.end')} value={exEnd} onChange={(e) => setExEnd(e.target.value)}>
                    {minuteOptions(minOf(exStart) + 60, END_OPTS_MAX, 60).map((m) => (
                      <option key={m} value={fmtMin(m)}>
                        {fmtMin(m)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="ins-exc-editor-actions">
                <Button variant="secondary" onClick={handleApplyException}>
                  {t('instructor.workinghours.apply')}
                </Button>
                {selException ? (
                  <Button variant="ghost" onClick={() => handleRemoveException(selDate)}>
                    {t('instructor.workinghours.restore')}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {exceptions.length === 0 ? (
            <p className="ins-muted-note">{t('common.empty.title')}</p>
          ) : (
            <ul className="ins-exc-list">
              {exceptions.map((e) => {
                const day = parseDateKey(e.date)
                const dateLabel = locale === 'zh' ? formatDateZh(day) : formatDateEn(day)
                return (
                  <li key={e.date} className="ins-exc-card">
                    <div className="ins-exc-main">
                      <span className="ins-exc-date tabular-nums">{dateLabel}</span>
                      {e.closed ? (
                        <Badge tone="danger">{t('instructor.workinghours.closeDay')}</Badge>
                      ) : (
                        <span className="ins-exc-hours">
                          <Badge tone="info">{t('instructor.workinghours.override')}</Badge>
                          <span className="tabular-nums">
                            {fmtMin(e.startMin ?? 0)} – {fmtMin(e.endMin ?? 0)}
                          </span>
                        </span>
                      )}
                      {e.note ? <span className="ins-exc-note">{locale === 'zh' ? e.note.zh : e.note.en}</span> : null}
                    </div>
                    <button
                      type="button"
                      className="ins-icon-btn is-danger"
                      aria-label={t('common.delete')}
                      onClick={() => handleRemoveException(e.date)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
