// POST /api/admin/password — change the admin password (admin only).
// Requires the current password; new password min 8 chars. PBKDF2-hashed.
import { json, fail, readJson } from '../../lib/util.js'
import { authAdmin } from '../../lib/admin.js'
import { hashPassword, verifyPassword } from '../../lib/auth.js'

export async function onRequestPost({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)

  const body = await readJson(request)
  const oldPassword = String(body.oldPassword || '')
  const newPassword = String(body.newPassword || '')
  if (newPassword.length < 8) return fail('New password must be at least 8 characters.')
  if (newPassword.length > 72) return fail('New password is too long.')

  const admin = await env.DB.prepare('SELECT * FROM admin_users WHERE id = 1').first()
  if (!admin || !(await verifyPassword(oldPassword, admin.password_hash))) {
    return fail('Current password is incorrect.')
  }

  const hash = await hashPassword(newPassword)
  await env.DB.prepare('UPDATE admin_users SET password_hash = ? WHERE id = 1').bind(hash).run()
  return json({ ok: true })
}
