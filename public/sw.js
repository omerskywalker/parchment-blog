const CACHE_NAME = "pb-audio-v1";
const AUDIO_URL_RE = /\.amazonaws\.com\/audio\//;
const MAX_CACHE_BYTES = 200 * 1024 * 1024;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("pb-audio-") && k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!AUDIO_URL_RE.test(event.request.url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      }),
    ),
  );
});

self.addEventListener("message", async (event) => {
  if (event.data?.type === "CACHE_AUDIO") {
    const { urls } = event.data;
    if (!Array.isArray(urls)) return;
    const cache = await caches.open(CACHE_NAME);
    let done = 0;
    for (const url of urls) {
      try {
        const existing = await cache.match(url);
        if (!existing) {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        }
      } catch {
        /* best-effort */
      }
      done++;
      event.source?.postMessage({ type: "CACHE_PROGRESS", done, total: urls.length });
    }
    event.source?.postMessage({ type: "CACHE_COMPLETE" });
  }

  if (event.data?.type === "EVICT_STALE") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      let totalSize = 0;
      const entries = [];
      for (const req of keys) {
        const res = await cache.match(req);
        if (!res) continue;
        const blob = await res.clone().blob();
        entries.push({ req, size: blob.size, date: new Date(res.headers.get("date") || 0) });
        totalSize += blob.size;
      }
      if (totalSize <= MAX_CACHE_BYTES) return;
      entries.sort((a, b) => a.date.getTime() - b.date.getTime());
      while (totalSize > MAX_CACHE_BYTES && entries.length > 0) {
        const oldest = entries.shift();
        if (!oldest) break;
        await cache.delete(oldest.req);
        totalSize -= oldest.size;
      }
    } catch {
      /* ignore */
    }
  }
});
