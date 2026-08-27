// GET /api/public/home — public homepage data (no auth): real courses, videos,
// vehicles, instructor profile and the admin-edited homepage content, so
// visitors never see placeholder/seed data.
import { json } from '../../lib/util.js'
import { readFullState, publicView } from '../../lib/db.js'

export async function onRequestGet({ env }) {
  try {
    const state = await readFullState(env)
    return json({ ok: true, state: publicView(state) })
  } catch (e) {
    return json({ ok: false, error: e.message || 'State unavailable' }, 500)
  }
}
