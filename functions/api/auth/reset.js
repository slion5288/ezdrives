// POST /api/auth/reset — verify the SMS code and set a NEW password.
// The 6-digit code comes from Twilio Verify (same service used for
// registration); once approved the password hash is replaced in place.
import { json, fail, readJson } from '../../lib/util.js'
import { hashPassword } from '../../lib/auth.js'
import { checkRate } from '../../lib/rate.js'

export async function onRequestPost({ env, request }) {
  const body = await readJson(request)
  const phone = String(body.phone || '').trim()
  const code = String(body.code || '').trim()
  const password = String(body.password || '')

  if (phone.replace(/\D/g, '').length < 10) return fail('Please enter a valid phone number.')
  if (!/^\d{6}$/.test(code)) return fail('Enter the 6-digit SMS code.')
  if (password.length < 6) return fail('Password must be at least 6 characters.')

  const user = await env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first()
  if (!user) return fail('No account found for this phone number.')

  const sid = env.TWILIO_ACCOUNT_SID
  const auth = env.TWILIO_AUTH_TOKEN
  const verifySid = env.TWILIO_VERIFY_SERVICE_SID
  if (!sid || !auth || !verifySid || verifySid === '__PENDING__') {
    return fail('SMS service is not configured yet. Please try again later.', 503)
  }

  const allowed = await checkRate(env, `forgot:${phone}`, 10, 10 * 60 * 1000)
  if (!allowed) return fail('Too many requests. Please wait a few minutes and try again.', 429)

  try {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, Code: code }).toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.status !== 'approved') return fail('That code does not match. Try again.')
  } catch (e) {
    return fail('SMS service unavailable. Please try again.', 500)
  }

  const hash = await hashPassword(password)
  await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hash, user.id).run()
  return json({ ok: true })
}
