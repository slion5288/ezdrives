// /api/admin/translate — translate Simplified Chinese text to English (admin only).
// Used by the /admin editor: the admin types Chinese only; the site stores
// {en, zh} pairs, so English is machine-translated on save.
//
// Strategy (fallback chain, first success wins):
//   1. Google Cloud Translation API v2 (needs GOOGLE_TRANSLATE_API_KEY env —
//      enable "Cloud Translation API" in Google Cloud and add the key as a
//      Cloudflare Pages secret for the best quality/limits).
//   2. MyMemory free API (no key; ~5k chars/day anonymous — fine for admin edits).
//   3. Keyless Google translate_a endpoint (may return 429 from cloud IPs).
import { json, fail, readJson } from '../../lib/util.js'
import { authAdmin } from '../../lib/admin.js'
import { checkRate } from '../../lib/rate.js'

const MAX_TEXTS = 50
const MAX_LEN = 2000
const CONCURRENCY = 3

export async function onRequestPost({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!(await checkRate(env, `admintranslate:${ip}`, 60, 60 * 1000))) {
    return fail('Too many requests. Try again in a minute.', 429)
  }

  const body = await readJson(request)
  const raw = Array.isArray(body?.texts) ? body.texts : []
  const texts = raw
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .slice(0, MAX_TEXTS)
    .map((t) => t.trim().slice(0, MAX_LEN))
  if (texts.length === 0) return json({ ok: true, translations: [] })

  let translations = null
  const apiKey = env.GOOGLE_TRANSLATE_API_KEY || ''
  if (apiKey) {
    try {
      translations = await googleTranslate(apiKey, texts)
    } catch (e) {
      console.error('[admin/translate] google error:', e && e.message ? e.message : String(e))
      translations = null
    }
  }
  if (!translations) translations = await myMemoryTranslate(texts)
  if (!translations) translations = await keylessGoogleTranslate(texts)
  return json({ ok: true, translations })
}

/** Google Cloud Translation API v2 (API-key auth, batch). */
async function googleTranslate(apiKey, texts) {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, source: 'zh-CN', target: 'en', format: 'text' }),
  })
  if (!res.ok) throw new Error(`google translate http ${res.status}`)
  const data = await res.json()
  const list = data?.data?.translations
  if (!Array.isArray(list) || list.length !== texts.length) throw new Error('bad google translate response')
  return list.map((t) => (typeof t?.translatedText === 'string' ? t.translatedText.trim() : ''))
}

/** MyMemory free API — one request per text (comma-joined q would corrupt text). */
async function myMemoryTranslate(texts) {
  const out = new Array(texts.length).fill('')
  let cursor = 0
  const worker = async () => {
    while (cursor < texts.length) {
      const i = cursor++
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texts[i])}&langpair=zh-CN|en`,
          { headers: { Accept: 'application/json' } },
        )
        if (!res.ok) throw new Error(`mymemory http ${res.status}`)
        const data = await res.json()
        if (data?.responseStatus !== 200) throw new Error(`mymemory resp ${data?.responseStatus} ${data?.responseDetails || ''}`)
        const t = data?.responseData?.translatedText
        out[i] = typeof t === 'string' ? t.trim() : ''
      } catch (e) {
        const msg = e && e.message ? e.message : String(e)
        console.error('[admin/translate] mymemory error:', msg)
        out[i] = ''
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  return out.some(Boolean) ? out : null
}

/** Keyless Google translate_a endpoint (may be rate-limited from cloud IPs). */
async function keylessGoogleTranslate(texts) {
  const out = new Array(texts.length).fill('')
  let cursor = 0
  const worker = async () => {
    while (cursor < texts.length) {
      const i = cursor++
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(texts[i])}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`translate http ${res.status}`)
        const data = await res.json()
        const segments = Array.isArray(data?.[0])
          ? data[0].map((s) => (Array.isArray(s) && typeof s[0] === 'string' ? s[0] : ''))
          : []
        out[i] = segments.join('').trim()
      } catch (e) {
        const msg = e && e.message ? e.message : String(e)
        console.error('[admin/translate] keyless error:', msg)
        out[i] = ''
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  return out.some(Boolean) ? out : null
}
