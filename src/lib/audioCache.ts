const CACHE_NAME = "pb-audio-v1";

export async function isAudioCached(urls: string[]): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const matches = await Promise.all(urls.map((u) => cache.match(u)));
    return matches.every((m) => !!m);
  } catch {
    return false;
  }
}

export type CacheProgress = { done: number; total: number };

export async function cacheAudioUrls(
  urls: string[],
  onProgress?: (p: CacheProgress) => void,
): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return cacheViaApi(urls, onProgress);
  }

  return new Promise<boolean>((resolve) => {
    const sw = navigator.serviceWorker.controller!;
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "CACHE_PROGRESS") {
        onProgress?.({ done: e.data.done, total: e.data.total });
      }
      if (e.data?.type === "CACHE_COMPLETE") {
        navigator.serviceWorker.removeEventListener("message", onMessage);
        resolve(true);
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    sw.postMessage({ type: "CACHE_AUDIO", urls });

    setTimeout(() => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      resolve(false);
    }, 120_000);
  });
}

async function cacheViaApi(
  urls: string[],
  onProgress?: (p: CacheProgress) => void,
): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    for (let i = 0; i < urls.length; i++) {
      const existing = await cache.match(urls[i]);
      if (!existing) {
        const res = await fetch(urls[i]);
        if (res.ok) await cache.put(urls[i], res);
      }
      onProgress?.({ done: i + 1, total: urls.length });
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearAudioCache(): Promise<void> {
  if (!("caches" in window)) return;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    /* ignore */
  }
}
