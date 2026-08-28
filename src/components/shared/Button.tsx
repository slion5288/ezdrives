// ============================================================================
// EZDRIVES — Button (shell-owned)
// Source of truth: docs/DESIGN.md §4.1. Variants primary/secondary/ghost/
// danger, sizes sm/md/lg, optional leading icon and loading spinner.
// ============================================================================

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './shared.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Show a spinner in place of the icon and disable clicks. */
  loading?: boolean
  /** Optional leading 16px icon (lucide element). */
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps): JSX.Element {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : icon != null ? (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children != null ? <span className="btn__label">{children}</span> : null}
    </button>
  )
}
