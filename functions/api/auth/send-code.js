// POST /api/auth/send-code — send an SMS verification code.
// Uses Twilio Verify (official template, works on trial accounts) when the
// Verify service + credentials are configured; otherwise falls back to a
// local demo code (returned in the response so the flow is testable).
import { json, fail, readJson } from '../../lib/util.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const phone = String(body.phone || '').trim()
  if (phone.replace(/\D/g, '').length < 8) return fail('Please enter a valid phone number.')

  const sid = env.TWILIO_ACCOUNT_SID
  const auth = env.TWILIO_AUTH_TOKEN
  const verifySid = env.TWILIO_VERIFY_SERVICE_SID

  if (!sid || !auth || !verifySid || verifySid === '__PENDING__') {
    // Demo fallback (no credentials configured yet).
    const code = String(Math.floor(100000 + Math.random() * 900000))
    await env.DB.prepare('DELETE FROM verification_codes WHERE phone = ?').bind(phone).run()
    await env.DB.prepare('INSERT INTO verification_codes (phone, code, created_at, used) VALUES (?, ?, ?, 0)')
      .bind(phone, code, new Date().toISOString())
      .run()
    return json({ ok: true, demo: true, code })
  }

  // Twilio Verify: send the official verification-code SMS.
  try {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/Verifications`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, Channel: 'sms' }).toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return fail(data.message || 'SMS could not be sent.', 400)
    return json({ ok: true })
  } catch (e) {
    return fail('SMS service unavailable. Please try again.', 500)
  }
}
