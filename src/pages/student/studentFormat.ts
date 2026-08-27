// ============================================================================
// EZDRIVES — student-page formatting helpers (student-owned, local only)
// Locale-aware date/time labels reuse the core timeEngine formatters; relative
// times use the browser's Intl.RelativeTimeFormat (a formatting API, not a
// translation dictionary — no hardcoded EN/ZH prose lives here).
// ============================================================================

import { formatDateEn, formatDateZh, formatHM } from '../../data/timeEngine'
import type { Locale } from '../../i18n'

/** 'Mar 10' / '3月10日' */
export function formatDateLabel(locale: Locale, d: Date): string {
  return locale === 'zh' ? formatDateZh(d) : formatDateEn(d)
}

/** 'Mar 10 · 14:00' / '3月10日 · 14:00' */
export function formatDateTimeLabel(locale: Locale, d: Date): string {
  return `${formatDateLabel(locale, d)} · ${formatHM(d)}`
}

/** CAD price display, e.g. '$60'. */
export function formatPrice(price: number): string {
  return `$${price}`
}

/** Monday of the week containing d (weeks run Mon–Sun). */
export function mondayOf(d: Date): Date {
  const offset = d.getDay() === 0 ? -6 : 1 - d.getDay()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset)
}

const MS_MIN = 60000
const MS_HOUR = 3600000
const MS_DAY = 86400000
const MS_MONTH = 2592000000
const MS_YEAR = 31536000000

/**
 * Human relative time ('in 2 days', '5 minutes ago', '明天') via
 * Intl.RelativeTimeFormat in the active locale.
 */
export function relativeTime(locale: Locale, target: Date, from: Date = new Date()): string {
  const formatter = new Intl.RelativeTimeFormat(locale === 'zh' ? 'zh-CN' : 'en', { numeric: 'auto' })
  const diff = target.getTime() - from.getTime()
  const sign = diff >= 0 ? 1 : -1
  const abs = Math.abs(diff)
  if (abs < MS_MIN) return formatter.format(0, 'minute')
  if (abs < MS_HOUR) return formatter.format(sign * Math.round(abs / MS_MIN), 'minute')
  if (abs < MS_DAY) return formatter.format(sign * Math.round(abs / MS_HOUR), 'hour')
  if (abs < MS_MONTH) return formatter.format(sign * Math.round(abs / MS_DAY), 'day')
  if (abs < MS_YEAR) return formatter.format(sign * Math.round(abs / MS_MONTH), 'month')
  return formatter.format(sign * Math.round(abs / MS_YEAR), 'year')
}
