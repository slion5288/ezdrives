// ============================================================================
// EZDRIVES — NotificationService (email notifications, server-side only)
// Central, template-driven email sending. Business code never writes email
// content — it only calls sendNotification(type, context).
//
// Pipeline:
//   sendNotification(type, context)
//     → load template from DB (notification_templates)
//     → validate {{variables}} against the whitelist
//     → render subject / html / text
//     → idempotency check (one event → one email)
//     → Cloudflare Email Sending (env.EMAIL.send_email binding) or REST
//     → write notification_logs (pending|sent|failed)
//
// Failure isolation: an email failure NEVER fails the business operation
// (booking/registration already succeeded). It is recorded as FAILED.
// When Email Sending is not configured, it logs FAILED("not configured").
// ============================================================================

const COMPANY = { name: 'EZDRIVES', email: 'notifications@ezdrives.net', phone: '' }

/** Whitelist of template variables (must match exactly what admins may use). */
const VARIABLES = [
  'student_first_name', 'student_last_name', 'student_name', 'student_email', 'student_phone',
  'instructor_name', 'instructor_email', 'instructor_phone',
  'booking_date', 'booking_time', 'booking_location', 'booking_status', 'booking_id',
  'course_name', 'course_price',
  'company_name', 'company_email', 'company_phone', 'website_url',
]

function pad2(n) { return String(n).padStart(2, '0') }
/** Local wall-clock ISO (no timezone) — matches the app's datetime convention. */
export function toLocalISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** next sequence id: prefix + max numeric suffix + 1 */
async function nextSeq(env, table, idCol, prefix, limit = 100000) {
  const row = await env.DB.prepare(
    `SELECT ${idCol} FROM ${table} WHERE ${idCol} LIKE ? ORDER BY CAST(SUBSTR(${idCol}, ${prefix.length + 1}) AS INTEGER) DESC LIMIT 1`,
  ).bind(`${prefix}%`).first()
  const max = row ? Number(row[idCol].slice(prefix.length)) : 0
  return `${prefix}${max + 1}`
}

/** Build the {{variable}} context from business data. */
export function buildContext(ctx) {
  const student = ctx.student || {}
  const instructor = ctx.instructor || {}
  const booking = ctx.booking || {}
  const course = ctx.course || {}
  const fullName = student.name || ''
  const parts = fullName.split(/\s+/).filter(Boolean)
  return {
    student_first_name: parts[0] || fullName,
    student_last_name: parts.slice(1).join(' ') || '',
    student_name: fullName,
    student_email: student.email || '',
    student_phone: student.phone || '',
    instructor_name: instructor.name || '',
    instructor_email: instructor.email || '',
    instructor_phone: instructor.phone || '',
    booking_date: booking.date || '',
    booking_time: booking.time || '',
    booking_location: booking.location || '',
    booking_status: booking.status || '',
    booking_id: booking.id || '',
    course_name: course.name || '',
    course_price: course.price != null ? `$${course.price}` : '',
    company_name: COMPANY.name,
    company_email: COMPANY.email,
    company_phone: COMPANY.phone,
    website_url: 'https://ezdrives.net',
  }
}

/** Replace {{var}} with values; returns null if an unknown variable is used. */
export function render(template, values) {
  let out = template
  const unknown = []
  const re = /\{\{\s*([a-z_]+)\s*\}\}/g
  out = out.replace(re, (m, name) => {
    if (!(name in values)) { unknown.push(name); return m }
    return values[name]
  })
  if (unknown.length) return { unknown }
  return { text: out }
}

/** Load a template by notification type. */
async function loadTemplate(env, type) {
  return env.DB.prepare('SELECT * FROM notification_templates WHERE type = ?').bind(type).first()
}

/** Idempotency: has this (type, booking, recipient) already been sent? */
async function alreadySent(env, type, bookingId, recipientEmail) {
  if (!bookingId) return false
  const row = await env.DB
    .prepare("SELECT id FROM notification_logs WHERE type = ? AND booking_id = ? AND recipient_email = ? AND status = 'sent'")
    .bind(type, bookingId, recipientEmail)
    .first()
  return !!row
}

