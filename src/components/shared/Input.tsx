// ============================================================================
// EZDRIVES — Input (shell-owned)
// Source of truth: docs/DESIGN.md §4.5. Token-styled text input with an
// optional invalid state and an optional suffix adornment (e.g. "$", "min").
// ============================================================================

import type { InputHTMLAttributes, ReactNode } from 'react'
import './shared.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  /** Static suffix shown inside the field's right edge (non-interactive). */
  suffix?: ReactNode
}

export function Input({ invalid = false, suffix, className, ...rest }: InputProps): JSX.Element {
  const classes = ['input', invalid ? 'input--invalid' : '', className].filter(Boolean).join(' ')
  if (suffix != null) {
    return (
      <div className="input-group">
        <input className={classes} {...rest} />
        <span className="input-group__suffix" aria-hidden="true">
          {suffix}
        </span>
      </div>
    )
  }
  return <input className={classes} {...rest} />
}
