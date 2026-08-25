// ============================================================================
// EZDRIVES — Card (shell-owned)
// Source of truth: docs/DESIGN.md §4.2. Surface card with optional title /
// subtitle / right-aligned actions, hoverable and selected states.
// ============================================================================

import type { HTMLAttributes, ReactNode } from 'react'
import './shared.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card title (already translated by the caller via useT). */
  title?: string
  /** Muted subtitle under the title. */
  subtitle?: string
  /** Right-aligned action row in the header. */
  actions?: ReactNode
  hoverable?: boolean
  selected?: boolean
  /** Set false to remove the body padding (e.g. tables). Default true. */
  padded?: boolean
}

export function Card({
  title,
  subtitle,
  actions,
  hoverable = false,
  selected = false,
  padded = true,
  className,
  children,
  ...rest
}: CardProps): JSX.Element {
  const classes = [
    'card',
    hoverable ? 'card--hoverable' : '',
    selected ? 'card--selected' : '',
    padded ? '' : 'card--unpadded',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={classes} {...rest}>
      {title != null || actions != null ? (
        <div className="card__header">
          <div>
            {title != null ? <h3 className="card__title">{title}</h3> : null}
            {subtitle != null ? <p className="card__subtitle">{subtitle}</p> : null}
          </div>
          {actions != null ? <div className="card__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children != null ? <div className="card__body">{children}</div> : null}
    </div>
  )
}
