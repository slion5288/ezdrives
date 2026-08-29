// POST /api/auth/forgot — start a password reset by phone + SMS code.
// Works for students AND the instructor (both log in by phone; the instructor
// may also log in by email, but the phone is the reset channel). Reuses Twilio
// Verify so the code is real and time-limited — no demo codes.
import { json, fail, readJson } from '../../lib/util.js'
import { checkRate } from '../../lib/rate.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const phone = String(body.phone || '').trim()
  if (phone.replace(/\D/g, '').length < 10) return fail('Please enter a valid phone number.')

  const user = await env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first()
  if (!user) return fail('No account found for this phone number.')

  const sid = env.TWILIO_ACCOUNT_SID
  const auth = env.TWILIO_AUTH_TOKEN
  const verifySid = env.TWILIO_VERIFY_SERVICE_SID
  if (!sid || !auth || !verifySid || verifySid === '__PENDING__') {
    return fail('SMS service is not configured yet. Please try again later.', 503)
  }

  const allowed = await checkRate(env, `forgot:${phone}`, 3, 10 * 60 * 1000)
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
