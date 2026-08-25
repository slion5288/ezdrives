// ============================================================================
// EZDRIVES — ThemeToggle (shell-owned)
// Source of truth: docs/ARCHITECTURE.md §11. Sun/moon toggle that sets
// <html data-theme> and persists the choice to localStorage 'dw.theme'.
// ============================================================================

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import './shared.css'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'dw.theme'

export function ThemeToggle(): JSX.Element {
  const t = useT()
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // storage unavailable — theme stays in-memory
    }
  }, [theme])

  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const label = t(next === 'dark' ? 'nav.theme.dark' : 'nav.theme.light')
  return (
    <button type="button" className="theme-toggle" onClick={() => setTheme(next)} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  )
}
