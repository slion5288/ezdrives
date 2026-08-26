// POST /api/auth/register — create a STUDENT account (the instructor account
// is a pre-provisioned single row; instructor registration via this endpoint
// is closed). Real validation: unique phone, SMS verification, password rules.
import { json, fail, readJson } from '../../lib/util.js'
import { hashPassword, createSession, uuid } from '../../lib/auth.js'
import { icsToken } from '../../lib/db.js'
import { checkRate } from '../../lib/rate.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const name = String(body.name || '').trim()
  const phone = String(body.phone || '').trim()
  const password = String(body.password || '')
  const address = String(body.address || '').trim() || null

  if (!name) return fail('Please enter your name.')
  if (phone.replace(/\D/g, '').length < 10) return fail('Please enter a valid phone number.')
  if (password.length < 6) return fail('Password must be at least 6 characters.')

  // Instructor accounts are provisioned by the system only — no open signup
  // channel (single-instructor deployment).
  if (body.role === 'instructor') return fail('Instructor account already exists.', 403)

  // Limit: max 5 registration attempts per phone per 10 minutes.
  const allowed = await checkRate(env, `register:${phone}`, 5, 10 * 60 * 1000)
  if (!allowed) return fail('Too many requests. Please wait a few minutes and try again.', 429)

  // SMS verification (Twilio Verify): check the 6-digit code.
  const smsCode = String(body.code || '').trim()
  if (!/^\d{6}$/.test(smsCode)) return fail('Enter the 6-digit SMS code.')

  const sid = env.TWILIO_ACCOUNT_SID
  const auth = env.TWILIO_AUTH_TOKEN
  const verifySid = env.TWILIO_VERIFY_SERVICE_SID

  if (sid && auth && verifySid && verifySid !== '__PENDING__') {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, Code: smsCode }).toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.status !== 'approved') return fail('That code does not match. Try again.')
  } else {
    return fail('SMS service is not configured yet. Please try again later.', 503)
  }

  const dup = await env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first()
  if (dup) return fail('This phone number is already registered.')

  const hash = await hashPassword(password)
  const userId = uuid()
  const now = new Date().toISOString()

  const maxRow = await env.DB.prepare('SELECT id FROM students ORDER BY CAST(SUBSTR(id, 2) AS INTEGER) DESC LIMIT 1').first()
  const maxNum = maxRow ? Number(maxRow.id.slice(1)) : 0
  const studentId = 's' + (maxNum + 1)
  const student = {
    id: studentId,
    name,
    phone,
    address: address || undefined,
    registeredAt: now,
    avatarColor: '#3B82F6',
    icsToken: icsToken(),
  }

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO users (id, role, name, phone, email, password_hash, avatar_color, address, registered_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)',
    ).bind(userId, 'student', name, phone, hash, '#3B82F6', address, now),
    env.DB.prepare('INSERT INTO students (id, user_id, payload) VALUES (?, ?, ?)').bind(studentId, userId, JSON.stringify(student)),
  ])

  const token = await createSession(env, userId)
  return json({ ok: true, token, user: { id: userId, role: 'student', name, phone, studentId } })
}
