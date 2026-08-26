// ============================================================================
// EZDRIVES — Logo (shell-owned)
// Renders the brand logo image (user-supplied, complete horizontal mark).
// Sizes: sm 24px / md 28px / lg 40px heights.
// ============================================================================

import { useT } from '../../i18n'
import { LOGO_DATA_URL } from '../../data/assets'
import './shared.css'

export type LogoSize = 'sm' | 'md' | 'lg'

export interface LogoProps {
  size?: LogoSize
  /** Accepted for API compatibility — the logo image already contains the wordmark. */
  showWordmark?: boolean
}

export function Logo({ size = 'md' }: LogoProps): JSX.Element {
  const t = useT()
  return (
    <span className={`logo logo--${size}`}>
      <img src={LOGO_DATA_URL} alt={t('nav.brand')} className="logo__img" />
    </span>
  )
}
