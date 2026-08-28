// /api/courses/translate — translate Simplified Chinese → English (instructor).
// Used by the instructor course editor: the instructor types Chinese only;
// English is machine-translated on save. English may stay empty on failure
// (§45-46: empty English must never block saving).
import { json, fail, readJson } from '../../lib/util.js'
import { authUser } from '../../lib/auth.js'
import { checkRate } from '../../lib/rate.js'

const MAX_TEXTS = 60
const MAX_LEN = 2000

export async function onRequestPost({ env, request }) {
  const user = await authUser(env, request)
  if (!user) return fail('Not authenticated', 401)

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!(await checkRate(env, `coursetranslate:${ip}`, 60, 60 * 1000))) {
    return fail('Too many requests. Try again in a minute.', 429)
  }

  const body = await readJson(request)
  const raw = Array.isArray(body?.texts) ? body.texts : []
  const texts = raw
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .slice(0, MAX_TEXTS)
    .map((t) => t.trim().slice(0, MAX_LEN))
  if (texts.length === 0) return json({ ok: true, translations: [] })

  const { translateZhToEn } = await import('../../lib/translate.js')
  let translations = null
  try {
    translations = await translateZhToEn(env, texts)
  } catch (e) {
    console.error('[courses/translate] error:', e && e.message ? e.message : String(e))
  }
  return json({ ok: true, translations: translations || [] })
}
