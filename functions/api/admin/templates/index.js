// /api/admin/templates — list templates + email status (GET) / save one (PUT).
import { json, fail, readJson } from '../../../lib/util.js'
import { authAdmin } from '../../../lib/admin.js'
import { VARIABLES } from '../../../lib/notification.js'

const SECURE_TYPES = new Set(['PASSWORD_RESET', 'IMPORTANT_ACCOUNT'])

export async function onRequestGet({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)
  const rows = await env.DB.prepare('SELECT id, type, name, subject, html_body, text_body, subject_zh, body_zh, enabled, is_system, updated_at FROM notification_templates ORDER BY type').all()
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

/** Build the bilingual subject/html/text from Chinese-only content + EN. */
function buildBilingual(zhSubject, zhBody, enSubject, enBody) {
  const nl = (s) => String(s || '').replace(/\r?\n/g, '<br/>')
  const subject = `${enSubject} / ${zhSubject}`
  const htmlBody =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917">` +
    `<h2 style="color:#A21CAF;margin:0 0 12px">${enSubject}</h2>` +
    `<div style="font-size:15px;line-height:1.7">${nl(enBody)}</div>` +
    `<hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/>` +
    `<h2 style="color:#A21CAF;margin:0 0 12px">${zhSubject}</h2>` +
    `<div style="font-size:15px;line-height:1.7">${nl(zhBody)}</div>` +
    `</div>`
  const textBody = `${enSubject}\n\n${enBody}\n\n---\n\n${zhSubject}\n${zhBody}`
  return { subject, htmlBody, textBody }
}

export async function onRequestPut({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)
  const body = await readJson(request)
  const id = String(body.id || '').trim()
  if (!id) return fail('Missing template id.')
  const existing = await env.DB.prepare('SELECT * FROM notification_templates WHERE id = ?').bind(id).first()
  if (!existing) return fail('Template not found.')

  const enabled = body.enabled === undefined ? !!existing.enabled : !!body.enabled
  if (!enabled && SECURE_TYPES.has(existing.type)) return fail('This security-critical template cannot be disabled.')

  // § user decision: the admin edits CHINESE ONLY; English is auto-translated
  // before the bilingual email is rebuilt. The frontend translates in the
  // browser (MyMemory from the admin's IP — reliable); when only Chinese is
  // sent the server tries its own chain as a fallback. Legacy raw editing
  // (subject/html_body/text_body) still works when no Chinese fields are sent.
  if (typeof body.subject_zh === 'string' && typeof body.body_zh === 'string') {
    const zhSubject = body.subject_zh.trim().slice(0, 200)
    const zhBody = body.body_zh.trim().slice(0, 5000)
    if (!zhSubject) return fail('请填写中文主题。')
    let enSubject = typeof body.subject_en === 'string' ? body.subject_en.trim() : ''
    let enBody = typeof body.body_en === 'string' ? body.body_en.trim() : ''
    if (!enSubject || !enBody) {
      const { translateZhToEn } = await import('../../../lib/translate.js')
      const [s, b] = await translateZhToEn(env, [zhSubject, zhBody])
      enSubject = enSubject || s
      enBody = enBody || b
    }
    if (!enSubject || !enBody) return fail('英文自动翻译失败，请重试。')
    const built = buildBilingual(zhSubject, zhBody, enSubject, enBody)
    await env.DB.prepare(
      'UPDATE notification_templates SET subject_zh = ?, body_zh = ?, subject = ?, html_body = ?, text_body = ?, enabled = ?, updated_at = ? WHERE id = ?',
    ).bind(zhSubject, zhBody, built.subject, built.htmlBody, built.textBody, enabled ? 1 : 0, new Date().toISOString(), id).run()
    return json({ ok: true })
  }

  // Legacy raw path (subject/html_body/text_body).
  const subject = String(body.subject ?? existing.subject).slice(0, 500)
  const htmlBody = String(body.html_body ?? existing.html_body).slice(0, 20000)
  const textBody = String(body.text_body ?? existing.text_body).slice(0, 10000)
  await env.DB.prepare(
    'UPDATE notification_templates SET subject = ?, html_body = ?, text_body = ?, enabled = ?, updated_at = ? WHERE id = ?',
  ).bind(subject, htmlBody, textBody, enabled ? 1 : 0, new Date().toISOString(), id).run()
  return json({ ok: true })
}
