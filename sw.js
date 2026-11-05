// Tester Exchange service worker: makes the site installable and fast on repeat visits.
// - /assets/* and /fonts/* have content hashes in their names, so they're cached forever (GitHub Pages only allows 10 min).
// - Pages always come from the network, so a deploy is never hidden behind an old copy; offline.html only when offline.
// - Other origins (Supabase, payments, Google) are never touched.
const CACHE = 'tx-static-v1'
const OFFLINE = '/offline.html'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

async function trim(cache, max) {
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/')) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) { c.put(req, res.clone()); trim(c, 200) }
      return res
    }))
    return
  }

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE)) || Response.error()))
  }
})
