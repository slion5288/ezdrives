// POST /api/admin/templates/test — send a real test email with sample data.
import { json, fail, readJson } from '../../../lib/util.js'
import { authAdmin } from '../../../lib/admin.js'
import { sendTestEmail } from '../../../lib/notification.js'

export async function onRequestPost({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)
  const body = await readJson(request)
  const to = String(body.to || '').trim()
  const type = String(body.type || '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail('Please enter a valid test email address.')
  const res = await sendTestEmail(env, type, to)
  return json({ ok: res.ok, status: res.status, error: res.error || null })
}
