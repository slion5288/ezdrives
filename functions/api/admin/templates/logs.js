// GET /api/admin/templates/logs — recent notification log entries (admin).
import { json, fail } from '../../../lib/util.js'
import { authAdmin } from '../../../lib/admin.js'

export async function onRequestGet({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)
  const rows = await env.DB.prepare(
    'SELECT id, type, recipient_email, template_id, subject, status, error_message, student_id, instructor_id, booking_id, sent_at, created_at FROM notification_logs ORDER BY rowid DESC LIMIT 50',
  ).all()
  return json({ ok: true, logs: rows.results || [] })
}
