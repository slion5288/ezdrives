// ============================================================================
// EZDRIVES — BarChart (shell-owned)
// Source of truth: docs/DESIGN.md §4.18. Hand-rolled SVG peak-hours chart:
// 24 bars with 4px top radius, accent fill; the tallest bar(s) use the success
// token when highlightMax is set. Responsive via a shared 480×160 viewBox.
// ============================================================================

import { useMemo } from 'react'
import { useT } from '../../i18n'
import './charts.css'

export interface BarChartPoint {
  /** Hour of day 0–23. */
  hour: number
  count: number
}

export interface BarChartProps {
  data: BarChartPoint[]
  /** Fill the max bar(s) with the success token (peak highlight). */
  highlightMax?: boolean
  /** Accessible name; defaults to the "Peak hours" label. */
  ariaLabel?: string
}

const W = 480
const H = 160
const PAD = { top: 14, right: 12, bottom: 24, left: 30 }
const LABEL_HOURS = [0, 6, 12, 18, 23]

/** Rect with rounded top corners (radius 4). */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= r) return `M${x},${y + h} L${x},${y} L${x + w},${y} L${x + w},${y + h} Z`
  return [
    `M${x},${y + h}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + w - r},${y}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `L${x + w},${y + h}`,
    'Z',
  ].join(' ')
}

export function BarChart({ data, highlightMax = true, ariaLabel }: BarChartProps): JSX.Element {
  const t = useT()

  const chart = useMemo(() => {
    const iw = W - PAD.left - PAD.right
    const ih = H - PAD.top - PAD.bottom
    const max = Math.max(1, ...data.map((d) => d.count))
    const baseline = PAD.top + ih
    const slot = data.length > 0 ? iw / data.length : iw
    const barW = Math.max(4, slot * 0.62)
    const bars = data.map((d, i) => {
      const h = (d.count / max) * ih
      const x = PAD.left + i * slot + (slot - barW) / 2
      return { ...d, x, y: baseline - h, h, isMax: d.count === max && d.count > 0 }
    })
    return { bars, baseline, max, barW }
  }, [data])

  if (data.length === 0) {
    return <div className="chart chart--empty">{t('common.empty.title')}</div>
  }

  const label = ariaLabel ?? t('stats.peak')

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line className="chart__grid" x1={PAD.left} y1={chart.baseline} x2={W - PAD.right} y2={chart.baseline} />

        {chart.bars.map((bar) => (
          <path
            key={bar.hour}
            className={`chart__bar${highlightMax && bar.isMax ? ' chart__bar--max' : ''}`}
            d={topRoundedRect(bar.x, bar.y, chart.barW, bar.h, 4)}
          >
            <title>{`${bar.hour}:00 — ${bar.count}`}</title>
          </path>
        ))}

        {LABEL_HOURS.filter((h) => data.some((d) => d.hour === h)).map((h) => {
          const index = data.findIndex((d) => d.hour === h)
          const bar = chart.bars[index]
          return (
            <text key={h} className="chart__axis-label" x={bar.x + 4} y={H - 8} textAnchor="middle">
              {h}
            </text>
          )
        })}
        <text className="chart__axis-label" x={PAD.left - 4} y={chart.baseline} textAnchor="end">
          0
        </text>
        <text className="chart__axis-label" x={PAD.left - 4} y={PAD.top + 2} textAnchor="end">
          {chart.max}
        </text>
      </svg>
    </div>
  )
}
