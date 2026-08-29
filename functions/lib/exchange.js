// ============================================================================
// EZDRIVES — CAD → CNY exchange rate helper (§ Final Payment Fix)
// WeChat payment shows a CNY amount computed as:
//   CAD price × (real-time rate + 0.5)
// The rate is cached in-isolate (6h) so we never call the API on every page
// refresh / payment. On failure we return null — callers must NOT show a
// made-up CNY amount ("Unable to retrieve the latest exchange rate…").
// Source: open.er-api.com (free, no key, CAD base) — only source used.
// ============================================================================

const RATE_SOURCE = 'https://open.er-api.com/v6/latest/CAD'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const MARKUP = 0.5 // we charge real-time rate + 0.5 CNY per CAD

let cachedRate = null // number | null
let cachedAt = 0 // ms timestamp

function fresh(now) {
  return cachedRate !== null && now - cachedAt < CACHE_TTL_MS
}

/** Real-time CAD→CNY rate (no markup). null when the fetch fails. */
export async function getCnyPerCad() {
  const now = Date.now()
  if (fresh(now)) return cachedRate
  try {
    const res = await fetch(RATE_SOURCE, { headers: { Accept: 'application/json' } })
    if (!res.ok) return cachedRate // stale value if any; otherwise null
    const data = await res.json()
    const rate = Number(data && data.rates && data.rates.CNY)
    if (!Number.isFinite(rate) || rate <= 0) return cachedRate
    cachedRate = rate
    cachedAt = now
    return rate
  } catch {
    return cachedRate // stale value if any; otherwise null
  }
}

/** Rate actually used for WeChat pricing: real-time + 0.5. */
export async function getWechatRate() {
  const base = await getCnyPerCad()
  return base === null ? null : base + MARKUP
}

/** ¥ amount for a CAD price using the +0.5 marked-up rate (2dp). */
export function cnyOf(cadAmount, wechatRate) {
  if (!Number.isFinite(cadAmount) || !Number.isFinite(wechatRate) || wechatRate <= 0) return null
  return Math.round(cadAmount * wechatRate * 100) / 100
}
