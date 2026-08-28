// /api/admin/templates — list templates + email status (GET) / save one (PUT).
import { json, fail, readJson } from '../../../lib/util.js'
import { authAdmin } from '../../../lib/admin.js'
import { VARIABLES } from '../../../lib/notification.js'

const SECURE_TYPES = new Set(['PASSWORD_RESET', 'IMPORTANT_ACCOUNT'])

export async function onRequestGet({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)
  const rows = await env.DB.prepare('SELECT id, type, name, subject, html_body, text_body, enabled, is_system, updated_at FROM notification_templates ORDER BY type').all()
  const configured = !!((env.CLOUDFLARE_EMAIL_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID) || (env.EMAIL && typeof env.EMAIL.send === 'function'))
  return json({
    ok: true,
    templates: (rows.results || []).map((r) => ({ ...r, enabled: !!r.enabled, is_system: !!r.is_system })),
    variables: VARIABLES,
    emailStatus: {
      provider: 'Cloudflare Email Service (REST API)',
      domain: env.EMAIL_FROM_DOMAIN || 'ezdrives.net',
      from: `notifications@${env.EMAIL_FROM_DOMAIN || 'ezdrives.net'}`,
      configured,
    },
  })
}

export async function onRequestPut({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)
  const body = await readJson(request)
  const id = String(body.id || '').trim()
  if (!id) return fail('Missing template id.')
  const existing = await env.DB.prepare('SELECT * FROM notification_templates WHERE id = ?').bind(id).first()
  if (!existing) return fail('Template not found.')

  const subject = String(body.subject ?? existing.subject).slice(0, 500)
  const htmlBody = String(body.html_body ?? existing.html_body).slice(0, 20000)
  const textBody = String(body.text_body ?? existing.text_body).slice(0, 10000)
  const enabled = body.enabled === undefined ? !!existing.enabled : !!body.enabled
  if (!enabled && SECURE_TYPES.has(existing.type)) return fail('This security-critical template cannot be disabled.')

  await env.DB.prepare(
    'UPDATE notification_templates SET subject = ?, html_body = ?, text_body = ?, enabled = ?, updated_at = ? WHERE id = ?',
  ).bind(subject, htmlBody, textBody, enabled ? 1 : 0, new Date().toISOString(), id).run()
  return json({ ok: true })
}
