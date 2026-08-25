// ============================================================================
// Landing page — local UI primitives.
// The shared component library (src/components/shared) is owned by the shell
// agent and did not exist when this page was written, so the landing page
// carries its own tiny set, following the exact specs in docs/DESIGN.md §4.
// All colors/spacing come from tokens.css; every string via useT().
// ============================================================================

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Navigation, Star, Sun } from 'lucide-react'
import { setLocale, useLocale, useT } from '../../i18n'

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

// --- Language switcher (DESIGN §4.11) ---

export function LanguageSwitcher(): JSX.Element {
  const locale = useLocale()
  const t = useT()
  return (
    <div className="landing-lang" role="group" aria-label={t('nav.language')}>
      <button
        type="button"
        className={locale === 'en' ? 'landing-lang__btn landing-lang__btn--active' : 'landing-lang__btn'}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
      <span className="landing-lang__sep" aria-hidden="true">
        /
      </span>
      <button
        type="button"
        className={locale === 'zh' ? 'landing-lang__btn landing-lang__btn--active' : 'landing-lang__btn'}
        onClick={() => setLocale('zh')}
      >
        中文
      </button>
    </div>
  )
}

// --- Theme toggle (ARCHITECTURE §11 / DESIGN §4.11) ---

const THEME_KEY = 'dw.theme'

function savedTheme(): 'light' | 'dark' | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // storage unavailable
  }
  return null
}

export function ThemeToggle(): JSX.Element {
  const t = useT()
  const [dark, setDark] = useState<boolean>(() => document.documentElement.dataset.theme === 'dark')

  useEffect(() => {
    const saved = savedTheme()
    if (saved && document.documentElement.dataset.theme !== saved) {
      document.documentElement.dataset.theme = saved
      setDark(saved === 'dark')
    }
  }, [])

  const toggle = (): void => {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    } catch {
      // storage unavailable — in-memory theme only
    }
  }

  const label = dark ? t('nav.theme.light') : t('nav.theme.dark')
  return (
    <button type="button" className="landing-icon-btn" onClick={toggle} aria-label={label} title={label}>
      {dark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </button>
  )
}

// --- Logo (DESIGN §4.11) ---

export function Logo(): JSX.Element {
  const t = useT()
  return (
    <Link to="/" className="landing-logo">
      <span className="landing-logo__mark">
        <Navigation size={18} strokeWidth={2.5} />
      </span>
      <span className="landing-logo__word">{t('nav.brand')}</span>
    </Link>
  )
}
