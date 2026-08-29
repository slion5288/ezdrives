// ============================================================================
// EZDRIVES — GET /api/geocode — server-side Geoapify autocomplete proxy.
// § P0: the Geoapify API key must NEVER ship in the browser bundle. The
// address field calls this endpoint; the key lives only in the
// GEOAPIFY_API_KEY environment variable (Pages secret). Unset key → empty
// suggestions (the field falls back to a plain text input).
// ============================================================================

import { json, fail } from '../lib/util.js'

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url)
  const text = (url.searchParams.get('text') || '').trim()
  if (text.length < 3) return json({ ok: true, suggestions: [] })

  const key = env.GEOAPIFY_API_KEY || ''
  if (!key) return json({ ok: true, suggestions: [] })

  try {
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&apiKey=${encodeURIComponent(key)}&filter=countrycode:ca&limit=6`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return json({ ok: true, suggestions: [] })
    const data = await res.json()
    const suggestions = (data.features || []).map((f) => ({
      formatted: f?.properties?.formatted || f?.properties?.address_line1 || '',
      lat: f?.properties?.lat ?? null,
      lon: f?.properties?.lon ?? null,
    }))
    return json({ ok: true, suggestions })
  } catch (e) {
    return json({ ok: true, suggestions: [] })
  }
}
