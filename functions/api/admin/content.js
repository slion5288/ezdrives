// /api/admin/content — read/write the editable homepage content (admin only).
// GET  → current home_content payload.
// PUT  → replace it (text overrides / hero images / instructor list).
import { json, fail, readJson } from '../../lib/util.js'
import { authAdmin } from '../../lib/admin.js'

const MAX_BODY = 4 * 1024 * 1024 // 4 MB cap for the whole payload

export async function onRequestGet({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)
  const row = await env.DB.prepare('SELECT payload FROM home_content WHERE id = 1').first()
  return json({ ok: true, content: row ? JSON.parse(row.payload) : { overrides: {}, heroImages: null, instructors: [] } })
}

export async function onRequestPut({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)

  const body = await readJson(request)
  if (!body || typeof body !== 'object') return fail('Invalid payload.')

  const content = {
    overrides: normalizeOverrides(body.overrides),
    heroImages: normalizeImages(body.heroImages),
    instructors: normalizeInstructors(body.instructors),
  }
  const size = JSON.stringify(content).length
  if (size > MAX_BODY) return fail('Content too large. Compress the images and try again.', 413)

  await env.DB.prepare('INSERT OR REPLACE INTO home_content (id, payload) VALUES (1, ?)').bind(JSON.stringify(content)).run()
  return json({ ok: true })
}

function normalizeOverrides(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('landing.') && key !== 'instructor.bio' && key !== 'instructor.name') continue
    if (value && typeof value === 'object' && typeof value.en === 'string' && typeof value.zh === 'string') {
      out[key] = { en: value.en.slice(0, 2000), zh: value.zh.slice(0, 2000) }
    }
  }
  return out
}

function normalizeImages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null
  return raw.slice(0, 8).map((v) => (typeof v === 'string' && v.startsWith('data:image/') ? v.slice(0, 900000) : ''))
}

function normalizeInstructors(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 20)
    .map((inst, index) => ({
      id: typeof inst.id === 'string' ? inst.id : `i${index + 1}`,
      name: typeof inst.name === 'string' ? inst.name.slice(0, 100) : '',
      bio: inst.bio && typeof inst.bio === 'object'
        ? { en: String(inst.bio.en || '').slice(0, 2000), zh: String(inst.bio.zh || '').slice(0, 2000) }
        : { en: '', zh: '' },
      years: Number(inst.years) || 0,
      photo: typeof inst.photo === 'string' && inst.photo.startsWith('data:image/') ? inst.photo.slice(0, 900000) : '',
    }))
    .filter((i) => i.name !== '')
}
