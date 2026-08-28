// POST /api/admin/templates/preview — render a template with sample data.
import { json, fail, readJson } from '../../../lib/util.js'
import { authAdmin } from '../../../lib/admin.js'
import { buildContext, render } from '../../../lib/notification.js'

export async function onRequestPost({ env, request }) {
  if (!(await authAdmin(env, request))) return fail('Not authenticated', 401)
  const body = await readJson(request)
  const sample = {
    student: { name: 'John Smith', email: 'john@example.com', phone: '+1 555-0100' },
    instructor: { name: 'David Brown', email: 'david@example.com', phone: '+1 555-0199' },
    booking: { id: 'TEST-001', date: 'September 15, 2026', time: '10:00 AM', status: 'confirmed', location: 'Pickup address' },
    course: { name: 'G2 Road Test Prep', price: 60 },
  }
  const ctx = buildContext(sample)
  const subjectR = render(String(body.subject || ''), ctx)
  const htmlR = render(String(body.html_body || ''), ctx)
  const textR = render(String(body.text_body || ''), ctx)
  const unknown = [...new Set([...(subjectR.unknown || []), ...(htmlR.unknown || []), ...(textR.unknown || [])])]
  return json({ ok: true, preview: { unknown, subject: subjectR.text || '', html: htmlR.text || '', text: textR.text || '' } })
}
