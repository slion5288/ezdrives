// ============================================================================
// EZDRIVES — StatCard (shell-owned)
// Source of truth: docs/DESIGN.md §4.8. Label, big tabular value and an
// optional signed delta row (TrendingUp/Down) with context label.
// ============================================================================

import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import './shared.css'

export interface StatCardProps {
  /** Small muted label above the value (translated by the caller). */
  label: string
  value: string | number
  /** Signed percent change vs the previous period; omit to hide the row. */
  delta?: number
  /** Muted context for the delta, e.g. "vs last month". */
  deltaLabel?: string
  /** Optional leading icon shown right of the label. */
  icon?: ReactNode
}

export function StatCard({ label, value, delta, deltaLabel, icon }: StatCardProps): JSX.Element {
  const trend: 'up' | 'down' | 'flat' = delta === undefined || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'
  return (
    <div className="card stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {icon != null ? <span className="stat-card__icon" aria-hidden="true">{icon}</span> : null}
      </div>
      <p className="stat-card__value tabular-nums">{value}</p>
      {delta !== undefined ? (
        <div className={`stat-card__delta stat-card__delta--${trend}`}>
          {trend === 'up' ? <TrendingUp size={14} aria-hidden="true" /> : trend === 'down' ? <TrendingDown size={14} aria-hidden="true" /> : null}
          <span>{trend === 'flat' ? '0%' : `${Math.abs(delta)}%`}</span>
          {deltaLabel != null ? <span className="stat-card__delta-label">{deltaLabel}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
