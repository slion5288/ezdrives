// POST /api/setup — initialize a fresh D1 database once.
// Creates demo accounts + seeds business data. Refuses to run twice.
import { json, fail } from '../lib/util.js'
import { hashPassword, createSession } from '../lib/auth.js'
import { seedState } from '../lib/seed.js'

export async function onRequestPost({ env }) {
  const existing = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first()
  if (existing && existing.n > 0) {
    return fail('System already initialized', 409)
  }

  const state = seedState()

  // Pre-compute password hashes, then run everything in one atomic batch.
  const instHash = await hashPassword('demo123')
  const studentHash = await hashPassword('demo1234')
  const stmts = []

  stmts.push(
    env.DB.prepare(
      "INSERT INTO users (id, role, name, phone, email, password_hash, avatar_color, registered_at) VALUES (?, 'instructor', ?, ?, ?, ?, ?, ?)",
    ).bind('u-instructor', 'Michael Reeves', '+1 416-555-0142', 'michael@ezdrives.ca', instHash, '#2563EB', new Date().toISOString()),
  )

  for (const s of state.students) {
    stmts.push(
      env.DB.prepare(
        "INSERT INTO users (id, role, name, phone, email, password_hash, avatar_color, address, registered_at) VALUES (?, 'student', ?, ?, ?, ?, ?, ?, ?)",
      ).bind('u-' + s.id, s.name, s.phone, s.email || null, studentHash, s.avatarColor, s.address || null, s.registeredAt),
    )
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO students (id, user_id, payload) VALUES (?, ?, ?)').bind(s.id, 'u-' + s.id, JSON.stringify(s)))
  }

  if (state.instructor) {
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO instructor (id, payload) VALUES (1, ?)').bind(JSON.stringify(state.instructor)))
  }
  for (const r of state.weeklyRules) stmts.push(env.DB.prepare('INSERT INTO weekly_rules (payload) VALUES (?)').bind(JSON.stringify(r)))
  for (const e of state.exceptions) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO day_exceptions (date, payload) VALUES (?, ?)').bind(e.date, JSON.stringify(e)))
  for (const c of state.courses) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO courses (id, active, payload) VALUES (?, ?, ?)').bind(c.id, c.active ? 1 : 0, JSON.stringify(c)))
  for (const v of state.vehicles) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO vehicles (id, active, payload) VALUES (?, ?, ?)').bind(v.id, v.active ? 1 : 0, JSON.stringify(v)))
  for (const a of state.appointments) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO appointments (id, student_id, start_iso, status, payload) VALUES (?, ?, ?, ?, ?)').bind(a.id, a.studentId, a.start, a.status, JSON.stringify(a)))
  for (const p of state.payments) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO payments (id, student_id, status, payload) VALUES (?, ?, ?, ?)').bind(p.id, p.studentId, p.status, JSON.stringify(p)))
  for (const n of state.notifications) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO notifications (id, role, recipient_id, payload) VALUES (?, ?, ?, ?)').bind(n.id, n.role, n.recipientId, JSON.stringify(n)))

  await env.DB.batch(stmts)

  // Auto-login as instructor for convenience
  const token = await createSession(env, 'u-instructor')
  return json({
    ok: true,
    message: 'System initialized',
    accounts: {
      instructor: { phone: '+1 416-555-0142', password: 'demo123' },
      students: { password: 'demo1234' },
    },
    token,
    user: { id: 'u-instructor', role: 'instructor', name: 'Michael Reeves' },
  })
}
