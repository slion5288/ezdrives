// POST /api/auth/login — phone/email + password → session token + user.
// Rate-limited; identical error messages for unknown account vs wrong
// password (no account enumeration).
import { json, fail, readJson } from '../../lib/util.js'
import { verifyPassword, createSession } from '../../lib/auth.js'
import { checkRate } from '../../lib/rate.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const identifier = String(body.phone || body.identifier || '').trim()
  const password = String(body.password || '')

  // § P1#15: normalize the phone — tolerate spaces, dashes, leading +1, and a
  // bare local number (10 digits). Email identifiers are matched as-is.
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
  const digitsOnly = identifier.replace(/\D/g, '')
  const normalizedPhone = digitsOnly.length >= 10
    ? (digitsOnly.length === 10 ? '+1' : '+') + digitsOnly
    : null

  // Limit: max 10 attempts per identifier per 5 minutes.
  const allowed = await checkRate(env, `login:${identifier.toLowerCase()}`, 10, 5 * 60 * 1000)
  if (!allowed) return fail('Too many attempts. Please wait a few minutes and try again.', 429)

  let user = await env.DB.prepare('SELECT * FROM users WHERE phone = ? OR email = ?')
    .bind(identifier, identifier)
    .first()
  if (!user && normalizedPhone) {
    // match the stored format (e.g. '+1 226-606-2880') against the normalized digits
    user = await env.DB.prepare(
      "SELECT * FROM users WHERE REPLACE(REPLACE(phone, ' ', ''), '-', '') = ?",
    ).bind(normalizedPhone.replace(/\s/g, '')).first()
  }
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return fail('Wrong phone number/email or password.')
  }

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
