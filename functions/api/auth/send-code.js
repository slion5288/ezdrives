// POST /api/auth/send-code — send an SMS verification code via Twilio Verify.
// Requires the Twilio environment variables (secret_text on the Pages
// project). There is intentionally NO local "demo code" fallback: when Twilio
// is unconfigured the request fails cleanly instead of pretending to verify.
import { json, fail, readJson } from '../../lib/util.js'
import { checkRate } from '../../lib/rate.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const phone = String(body.phone || '').trim()
  if (phone.replace(/\D/g, '').length < 10) return fail('Please enter a valid phone number.')

  const sid = env.TWILIO_ACCOUNT_SID
  const auth = env.TWILIO_AUTH_TOKEN
  const verifySid = env.TWILIO_VERIFY_SERVICE_SID

  if (!sid || !auth || !verifySid || verifySid === '__PENDING__') {
    return fail('SMS service is not configured yet. Please try again later.', 503)
  }

  // Limit: max 3 send requests per phone per 10 minutes (Twilio cost guard).
  const allowed = await checkRate(env, `sms:${phone}`, 3, 10 * 60 * 1000)
  if (!allowed) return fail('Too many requests. Please wait a few minutes and try again.', 429)

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
