// ============================================================================
// EZDRIVES — i18n (code contract)
// Source of truth: docs/ARCHITECTURE.md §7. Custom React context, no i18n
// library. EN is the default locale; choice is persisted in localStorage
// 'dw.locale'. Missing keys return the key verbatim (never crash).
// ============================================================================

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { messages as enMessages } from './locales/en'
import { messages as zhMessages } from './locales/zh'

export type Locale = 'en' | 'zh'

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

interface I18nContextValue {
  locale: Locale
  t: TranslateFn
}

const LOCALE_KEY = 'dw.locale'

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: (key) => key,
})

function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    // storage unavailable — default to 'en'
  }
  return 'en'
}

let currentLocale: Locale = loadLocale()
const localeListeners = new Set<() => void>()

/**
 * Switch locale, re-render every consumer and persist the choice.
 * Safe to call from event handlers; the provider listens and re-renders.
 */
export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return
  currentLocale = locale
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // storage unavailable — in-memory only
  }
  localeListeners.forEach((fn) => fn())
}

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(() => currentLocale)

  useEffect(() => {
    const onChange = (): void => setLocaleState(currentLocale)
    localeListeners.add(onChange)
    return () => {
      localeListeners.delete(onChange)
    }
  }, [])

  useEffect(() => {
    try {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    } catch {
      // non-browser environment — ignore
    }
  }, [locale])

  const value = useMemo<I18nContextValue>(() => {
    const dictionary: Record<string, string> = locale === 'zh' ? zhMessages : enMessages
    const t: TranslateFn = (key, vars) => {
      let message = dictionary[key] ?? key
      if (vars) {
        for (const [name, raw] of Object.entries(vars)) {
          message = message.split(`{${name}}`).join(String(raw))
        }
      }
      return message
    }
    return { locale, t }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): TranslateFn {
  return useContext(I18nContext).t
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale
}
