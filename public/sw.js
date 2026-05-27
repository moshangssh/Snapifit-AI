// SnapFit AI — 轻量 Service Worker
// 策略:静态资源 cache-first;导航请求 network-first + 离线 fallback;API 不缓存。
// 改 CACHE_VERSION 即可强制淘汰旧缓存。

const CACHE_VERSION = "v1"
const STATIC_CACHE = `snapfit-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `snapfit-runtime-${CACHE_VERSION}`
const OFFLINE_URL = "/offline.html"

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("snapfit-") && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting()
})

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true
  if (url.pathname.startsWith("/icon")) return true
  if (url.pathname === "/apple-icon" || url.pathname.startsWith("/apple-icon/")) return true
  if (url.pathname === "/manifest.webmanifest") return true
  return /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)
}

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // API 不缓存,直接走网络
  if (url.pathname.startsWith("/api/")) return

  // 导航请求:network-first,失败回退离线页
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE)
        const offline = await cache.match(OFFLINE_URL)
        return offline || new Response("Offline", { status: 503, statusText: "Offline" })
      }),
    )
    return
  }

  // 静态资源:cache-first,后台再 revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const networkFetch = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || networkFetch
      }),
    )
  }
})
