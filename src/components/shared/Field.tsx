// ============================================================================
// EZDRIVES — Field (shell-owned)
// Source of truth: docs/DESIGN.md §4.5. Label above, hint or error below.
// Error replaces hint when present. All strings arrive pre-translated.
// ============================================================================

import type { ReactNode } from 'react'
import './shared.css'

export interface FieldProps {
  /** Field label (translated by the caller). */
  label?: string
  /** Helper text shown below the control (replaced by error). */
  hint?: string
  /** Validation message — replaces the hint and tints the control red. */
  error?: string
  /** Pass through to the label's htmlFor so it focuses the control. */
  htmlFor?: string
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, htmlFor, children, className }: FieldProps): JSX.Element {
  const classes = ['field', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      {label != null ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error != null ? <p className="field__error">{error}</p> : hint != null ? <p className="field__hint">{hint}</p> : null}
    </div>
  )
}
