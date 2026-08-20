import {
  APP_PATHS,
  APP_VERSION,
  ESSENTIAL_APP_PATHS,
  OPTIONAL_APP_PATHS
} from "./js/pwaConfig.js";
import { selectCacheStrategy } from "./js/pwaPolicy.js";

const CACHE_PREFIX = "defectosng-";
const PRECACHE_NAME = `${CACHE_PREFIX}precache-v${APP_VERSION}`;
const RUNTIME_CACHE_NAME = `${CACHE_PREFIX}runtime-v${APP_VERSION}`;
const MAX_RUNTIME_ENTRIES = 80;
const APP_BASE_URL = new URL("./", self.location.href);
const INDEX_URL = new URL("index.html", APP_BASE_URL).href;
const PRECACHE_URLS = new Set(
  APP_PATHS.map(path => new URL(path, APP_BASE_URL).href)
);
const ESSENTIAL_URLS = new Set(
  ESSENTIAL_APP_PATHS.map(path => new URL(path, APP_BASE_URL).href)
);

async function cachePaths(cache, paths) {
  return Promise.allSettled(paths.map(async path => {
    const url = new URL(path, APP_BASE_URL).href;
    const response = await fetch(url, { cache: "reload" });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    await cache.put(url, response);
  }));
}

function getFailedPaths(paths, results) {
  return results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ path: paths[index], reason: result.reason }]
      : []
  );
}

async function precacheApp() {
  const cache = await caches.open(PRECACHE_NAME);
  const essentialResults = await cachePaths(cache, ESSENTIAL_APP_PATHS);
  const essentialFailures = getFailedPaths(ESSENTIAL_APP_PATHS, essentialResults);
  if (essentialFailures.length) {
    throw new AggregateError(
      essentialFailures.map(item => item.reason),
      `Essential DefectoSNG resources failed: ${essentialFailures.map(item => item.path).join(", ")}`
    );
  }

  // Иллюстрации и другие необязательные ресурсы кэшируются при первом открытии.
  // Это не задерживает установку обновления сотнями параллельных запросов на мобильных устройствах.
}

async function trimRuntimeCache(cache) {
  const requests = await cache.keys();
  const excess = requests.length - MAX_RUNTIME_ENTRIES;
  if (excess <= 0) return;
  await Promise.all(requests.slice(0, excess).map(request => cache.delete(request)));
}

async function putInRuntimeCache(request, response) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  await cache.put(request, response);
  await trimRuntimeCache(cache);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return networkFirst(request);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const requestUrl = new URL(request.url);

    if (
      requestUrl.href.startsWith(APP_BASE_URL.href) &&
      response.ok &&
      !ESSENTIAL_URLS.has(requestUrl.href)
    ) {
      try {
        await putInRuntimeCache(request, response.clone());
      } catch (error) {
        console.warn("DefectoSNG runtime cache write failed:", error);
      }
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const index = await caches.match(INDEX_URL);
      if (index) return index;
    }

    return Response.error();
  }
}

self.addEventListener("install", event => {
  event.waitUntil(precacheApp());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) &&
            key !== PRECACHE_NAME &&
            key !== RUNTIME_CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const strategy = selectCacheStrategy(
    event.request,
    APP_BASE_URL.href,
    PRECACHE_URLS
  );

  if (strategy === "network-first") event.respondWith(networkFirst(event.request));
  if (strategy === "cache-first") event.respondWith(cacheFirst(event.request));
});
