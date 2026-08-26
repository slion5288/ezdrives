// POST /api/auth/register — create a STUDENT account (instructor is
// provisioned by /api/setup). Real validation: unique phone, password rules.
import { json, fail, readJson } from '../../lib/util.js'
import { hashPassword, createSession, uuid } from '../../lib/auth.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const role = body.role === 'instructor' ? 'instructor' : 'student'
  const name = String(body.name || '').trim()
  const phone = String(body.phone || '').trim()
  const password = String(body.password || '')
  const address = String(body.address || '').trim() || null

  if (!name) return fail('Please enter your name.')
  if (phone.replace(/\D/g, '').length < 10) return fail('Please enter a valid phone number.')
  if (password.length < 6) return fail('Password must be at least 6 characters.')

  // SMS verification (Twilio): verify the 6-digit code.
  const smsCode = String(body.code || '').trim()
  if (!/^\d{6}$/.test(smsCode)) return fail('Enter the 6-digit SMS code.')

  const sid = env.TWILIO_ACCOUNT_SID
  const auth = env.TWILIO_AUTH_TOKEN
  const verifySid = env.TWILIO_VERIFY_SERVICE_SID

  if (sid && auth && verifySid && verifySid !== '__PENDING__') {
    // Twilio Verify: check the code the user typed.
    const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, Code: smsCode }).toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.status !== 'approved') return fail('That code does not match. Try again.')
  } else {
    // Demo fallback: local code table.
    const vc = await env.DB.prepare(
      'SELECT * FROM verification_codes WHERE phone = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
    ).bind(phone).first()
    if (!vc) return fail('Send a verification code first.')
    const age = Date.now() - new Date(vc.created_at).getTime()
    if (age > 5 * 60 * 1000) return fail('The code has expired. Send a new one.')
    if (vc.code !== smsCode) return fail('That code does not match. Try again.')
    await env.DB.prepare('UPDATE verification_codes SET used = 1 WHERE phone = ? AND code = ?').bind(phone, smsCode).run()
  }

  // Only one instructor account (the admin). The FIRST registered user may be
  // the instructor; afterwards instructor signup is closed.
  if (role === 'instructor') {
    const inst = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'instructor'").first()
    if (inst && inst.n > 0) return fail('Instructor account already exists.', 403)
  }

  const dup = await env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first()
  if (dup) return fail('This phone number is already registered.')

  const hash = await hashPassword(password)
  const userId = uuid()
  const now = new Date().toISOString()

  const stmts = [
    env.DB.prepare(
      'INSERT INTO users (id, role, name, phone, email, password_hash, avatar_color, address, registered_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)',
    ).bind(userId, role, name, phone, hash, '#3B82F6', address, now),
  ]

  if (role === 'student') {
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
    }
    stmts.push(env.DB.prepare('INSERT INTO students (id, user_id, payload) VALUES (?, ?, ?)').bind(studentId, userId, JSON.stringify(student)))
  } else {
    // Instructor registration: fill the profile row with their details.
    const row = await env.DB.prepare('SELECT payload FROM instructor WHERE id = 1').first()
    const prof = row ? JSON.parse(row.payload) : { breakMin: 10 }
    const updated = {
      ...prof,
      name,
      phone,
      email: String(body.email || '').trim() || prof.email,
      avatarColor: prof.avatarColor || '#A21CAF',
    }
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO instructor (id, payload) VALUES (1, ?)').bind(JSON.stringify(updated)))
  }
  await env.DB.batch(stmts)

  const token = await createSession(env, userId)
  let studentId
  if (role === 'student') {
    const s = await env.DB.prepare('SELECT id FROM students WHERE user_id = ?').bind(userId).first()
    studentId = s ? s.id : undefined
  }
  return json({ ok: true, token, user: { id: userId, role, name, phone, studentId } })
}
