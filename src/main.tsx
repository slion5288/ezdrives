// ============================================================================
// EZDRIVES — Entry point (shell-owned)
// Source of truth: docs/ARCHITECTURE.md §8/§11. Mounts <App/> inside
// <I18nProvider/> and imports the token + global styles. The persisted theme
// ('dw.theme') is applied to <html data-theme> BEFORE the first render so the
// app never flashes the wrong theme.
// ============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n'
import './styles/tokens.css'
import './styles/global.css'

const THEME_KEY = 'dw.theme'

function applySavedTheme(): void {
  let theme: string | null = null
  try {
    theme = localStorage.getItem(THEME_KEY)
  } catch {
    // storage unavailable — fall through to light
  }
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light'
}

applySavedTheme()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing #root element — check index.html')

createRoot(rootEl).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)

// PWA: register the service worker (production only — dev reloads are handled by vite).
// updateViaCache: 'none' → the SW script itself is never served from browser
// cache, so cache-policy fixes reach every client on the next visit.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .catch((err) => console.warn('[pwa] sw register failed:', err))
  })
}
