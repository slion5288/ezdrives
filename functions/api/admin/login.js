// POST /api/admin/login — username + password → admin session token.
import { json, fail, readJson } from '../../lib/util.js'
import { verifyPassword } from '../../lib/auth.js'
import { createAdminSession } from '../../lib/admin.js'
import { checkRate } from '../../lib/rate.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const username = String(body.username || '').trim()
  const password = String(body.password || '')

  const allowed = await checkRate(env, `adminlogin:${username.toLowerCase()}`, 5, 5 * 60 * 1000)
  if (!allowed) return fail('Too many attempts. Please wait a few minutes and try again.', 429)

  const admin = await env.DB.prepare('SELECT * FROM admin_users WHERE id = 1').first()
  if (!admin || admin.username !== username || !(await verifyPassword(password, admin.password_hash))) {
    return fail('Wrong username or password.')
  }

  const token = await createAdminSession(env)
  return json({ ok: true, token })
}
