// Offline shell for the installed app.
//
// Deliberately conservative: it only ever caches same-origin GETs, which means
// the API (a different origin, port 5001, or /api on a same-origin deploy)
// always goes to the network and no recipe or pantry data is ever served stale. Offline gets you the app shell,
// not your data.
const CACHE = 'pov-cooking-v2' // v2: drops API responses the v1 worker cached on same-origin deploys
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll is all-or-nothing; a single 404 would abort the install.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

function cacheable(response) {
  return response && response.ok && response.type === 'basic'
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Same-origin deploys (the homelab proxies /api next to the app) must never get recipes from the cache.
  if (url.pathname.startsWith('/api/')) return

  // Navigations: network first so a deploy is picked up immediately, falling
  // back to the cached shell when offline. React Router handles the path.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (cacheable(response)) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() => caches.match('/index.html').then((hit) => hit || Response.error()))
    )
    return
  }

  // Static assets are content-hashed by Vite, so a cache hit is always current.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (cacheable(response)) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
    )
  )
})
