// POST /api/auth/logout — invalidate the current session token.
import { json } from '../../lib/util.js'
import { deleteSession } from '../../lib/auth.js'

export async function onRequestPost({ env, request }) {
  const header = request.headers.get('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (token) await deleteSession(env, token)
  return json({ ok: true })
}
