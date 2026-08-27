// EZDRIVES — admin auth helpers (Pages Functions)
// The site admin (content manager) is a separate credential from the
// instructor/student users: one row in admin_users, sessions in admin_sessions.

const SESSION_DAYS = 30

export function newAdminToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Create an admin session; returns the opaque token. */
export async function createAdminSession(env) {
  const token = newAdminToken()
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 3600 * 1000)
  await env.DB.prepare('INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)')
    .bind(token, now.toISOString(), expires.toISOString())
    .run()
  return token
}

/** Resolve the bearer token to true when it is a live admin session. */
export async function authAdmin(env, request) {
  const header = request.headers.get('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return false
  const row = await env.DB.prepare('SELECT token FROM admin_sessions WHERE token = ? AND expires_at > ?')
    .bind(token, new Date().toISOString())
    .first()
  return !!row
}
