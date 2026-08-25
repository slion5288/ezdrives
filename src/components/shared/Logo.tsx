// ============================================================================
// EZDRIVES — Logo (shell-owned)
// Source of truth: docs/DESIGN.md §4.11. Inline SVG mark (accent rounded
// square with a white steering-wheel glyph) + wordmark from i18n 'nav.brand'.
// The glyph uses var(--color-surface) so it stays legible on the brighter
// dark-mode accent (no literal white exists in the token set).
// ============================================================================

import { useT } from '../../i18n'
import './shared.css'

export type LogoSize = 'sm' | 'md' | 'lg'

export interface LogoProps {
  size?: LogoSize
  /** Set false to render only the mark (e.g. compact headers). */
  showWordmark?: boolean
}

export function Logo({ size = 'md', showWordmark = true }: LogoProps): JSX.Element {
  const t = useT()
  return (
    <span className={`logo logo--${size}`}>
      <svg className="logo__mark" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="ezdrives-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#ezdrives-grad)" />
        <circle cx="20" cy="20" r="9" fill="none" stroke="var(--color-on-brand)" strokeWidth="2.5" />
        <path
          d="M20 11 L20 14 M20 26 L20 29 M11 20 L14 20 M26 20 L29 20"
          stroke="var(--color-on-brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="2.6" fill="var(--color-on-brand)" />
      </svg>
      {showWordmark ? <span className="logo__wordmark">{t('nav.brand')}</span> : null}
    </span>
  )
}
