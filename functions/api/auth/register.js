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

  // Only one instructor account (the admin) — via setup only.
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
