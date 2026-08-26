// EZDRIVES — authentication helpers (Pages Functions)
// PBKDF2 password hashing via Web Crypto + opaque session tokens in D1.

const enc = new TextEncoder()

const ITERATIONS = 100000
const SALT_BYTES = 16
const KEY_BITS = 256
const SESSION_DAYS = 30

export function uuid() {
  // 'u' + 24 random base64url chars
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return 'u' + btoa(s).replace(/[+/=]/g, '').slice(0, 24)
}

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function deriveKey(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

const b64 = (bytes) => btoa(String.fromCharCode(...bytes))

/** Store format: base64url(salt).base64url(derivedKey) */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await deriveKey(password, salt)
  return `${b64(salt)}.${b64(key)}`
}

export async function verifyPassword(password, stored) {
  if (!stored || !stored.includes('.')) return false
  const [saltB64, keyB64] = stored.split('.')
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
  const key = await deriveKey(password, salt)
  return b64(key) === keyB64
}

/** Create a session row; returns the opaque token. */
export async function createSession(env, userId) {
  const token = newToken()
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 3600 * 1000)
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, now.toISOString(), expires.toISOString())
    .run()
  return token
}

export async function deleteSession(env, token) {
  if (!token) return
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
}

/** Resolve the bearer token to a user row (or null). */
export async function authUser(env, request) {
  const header = request.headers.get('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const row = await env.DB.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?',
  )
    .bind(token, new Date().toISOString())
    .first()
  return row || null
}
