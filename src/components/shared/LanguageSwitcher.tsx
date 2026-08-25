// ============================================================================
// EZDRIVES — LanguageSwitcher (shell-owned)
// Source of truth: docs/DESIGN.md §4.11. EN | 中文 pill that switches the
// active locale via setLocale() (persisted to 'dw.locale').
// ============================================================================

import { setLocale, useLocale, useT } from '../../i18n'
import './shared.css'

export function LanguageSwitcher(): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const groupLabel = t('nav.language')
  return (
    <div className="lang-switcher" role="group" aria-label={groupLabel}>
      <button
        type="button"
        className={`lang-switcher__opt${locale === 'en' ? ' lang-switcher__opt--active' : ''}`}
        aria-pressed={locale === 'en'}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-switcher__opt${locale === 'zh' ? ' lang-switcher__opt--active' : ''}`}
        aria-pressed={locale === 'zh'}
        onClick={() => setLocale('zh')}
      >
        中文
      </button>
    </div>
  )
}
