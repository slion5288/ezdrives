// ============================================================================
// Landing page — local UI primitives.
// The shared component library (src/components/shared) is owned by the shell
// agent and did not exist when this page was written, so the landing page
// carries its own tiny set, following the exact specs in docs/DESIGN.md §4.
// All colors/spacing come from tokens.css; every string via useT().
// ============================================================================

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useT } from '../../i18n'
import { LOGO_DATA_URL } from '../../data/assets'

// --- Button (DESIGN §4.1) ---

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface LandingButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** react-router path */
  to?: string
  /** plain anchor href */
  href?: string
  onClick?: () => void
  className?: string
  children: ReactNode
}

export function LandingButton({
  variant = 'primary',
  size = 'md',
  to,
  href,
  onClick,
  className,
  children,
}: LandingButtonProps): JSX.Element {
  const classes = ['landing-btn', `landing-btn--${variant}`, `landing-btn--${size}`]
  if (className) classes.push(className)
  const joined = classes.join(' ')
  if (to) {
    return (
      <Link to={to} className={joined} onClick={onClick}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={joined} onClick={onClick}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={joined} onClick={onClick}>
      {children}
    </button>
  )
}

// --- Badge (DESIGN §4.3) ---

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info'

interface LandingBadgeProps {
  tone?: BadgeTone
  dot?: boolean
  className?: string
  children: ReactNode
}

export function LandingBadge({ tone = 'neutral', dot = false, className, children }: LandingBadgeProps): JSX.Element {
  const classes = ['landing-badge', `landing-badge--${tone}`]
  if (dot) classes.push('landing-badge--dot')
  if (className) classes.push(className)
  return (
    <span className={classes.join(' ')}>
      {dot && <span className="landing-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

// --- Avatar (DESIGN §4.10) ---

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface LandingAvatarProps {
  name: string
  color: string
  size?: 32 | 40 | 48 | 64
}

export function LandingAvatar({ name, color, size = 40 }: LandingAvatarProps): JSX.Element {
  return (
    <span className={`landing-avatar landing-avatar--${size}`} style={{ backgroundColor: color }} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}

// --- Star rating ---

interface StarRatingProps {
  value: number
  size?: number
  label?: string
}

export function StarRating({ value, size = 16, label }: StarRatingProps): JSX.Element {
  const filled = Math.round(value)
  const accessible = label ? { role: 'img' as const, 'aria-label': label } : {}
  return (
    <span className="landing-stars" {...accessible}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={i < filled ? 2.5 : 1.5}
          className={i < filled ? 'landing-stars__star--on' : 'landing-stars__star--off'}
        />
      ))}
    </span>
  )
}

// --- Logo (DESIGN §4.11) ---
// The brand logo (LOGO_DATA_URL) is a complete horizontal mark — no extra wordmark.

export function Logo(): JSX.Element {
  const t = useT()
  return (
    <Link to="/" className="landing-logo" aria-label={t('nav.brand')}>
      <img src={LOGO_DATA_URL} alt={t('nav.brand')} className="landing-logo__img" />
    </Link>
  )
}
