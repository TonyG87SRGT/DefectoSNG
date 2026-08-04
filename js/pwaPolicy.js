export function selectCacheStrategy(request, appBaseUrl, precacheUrls) {
  if (request.method !== "GET") return "ignore";

  const requestUrl = new URL(request.url);
  if (!requestUrl.href.startsWith(appBaseUrl)) return "ignore";
  if (request.mode === "navigate") return "network-first";
  if (precacheUrls.has(requestUrl.href)) return "cache-first";
  return "network-first";
}
