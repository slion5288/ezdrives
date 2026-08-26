// EZDRIVES — simple sliding-window rate limiter backed by D1.
// Bucket key is a string like 'sms:<phone>' / 'login:<identifier>'.
// Windows are fixed-aligned to `windowMs` boundaries; a stale window resets.

export async function checkRate(env, bucket, limit, windowMs) {
  const now = Date.now()
  const win = Math.floor(now / windowMs) * windowMs
  const ws = new Date(win).toISOString()

  const row = await env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE bucket = ?').bind(bucket).first()
  if (!row || row.window_start !== ws) {
    await env.DB.prepare(
      'INSERT INTO rate_limits (bucket, count, window_start) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = 1, window_start = excluded.window_start',
    ).bind(bucket, ws).run()
    return true
  }
  if (Number(row.count) >= limit) return false
  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE bucket = ? AND window_start = ?').bind(bucket, ws).run()
  return true
}
