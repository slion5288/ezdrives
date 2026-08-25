// ============================================================================
// EZDRIVES — EmptyState (shell-owned)
// Source of truth: docs/DESIGN.md §4.9. Centered icon circle + title + body
// with an optional single action.
// ============================================================================

import type { ReactNode } from 'react'
import './shared.css'

export interface EmptyStateProps {
  /** lucide icon rendered in the 64px circle. */
  icon?: ReactNode
  /** Heading (translated by the caller). */
  title: string
  body?: string
  /** Single action (e.g. a Button) below the body. */
  action?: ReactNode
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="empty-state">
      {icon != null ? <div className="empty-state__icon" aria-hidden="true">{icon}</div> : null}
      <h3 className="empty-state__title">{title}</h3>
      {body != null ? <p className="empty-state__body">{body}</p> : null}
      {action != null ? <div className="empty-state__action">{action}</div> : null}
    </div>
  )
}
