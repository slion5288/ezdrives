// ============================================================================
// EZDRIVES — DonutChart (shell-owned)
// Source of truth: docs/DESIGN.md §4.18. Hand-rolled SVG course-mix donut:
// token-based 6-hue palette, 2px surface gaps, total in the center, legend
// on the right. Empty data → token-styled fallback.
// ============================================================================

import { useMemo } from 'react'
import { useT } from '../../i18n'
import './charts.css'

export interface DonutChartSlice {
  courseId: string
  count: number
  /** Bilingual display name — the caller resolves it from state. */
  label?: string
}

export interface DonutChartProps {
  data: DonutChartSlice[]
  /** Accessible name; defaults to the "Course mix" label. */
  ariaLabel?: string
}

const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 70
const STROKE = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2

/** Accent-led muted palette (DESIGN §4.18) — tokens only. */
const PALETTE = [
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-warning)',
  'var(--color-success)',
  'var(--color-text-soft)',
  'var(--color-border-strong)',
]

export function DonutChart({ data, ariaLabel }: DonutChartProps): JSX.Element {
  const t = useT()

  const chart = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.count, 0)
    let acc = 0
    const segments = data.map((d, i) => {
      const frac = total > 0 ? d.count / total : 0
      const dash = Math.max(frac * CIRCUMFERENCE - GAP, 0.5)
      const seg = {
        ...d,
        color: PALETTE[i % PALETTE.length],
        dash,
        offset: -acc,
      }
      acc += frac * CIRCUMFERENCE
      return seg
    })
    return { segments, total }
  }, [data])

  if (chart.total === 0) {
    return <div className="chart chart--empty">{t('common.empty.title')}</div>
  }

  const label = ariaLabel ?? t('stats.courseMix')

  return (
    <div className="chart donut-chart">
      <svg className="donut-chart__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
        {chart.segments.map((seg) => (
          <circle
            key={seg.courseId}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={seg.color}
            strokeWidth={STROKE}
            strokeDasharray={`${seg.dash.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
            strokeDashoffset={seg.offset.toFixed(2)}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        ))}
        <text className="donut-chart__center-value" x={CENTER} y={CENTER - 2} textAnchor="middle">
          {chart.total}
        </text>
        <text className="donut-chart__center-label" x={CENTER} y={CENTER + 16} textAnchor="middle">
          {t('stats.total')}
        </text>
      </svg>
      <div className="donut-chart__legend">
        {chart.segments.map((seg) => (
          <div key={seg.courseId} className="donut-chart__legend-row">
            <span className="donut-chart__swatch" style={{ backgroundColor: seg.color }} aria-hidden="true" />
            <span className="donut-chart__legend-label">{seg.label ?? seg.courseId}</span>
            <span className="donut-chart__legend-count">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
