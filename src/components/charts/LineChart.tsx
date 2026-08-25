// ============================================================================
// EZDRIVES — LineChart (shell-owned)
// Source of truth: docs/DESIGN.md §4.18. Hand-rolled SVG bookings-trend chart:
// accent 2px line, gradient area, dashed gridlines, hover point + tooltip.
// Responsive via a shared 480×160 viewBox. Empty data → token-styled fallback.
// ============================================================================

import { useId, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { useT } from '../../i18n'
import './charts.css'

export interface LineChartPoint {
  /** 'YYYY-MM-DD' (local) — used for the x-axis tick labels. */
  date: string
  count: number
}

export interface LineChartProps {
  data: LineChartPoint[]
  /** Accessible name; defaults to the "Bookings trend" label. */
  ariaLabel?: string
}

const W = 480
const H = 160
const PAD = { top: 14, right: 12, bottom: 24, left: 30 }

export function LineChart({ data, ariaLabel }: LineChartProps): JSX.Element {
  const t = useT()
  const gradientId = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)

  const chart = useMemo(() => {
    const iw = W - PAD.left - PAD.right
    const ih = H - PAD.top - PAD.bottom
    const max = Math.max(1, ...data.map((d) => d.count))
    const x = (i: number): number => (data.length <= 1 ? PAD.left + iw / 2 : PAD.left + (i / (data.length - 1)) * iw)
    const y = (v: number): number => PAD.top + ih - (v / max) * ih
    const baseline = PAD.top + ih
    const points = data.map((d, i) => ({ ...d, x: x(i), y: y(d.count) }))
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const area =
      points.length > 0
        ? `M${points[0].x.toFixed(1)},${baseline} L${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')} L${points[points.length - 1].x.toFixed(1)},${baseline} Z`
        : ''
    const gridYs = [0, 0.5, 1].map((f) => baseline - f * ih)
    const ticks: number[] = []
    if (data.length > 0) {
      const wanted = new Set<number>([0, data.length - 1])
      for (const f of [0.25, 0.5, 0.75]) wanted.add(Math.round(f * (data.length - 1)))
      for (const i of [...wanted].sort((a, b) => a - b)) ticks.push(x(i))
    }
    return { points, line, area, max, baseline, gridYs, ticks }
  }, [data])

  if (data.length === 0) {
    return <div className="chart chart--empty">{t('common.empty.title')}</div>
  }

  const label = ariaLabel ?? t('stats.trend')

  const handleMove = (e: MouseEvent<SVGSVGElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    let nearest = 0
    let best = Infinity
    chart.points.forEach((p, i) => {
      const dist = Math.abs(p.x - vx)
      if (dist < best) {
        best = dist
        nearest = i
      }
    })
    setHover(nearest)
  }

  const hoverPoint = hover !== null ? chart.points[hover] : null
  const tooltipW = 96
  const tooltipX = hoverPoint !== null ? Math.min(Math.max(hoverPoint.x + 8, PAD.left), W - PAD.right - tooltipW) : 0

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.18 }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {chart.gridYs.map((gy) => (
          <line key={gy} className="chart__grid" x1={PAD.left} y1={gy} x2={W - PAD.right} y2={gy} />
        ))}

        {chart.area ? <path d={chart.area} fill={`url(#${gradientId})`} /> : null}
        {chart.line ? <path className="chart__line" d={chart.line} /> : null}

        {/* X-axis tick labels (MM-DD) */}
        {chart.ticks.map((tx, i) => {
          const index = Math.round(((tx - PAD.left) / (W - PAD.left - PAD.right)) * (data.length - 1))
          const date = data[Math.min(index, data.length - 1)]?.date ?? ''
          return (
            <text key={`${tx}-${i}`} className="chart__axis-label" x={tx} y={H - 8} textAnchor="middle">
              {date.length >= 10 ? date.slice(5) : date}
            </text>
          )
        })}
        <text className="chart__axis-label" x={PAD.left - 4} y={chart.baseline} textAnchor="end">
          0
        </text>
        <text className="chart__axis-label" x={PAD.left - 4} y={PAD.top + 2} textAnchor="end">
          {chart.max}
        </text>

        {/* Hover guide + highlighted point + tooltip */}
        {hoverPoint !== null ? (
          <g>
            <line className="chart__guide" x1={hoverPoint.x} y1={PAD.top} x2={hoverPoint.x} y2={chart.baseline} />
            <circle className="chart__point--hover" cx={hoverPoint.x} cy={hoverPoint.y} r={4.5} />
            <rect className="chart__tooltip" x={tooltipX} y={Math.max(PAD.top, hoverPoint.y - 34)} width={tooltipW} height={26} rx={6} />
            <text className="chart__tooltip-text" x={tooltipX + 8} y={Math.max(PAD.top, hoverPoint.y - 34) + 17}>
              {t('stats.tooltip.lessons', { count: hoverPoint.count })}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  )
}
