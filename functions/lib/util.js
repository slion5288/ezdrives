// EZDRIVES — API helpers (Pages Functions)
// JSON responses + CORS for /api/*. Same-origin in production; permissive
// CORS only matters for the local vite dev proxy (localhost:5173).

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export function fail(message, status = 400) {
  return json({ ok: false, error: message }, status)
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

export function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
