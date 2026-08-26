// POST /api/setup — initialize a fresh D1 database once (EMPTY, no demo seed).
// Creates a placeholder instructor profile so the app renders; the real
// instructor registers their own account through the login page.
import { json, fail } from '../lib/util.js'

export async function onRequestPost({ env }) {
  const existing = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first()
  if (existing && existing.n > 0) {
    return fail('System already initialized', 409)
  }

  const placeholder = {
    name: 'Instructor',
    phone: '',
    email: '',
    bio: { en: 'Certified driving instructor.', zh: '持牌驾驶教练。' },
    rating: 5,
    yearsExperience: 1,
    avatarColor: '#A21CAF',
    breakMin: 10,
  }
  await env.DB.prepare('INSERT OR REPLACE INTO instructor (id, payload) VALUES (1, ?)').bind(JSON.stringify(placeholder)).run()
  return json({ ok: true, message: 'System initialized (empty)' })
}
