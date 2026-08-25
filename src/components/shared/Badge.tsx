// ============================================================================
// EZDRIVES — Badge (shell-owned)
// Source of truth: docs/DESIGN.md §4.3. Tones neutral/success/danger/warning/
// info with optional leading dot (pulse for live/pending statuses).
// ============================================================================

import type { ReactNode } from 'react'
import './shared.css'

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info'

export interface BadgeProps {
  tone?: BadgeTone
  /** Show a 6px dot before the label. */
  dot?: boolean
  /** Animate the dot (status pulse). */
  pulse?: boolean
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', dot = false, pulse = false, children, className }: BadgeProps): JSX.Element {
  const classes = ['badge', `badge--${tone}`, className].filter(Boolean).join(' ')
  return (
    <span className={classes}>
      {dot ? <span className={`badge__dot${pulse ? ' badge__dot--pulse' : ''}`} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}
