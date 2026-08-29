// EZDRIVES — service worker (PWA)
//
// CACHE POLICY (v2 — data-consistency fix):
//  · /assets/* (hashed, immutable filenames) → cache-first. Safe: the hash
//    changes on every deploy, so a cached asset can never go stale.
//  · Navigation requests (HTML shell) → network-first, cache fallback ONLY
//    when offline. The shell is served with `Cache-Control: no-cache` so the
//    browser revalidates it; the fallback copy is just an offline page.
//  · /api/* and ANY other request → network-only. Dynamic, often
//    user-specific data must NEVER be stored in (or served from) this shared
//    cache — a stale API response (or another student's data) would otherwise
//    surface whenever the network hiccups.
//
// v1 cached every successful GET — including /api/state and /api/public/home —
// and served those stale responses on network failure. Bumping the cache name
// to v2 makes activate() delete the polluted v1 cache on first load.

const CACHE = 'ezdrives-v2'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-192-round.png', '/icons/icon-512-round.png', '/icons/icon-wide.png', '/icons/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Dynamic / user-specific endpoints: NEVER cache, NEVER fall back to cache.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req))
    return
  }

  // Hashed assets: cache-first (immutable by filename).
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy))
        return res
      })),
    )
    return
  }

  // Shell / navigations: network-first, offline fallback to the cached copy.
  // Only document requests may fall back to cache; other same-origin GETs
  // (e.g. /manifest, /hero images) stay network-only so nothing stale is ever
  // served from this cache.
  const isNavigate = req.mode === 'navigate'
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && isNavigate) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() => (isNavigate ? caches.match(req).then((hit) => hit || caches.match('/index.html')) : Response.error())),
  )
})
