// GET /api/state — the authenticated user's view of the app state.
// Instructor: full state. Student: public courses/vehicles/videos + their own
// bookings/payments/notifications + anonymized appointments (for conflicts).
//
// PUT /api/state — instructor-only full replace (transactional).
import { json, fail } from '../lib/util.js'
import { authUser } from '../lib/auth.js'
import { readFullState, writeFullState, studentView } from '../lib/db.js'

export async function onRequestGet({ env, request }) {
  const user = await authUser(env, request)
  if (!user) return fail('Not authenticated', 401)

  try {
    const state = await readFullState(env)
    if (user.role === 'instructor') return json({ ok: true, state })
    // student: find their student row id
    const studentRow = await env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(user.id).first()
    return json({ ok: true, state: studentView(state, studentRow ? studentRow.id : '') })
  } catch (e) {
    return fail(e.message || 'State unavailable', 500)
  }
}

export async function onRequestPut({ env, request }) {
  const user = await authUser(env, request)
  if (!user) return fail('Not authenticated', 401)
  if (user.role !== 'instructor') return fail('Only the instructor can update global state.', 403)

  const body = await request.json().catch(() => null)
  if (!body || !body.state) return fail('Invalid state payload.')
  await writeFullState(env, body.state)
  return json({ ok: true })
}
