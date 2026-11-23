export const ROUTER_STATE_KEY = "defectoSngRoute";
let routeHandler = null;
let routerStarted = false;

export function encodeRoutePart(value) { return encodeURIComponent(String(value || "")); }
export function decodeRoutePart(value) { try { return decodeURIComponent(value); } catch { return ""; } }

function parseCriteria(hash) {
  if (hash === "#criteria" || hash === "#task=criteria") return { view: "criteria", query: "" };
  if (!hash.startsWith("#criteria?")) return null;
  const params = new URLSearchParams(hash.slice("#criteria?".length));
  return { view: "criteria", query: params.get("q") || "" };
}

export function parseRoute(hash = globalThis.window?.location?.hash || "") {
  if (!hash || hash === "#home" || hash === "#work") return { view: "home" };
  if (hash === "#atlas" || hash === "#atlases") return { view: "atlas" };
  if (hash === "#favorites") return { view: "favorites" };
  if (hash === "#search") return { view: "search", query: "" };
  if (hash.startsWith("#search=")) return { view: "search", query: decodeRoutePart(hash.slice(8)) };
  if (hash.startsWith("#criterion=")) return { view: "criteria", criterionId: decodeRoutePart(hash.slice(11)), query: "" };
  const criteria = parseCriteria(hash);
  if (criteria) return criteria;
  const atlasItem = hash.match(/^#atlas=([^:]+):(.+)$/);
  if (atlasItem) return { view: "atlasItem", method: decodeRoutePart(atlasItem[1]), itemId: decodeRoutePart(atlasItem[2]) };
  const legacy = hash.match(/^#(?:article|section)=([^:]+):(.+)$/);
  if (legacy) return { view: "atlasItem", method: decodeRoutePart(legacy[1]), itemId: decodeRoutePart(legacy[2]) };
  if (hash === "#vik") return { view: "atlasItem", method: "vik", itemId: "vik-defects" };
  return { view: "home" };
}

export function getRouteHash(route) {
  if (route.view === "home") return "";
  if (route.view === "atlas") return "#atlas";
  if (route.view === "favorites") return "#favorites";
  if (route.view === "search") return route.query ? `#search=${encodeRoutePart(route.query)}` : "#search";
  if (route.view === "criteria") {
    if (route.criterionId) return `#criterion=${encodeRoutePart(route.criterionId)}`;
    return route.query ? `#criteria?q=${encodeRoutePart(route.query)}` : "#criteria";
  }
  if (route.view === "atlasItem") return `#atlas=${encodeRoutePart(route.method)}:${encodeRoutePart(route.itemId)}`;
  return "";
}

function createState(route, depth) { return { [ROUTER_STATE_KEY]: true, depth, ...route }; }
function dispatch(route) { if (routeHandler) routeHandler(route); }

export function navigate(route, options = {}) {
  const replace = options.replace === true;
  const depth = history.state?.[ROUTER_STATE_KEY] ? Number(history.state.depth) || 0 : 0;
  history[replace ? "replaceState" : "pushState"](createState(route, replace ? depth : depth + 1), "",
    `${window.location.pathname}${window.location.search}${getRouteHash(route)}`);
  if (options.dispatch !== false) dispatch(route);
}

export function replaceRoute(route, options = {}) { navigate(route, { ...options, replace: true }); }
export function goBack(fallbackRoute = { view: "home" }) {
  if (history.state?.[ROUTER_STATE_KEY] && Number(history.state.depth) > 0) history.back();
  else replaceRoute(fallbackRoute);
}

export function startRouter(handler) {
  routeHandler = handler;
  const route = parseRoute();
  history.replaceState(createState(route, 0), "", `${window.location.pathname}${window.location.search}${getRouteHash(route)}`);
  if (!routerStarted) {
    window.addEventListener("popstate", () => dispatch(parseRoute()));
    routerStarted = true;
  }
  dispatch(route);
}