async function writeLog(env, log) {
  const id = await nextSeq(env, 'notification_logs', 'id', 'nl')
  const now = toLocalISO(new Date())
  await env.DB.prepare(
    `INSERT OR REPLACE INTO notification_logs
       (id, type, recipient_email, template_id, subject, status, error_message, student_id, instructor_id, booking_id, sent_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, log.type, log.recipientEmail, log.templateId || null, log.subject || '', log.status,
    log.error || null, log.studentId || null, log.instructorId || null, log.bookingId || null,
    log.status === 'sent' ? now : null, now,
  ).run()
}

/**
 * Send one email via Cloudflare Email Sending.
 * env.EMAIL is the send_email binding ({ send({ from, to, subject, html, text }) }).
 * When the binding is missing, we log FAILED("email service not configured")
 * — business flow is never blocked.
 */
async function dispatch(env, { from, to, subject, html, text }) {
  const email = env.EMAIL
  if (!email || typeof email.send !== 'function') {
    return { ok: false, error: 'Email service not configured (send_email binding missing)' }
  }
  try {
    await email.send({ from, to: [{ email: to }], subject, html, text })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) }
  }
}

/**
 * Main entry. Send a template-based email for one notification event.
 * Returns { ok, status } — never throws.
 */
export async function sendNotification(env, event) {
  const type = event.type
  const context = buildContext(event)
  const recipient = event.recipientEmail || context.student_email || context.instructor_email
  const baseLog = {
    type,
    recipientEmail: recipient || '(missing)',
    studentId: event.student ? event.student.id : null,
    instructorId: event.instructor ? (event.instructor.id || 'instructor') : null,
    bookingId: event.booking ? event.booking.id : null,
  }

  // 1) Recipient must have an email.
  if (!recipient) {
    await writeLog(env, { ...baseLog, status: 'failed', error: 'No email address for recipient' })
    return { ok: false, status: 'failed', error: 'No email address for recipient' }
  }

  // 2) Template must exist.
  const tpl = await loadTemplate(env, type)
  if (!tpl) {
    await writeLog(env, { ...baseLog, status: 'failed', error: `Template not found for type ${type}` })
    return { ok: false, status: 'failed', error: `Template not found: ${type}` }
  }
  if (!tpl.enabled) {
    await writeLog(env, { ...baseLog, status: 'failed', error: 'Template disabled' })
    return { ok: false, status: 'failed', error: 'Template disabled' }
  }

  // 3) Validate variables.
  const subjectR = render(tpl.subject, context)
  const htmlR = render(tpl.html_body, context)
  const textR = render(tpl.text_body, context)
  const bad = [...(subjectR.unknown || []), ...(htmlR.unknown || []), ...(textR.unknown || [])]
  if (bad.length) {
    await writeLog(env, { ...baseLog, status: 'failed', error: `Unknown template variables: ${[...new Set(bad)].join(', ')}` })
    return { ok: false, status: 'failed', error: `Unknown variables: ${bad.join(', ')}` }
  }

  // 4) Idempotency.
  if (await alreadySent(env, type, baseLog.bookingId, recipient)) {
    return { ok: true, status: 'skipped' }
  }

  // 5) Send.
  const from = { email: env.EMAIL_FROM_DOMAIN ? `notifications@${env.EMAIL_FROM_DOMAIN}` : COMPANY.email, name: COMPANY.name }
  const res = await dispatch(env, {
    from,
    to: recipient,
    subject: subjectR.text,
    html: htmlR.text,
    text: textR.text,
  })

  // 6) Log.
  await writeLog(env, {
    ...baseLog,
    templateId: tpl.id,
    subject: subjectR.text,
    status: res.ok ? 'sent' : 'failed',
    error: res.ok ? null : res.error,
  })
  return { ok: res.ok, status: res.ok ? 'sent' : 'failed', error: res.error }
}

/** Send an admin "test email" using sample data (never touches real students). */
export async function sendTestEmail(env, type, toEmail) {
  const sample = {
    student: { name: 'John Smith', email: 'john@example.com', phone: '+1 555-0100' },
    instructor: { name: 'David Brown', email: 'david@example.com', phone: '+1 555-0199' },
    booking: { id: 'TEST-001', date: 'September 15, 2026', time: '10:00 AM', status: 'confirmed', location: 'Pickup address' },
    course: { name: 'G2 Road Test Prep', price: 60 },
  }
  return sendNotification(env, { type, recipientEmail: toEmail, ...sample })
}

export { VARIABLES }
