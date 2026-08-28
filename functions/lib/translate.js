// ============================================================================
// EZDRIVES — Shared translation service (zh → en)
// Used by the admin content editor and the instructor course editor.
// Fallback chain (first success wins):
//   1. Google Cloud Translation API v2 (needs GOOGLE_TRANSLATE_API_KEY env).
//   2. MyMemory free API (no key; ~5k chars/day anonymous).
//   3. Keyless Google translate_a endpoint (may 429 from cloud IPs).
// ============================================================================

export const MAX_TRANSLATE_TEXTS = 50
export const MAX_TRANSLATE_LEN = 2000
const CONCURRENCY = 3

/** Translate zh → en; returns array aligned with input (empty string on failure). */
export async function translateZhToEn(env, texts) {
  const apiKey = env.GOOGLE_TRANSLATE_API_KEY || ''
  if (apiKey) {
    try {
      return await googleTranslate(apiKey, texts)
    } catch (e) {
      console.error('[translate] google error:', e && e.message ? e.message : String(e))
    }
  }
  const myMem = await myMemoryTranslate(texts)
  if (myMem) return myMem
  const keyless = await keylessGoogleTranslate(texts)
  if (keyless) return keyless
  return new Array(texts.length).fill('')
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
        const val = data?.responseData?.translatedText
        out[i] = typeof val === 'string' ? val.trim() : ''
      } catch (e) {
        const msg = e && e.message ? e.message : String(e)
        console.error('[translate] mymemory error:', msg)
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
        console.error('[translate] keyless error:', msg)
        out[i] = ''
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  return out.some(Boolean) ? out : null
}
