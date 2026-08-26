// POST /api/auth/login — phone/email + password → session token + user.
import { json, fail, readJson } from '../../lib/util.js'
import { verifyPassword, createSession } from '../../lib/auth.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const identifier = String(body.phone || body.identifier || '').trim()
  const password = String(body.password || '')

  const user = await env.DB.prepare('SELECT * FROM users WHERE phone = ? OR email = ?')
    .bind(identifier, identifier)
    .first()
  if (!user) return fail('No account found for this phone number or email.')
  if (!(await verifyPassword(password, user.password_hash))) return fail('Incorrect password.')

  const token = await createSession(env, user.id)
  let studentId
  if (user.role === 'student') {
    const s = await env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(user.id).first()
    studentId = s ? s.id : undefined
  }
  return json({
    ok: true,
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email || undefined,
      address: user.address || undefined,
      studentId,
    },
  })
}
