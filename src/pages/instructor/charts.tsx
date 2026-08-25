// ============================================================================
// EZDRIVES — Instructor-local charts (instructor-owned)
// Hand-rolled SVG: DonutChart (course mix), LineChart (bookings trend),
// BarChart (peak hours). Token-derived colors only; axis text from tokens;
// tooltips are HTML overlays positioned in % so they stay aligned when the
// SVG scales.
// ============================================================================

import { useState } from 'react'
import type { AppState } from '../../data/store'
import { bookingsTrend, courseDistribution, peakHours } from '../../data/stats'
import { useT } from '../../i18n'
import type { Locale } from '../../i18n'
import { formatDateEn, formatDateZh, parseDateKey } from '../../data/timeEngine'
import { courseById } from './helpers'

const PALETTE = [
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-warning)',
  'var(--color-success)',
  'var(--color-text-soft)',
  'var(--color-border-strong)',
]

const dateLabel = (key: string, locale: Locale): string => {
  const d = parseDateKey(key)
  return locale === 'zh' ? formatDateZh(d) : formatDateEn(d)
}

// --- DonutChart -----------------------------------------------------------

export function DonutChart({ state, locale }: { state: AppState; locale: Locale }): JSX.Element {
  const t = useT()
  const data = courseDistribution(state)
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const [active, setActive] = useState<number | null>(null)

  if (total === 0) {
    return (
      <div className="ins-chart-empty">
        <p className="ins-chart-empty-title">{t('instructor.overview.noAppointments')}</p>
      </div>
    )
  }

  const SIZE = 200
  const CX = SIZE / 2
  const R = 80
  const C = 2 * Math.PI * R

  let acc = 0
  const segments = data.map((item, i) => {
    const frac = item.count / total
    const dash = Math.max(frac * C - 2.5, 0.5)
    const offset = -acc * C
    acc += frac
    return { item, i, frac, dash, offset }
  })

  const activeCourse = active !== null ? courseById(state, data[active].courseId) : undefined
  const centerValue = active !== null ? data[active].count : total
  const centerCaption = active !== null && activeCourse ? (locale === 'zh' ? activeCourse.name.zh : activeCourse.name.en) : t('stats.total')

  return (
    <div className="ins-donut">
      <div className="ins-donut-plot" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t('stats.courseMix')}>
          {segments.map(({ item, i, dash, offset }) => (
            <circle
              key={item.courseId}
              cx={CX}
              cy={CX}
              r={R}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={34}
              strokeDasharray={`${dash} ${C}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${CX} ${CX})`}
              className={active !== null && active !== i ? 'is-dim' : undefined}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="ins-donut-center">
          <span className="ins-donut-value tabular-nums">{centerValue}</span>
          <span className="ins-donut-caption">{centerCaption}</span>
        </div>
      </div>
      <ul className="ins-donut-legend">
        {segments.map(({ item, i, frac }) => {
          const course = courseById(state, item.courseId)
          return (
            <li
              key={item.courseId}
              className={active === i ? 'is-active' : undefined}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="ins-legend-dot" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
              <span className="ins-legend-name">{course ? (locale === 'zh' ? course.name.zh : course.name.en) : item.courseId}</span>
              <span className="ins-legend-count tabular-nums">{item.count}</span>
              <span className="ins-legend-pct tabular-nums">{Math.round(frac * 100)}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// --- LineChart ------------------------------------------------------------

export function LineChart({ state, locale, height = 220 }: { state: AppState; locale: Locale; height?: number }): JSX.Element {
  const t = useT()
  const data = bookingsTrend(state, 14)
  const [active, setActive] = useState<number | null>(null)

  const W = 720
  const PAD_L = 42
  const PAD_R = 16
  const PAD_T = 14
  const PAD_B = 26
  const n = data.length
  const max = Math.max(1, ...data.map((d) => d.count))
  const plotW = W - PAD_L - PAD_R
  const plotH = height - PAD_T - PAD_B
  const x = (i: number): number => PAD_L + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1))
  const y = (v: number): number => PAD_T + plotH - (v / max) * plotH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`
  const ticks = [...new Set([max, Math.round(max / 2), 0])]

  return (
    <div className="ins-chart">
      <svg viewBox={`0 0 ${W} ${height}`} className="ins-chart-svg" role="img" aria-label={t('stats.trend')}>
        <defs>
          <linearGradient id="ins-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD_L - 8} y={y(v) + 3} textAnchor="end" fontSize="11" fill="var(--color-text-soft)" className="tabular-nums">
              {v}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="url(#ins-trend-fill)" />
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle
            key={d.date}
            cx={x(i)}
            cy={y(d.count)}
            r={active === i ? 5 : 3}
            fill="var(--color-surface)"
            stroke="var(--color-accent)"
            strokeWidth="2"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
        {data.map((d, i) =>
          i % 3 === 0 || i === n - 1 ? (
            <text key={`${d.date}-lbl`} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--color-text-soft)">
              {dateLabel(d.date, locale)}
            </text>
          ) : null,
        )}
      </svg>
      {active !== null ? (
        <div className="ins-chart-tip" style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(data[active].count) / height) * 100}%` }}>
          <span className="ins-chart-tip-label">{dateLabel(data[active].date, locale)}</span>
          <span className="ins-chart-tip-value tabular-nums">{t('stats.tooltip.lessons', { count: data[active].count })}</span>
        </div>
      ) : null}
    </div>
  )
}

// --- BarChart -------------------------------------------------------------

export function BarChart({ state, height = 200 }: { state: AppState; height?: number }): JSX.Element {
  const t = useT()
  const data = peakHours(state).filter((d) => d.hour >= 8 && d.hour <= 20)
  const [active, setActive] = useState<number | null>(null)

  const W = 720
  const PAD_L = 36
  const PAD_R = 12
  const PAD_T = 14
  const PAD_B = 26
  const max = Math.max(1, ...data.map((d) => d.count))
  const plotW = W - PAD_L - PAD_R
  const plotH = height - PAD_T - PAD_B
  const slot = plotW / data.length
  const barW = Math.min(slot * 0.55, 44)
  const x = (i: number): number => PAD_L + i * slot + (slot - barW) / 2
  const y = (v: number): number => PAD_T + plotH - (v / max) * plotH
  const ticks = [...new Set([max, Math.round(max / 2), 0])]

  return (
    <div className="ins-chart">
      <svg viewBox={`0 0 ${W} ${height}`} className="ins-chart-svg" role="img" aria-label={t('stats.peak')}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD_L - 8} y={y(v) + 3} textAnchor="end" fontSize="11" fill="var(--color-text-soft)" className="tabular-nums">
              {v}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const isMax = d.count === max
          const barHeight = (d.count / max) * plotH
          return (
            <g key={d.hour} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
              <rect
                x={x(i)}
                y={y(d.count)}
                width={barW}
                height={barHeight}
                rx="4"
                fill={isMax ? 'var(--color-success)' : 'var(--color-accent)'}
                className={active !== null && active !== i ? 'is-dim' : undefined}
              />
              {i % 2 === 0 ? (
                <text
                  x={x(i) + barW / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-text-soft)"
                  className="tabular-nums"
                >
                  {String(d.hour).padStart(2, '0')}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      {active !== null ? (
        <div
          className="ins-chart-tip"
          style={{ left: `${((x(active) + barW / 2) / W) * 100}%`, top: `${(y(data[active].count) / height) * 100}%` }}
        >
          <span className="ins-chart-tip-label tabular-nums">{String(data[active].hour).padStart(2, '0')}:00</span>
          <span className="ins-chart-tip-value tabular-nums">{t('stats.tooltip.lessons', { count: data[active].count })}</span>
        </div>
      ) : null}
    </div>
  )
}
