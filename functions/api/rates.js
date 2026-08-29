// GET /api/rates — current WeChat CAD→CNY rate (real-time + 0.5 markup).
// Cached server-side (6h, see lib/exchange.js) and meant to be cached
// client-side too (PaymentModal keeps a localStorage copy), so the API is
// not hit on every page refresh. Failure → ok:false WITHOUT a fallback rate
// (the client must show "Unable to retrieve the latest exchange rate…").
import { json } from '../lib/util.js'
import { getWechatRate } from '../lib/exchange.js'

export async function onRequestGet() {
  try {
    const rate = await getWechatRate()
    if (rate === null) {
      return json({ ok: false, error: 'rate_unavailable' }, 502)
    }
    return json({ ok: true, rate })
  } catch {
    return json({ ok: false, error: 'rate_unavailable' }, 502)
  }
}
