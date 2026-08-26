// POST /api/auth/send-code — send an SMS verification code via Twilio.
// Stores the code in D1 (5-minute expiry) and text-messages the phone.
// Requires env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
import { json, fail, readJson } from '../../lib/util.js'

const CODE_TTL_MS = 5 * 60 * 1000

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const phone = String(body.phone || '').trim()
  if (phone.replace(/\D/g, '').length < 8) return fail('Please enter a valid phone number.')

  const sid = env.TWILIO_ACCOUNT_SID
  const auth = env.TWILIO_AUTH_TOKEN
  const from = env.TWILIO_FROM_NUMBER
  if (!sid || !auth || !from) {
    // Demo fallback: without credentials we still issue a code and echo it back
    // so the flow is testable; production must configure the secrets.
    const code = String(Math.floor(100000 + Math.random() * 900000))
    await env.DB.prepare('DELETE FROM verification_codes WHERE phone = ?').bind(phone).run()
    await env.DB.prepare('INSERT INTO verification_codes (phone, code, created_at, used) VALUES (?, ?, ?, 0)')
      .bind(phone, code, new Date().toISOString())
      .run()
    return json({ ok: true, demo: true, code })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  await env.DB.prepare('DELETE FROM verification_codes WHERE phone = ?').bind(phone).run()
  await env.DB.prepare('INSERT INTO verification_codes (phone, code, created_at, used) VALUES (?, ?, ?, 0)')
    .bind(phone, code, new Date().toISOString())
    .run()

  // Twilio Messages API (REST)
  const authHeader = 'Basic ' + btoa(`${sid}:${auth}`)
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const form = new URLSearchParams({ To: phone, From: from, Body: `EZDRIVES: your verification code is ${code}. Valid for 5 minutes.` })

  try {
    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Twilio errors: e.g. trial accounts can only message verified numbers (21610).
      return fail(data.message || 'SMS could not be sent.', 400)
    }
    return json({ ok: true })
  } catch (e) {
    return fail('SMS service unavailable. Please try again.', 500)
  }
}
