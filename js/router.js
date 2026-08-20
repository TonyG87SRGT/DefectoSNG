export const ROUTER_STATE_KEY = "defectoSngRoute";

let routeHandler = null;
let routerStarted = false;

const STATIC_ROUTES = Object.freeze({
  "": { view: "home" },
  "#work": { view: "home" },
  "#atlases": { view: "atlases" },
  "#learning": { view: "learning" },
  "#atlas": { view: "atlas" },
  "#favorites": { view: "favorites" },
  "#pipeline": { view: "pipeline" },
  "#references": { view: "references" },
  "#tools": { view: "tools" },
  "#documents": { view: "documents" },
  "#search": { view: "search", query: "" }
});

const STATIC_HASHES = Object.freeze(
  Object.fromEntries(Object.entries(STATIC_ROUTES).map(([hash, route]) => [route.view, hash]))
);

export function encodeRoutePart(value) {
  return encodeURIComponent(String(value || ""));
}

export function decodeRoutePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

const DYNAMIC_ROUTES = Object.freeze([
  {
    view: "modeMethod",
    pattern: /^#mode=(work|learning):([^:]+)$/,
    parse: match => ({ view: "modeMethod", mode: match[1], method: decodeRoutePart(match[2]) }),
    format: route => `#mode=${route.mode === "learning" ? "learning" : "work"}:${encodeRoutePart(route.method)}`
  },
  {
    view: "task",
    pattern: /^#task=([^:]+)$/,
    parse: match => ({ view: "task", task: decodeRoutePart(match[1]) }),
    format: route => `#task=${encodeRoutePart(route.task)}`
  },
  {
    view: "pipelineJoint",
    pattern: /^#pipeline-joint=(.+)$/,
    parse: match => ({ view: "pipelineJoint", itemId: decodeRoutePart(match[1]) }),
    format: route => `#pipeline-joint=${encodeRoutePart(route.itemId)}`
  },
  {
    view: "pipelineReference",
    pattern: /^#pipeline-reference=(.+)$/,
    parse: match => ({ view: "pipelineReference", itemId: decodeRoutePart(match[1]) }),
    format: route => `#pipeline-reference=${encodeRoutePart(route.itemId)}`
  },
  {
    view: "reference",
    pattern: /^#reference=(.+)$/,
    parse: match => ({ view: "reference", referenceId: decodeRoutePart(match[1]) }),
    format: route => `#reference=${encodeRoutePart(route.referenceId)}`
  },
  {
    view: "search",
    pattern: /^#search=(.*)$/,
    parse: match => ({ view: "search", query: decodeRoutePart(match[1]) }),
    format: route => `#search=${encodeRoutePart(route.query)}`
  },
  {
    view: "tool",
    pattern: /^#tool=(.+)$/,
    parse: match => ({ view: "tool", tool: decodeRoutePart(match[1]) }),
    format: route => `#tool=${encodeRoutePart(route.tool)}`
  },
  {
    view: "method",
    pattern: /^#method=([^:]+)$/,
    parse: match => ({ view: "method", method: decodeRoutePart(match[1]) }),
    format: route => `#method=${encodeRoutePart(route.method)}`
  },
  {
    view: "section",
    pattern: /^#section=([^:]+):(.+)$/,
    parse: match => ({
      view: "section",
      method: decodeRoutePart(match[1]),
      itemId: decodeRoutePart(match[2])
    }),
    format: route => `#section=${encodeRoutePart(route.method)}:${encodeRoutePart(route.itemId)}`
  },
  {
    view: "article",
    pattern: /^#article=([^:]+):(.+)$/,
    parse: match => ({
      view: "article",
      method: decodeRoutePart(match[1]),
      itemId: decodeRoutePart(match[2])
    }),
    format: route => `#article=${encodeRoutePart(route.method)}:${encodeRoutePart(route.itemId)}`
  }
]);

function parseAtlasRoute(hash) {
  if (!hash.startsWith("#atlas?")) return null;

  const params = new URLSearchParams(hash.slice("#atlas?".length));
  return {
    view: "atlas",
    category: params.get("category") || "all",
    query: params.get("q") || ""
  };
}

function parsePipelineRoute(hash) {
  if (!hash.startsWith("#pipeline?")) return null;

  const params = new URLSearchParams(hash.slice("#pipeline?".length));
  return {
    view: "pipeline",
    category: params.get("category") || "all",
    query: params.get("q") || "",
    jointType: params.get("type") || "",
    elements: params.get("elements") || "",
    preparation: params.get("preparation") || "",
    weld: params.get("weld") || "",
    backing: params.get("backing") || "",
    method: params.get("welding") || "",
    thickness: params.get("thickness") || "",
    special: params.get("special") || ""
  };
}

function parseVibrationKnowledgeRoute(hash) {
  if (hash !== "#vibration-knowledge" && !hash.startsWith("#vibration-knowledge?")) return null;
  const params = new URLSearchParams(hash.split("?", 2)[1] || "");
  return {
    view: "vibrationKnowledge",
    equipment: params.get("equipment") || "",
    fault: params.get("fault") || "",
    sign: params.get("sign") || "",
    parameter: params.get("parameter") || ""
  };
}

export function parseRoute(hash = globalThis.window?.location?.hash || "") {
  if (hash === "#vik") return { view: "method", method: "vik" };
  if (STATIC_ROUTES[hash]) return { ...STATIC_ROUTES[hash] };

  const atlasRoute = parseAtlasRoute(hash);
  if (atlasRoute) return atlasRoute;

  const pipelineRoute = parsePipelineRoute(hash);
  if (pipelineRoute) return pipelineRoute;

  const vibrationKnowledgeRoute = parseVibrationKnowledgeRoute(hash);
  if (vibrationKnowledgeRoute) return vibrationKnowledgeRoute;

  for (const routeDefinition of DYNAMIC_ROUTES) {
    const match = hash.match(routeDefinition.pattern);
    if (match) return routeDefinition.parse(match);
  }

  // Совместимость со ссылками атласа v0.10.0–v0.10.1.
  if (hash.startsWith("#article=")) {
    return {
      view: "article",
      method: "vik",
      itemId: decodeRoutePart(hash.slice("#article=".length))
    };
  }

  return { view: "home" };
}

export function getRouteHash(route) {
  if (route.view === "vibrationKnowledge") {
    const params = new URLSearchParams();
    for (const key of ["equipment", "fault", "sign", "parameter"]) {
      if (route[key]) params.set(key, route[key]);
    }
    const suffix = params.toString();
    return suffix ? `#vibration-knowledge?${suffix}` : "#vibration-knowledge";
  }
  if (route.view === "pipeline") {
    const params = new URLSearchParams();
    const values = {
      category: route.category && route.category !== "all" ? route.category : "",
      q: route.query,
      type: route.jointType,
      elements: route.elements,
      preparation: route.preparation,
      weld: route.weld,
      backing: route.backing,
      welding: route.method,
      thickness: route.thickness,
      special: route.special
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const suffix = params.toString();
    return suffix ? `#pipeline?${suffix}` : "#pipeline";
  }

  if (route.view === "atlas") {
    const params = new URLSearchParams();
    if (route.category && route.category !== "all") params.set("category", route.category);
    if (route.query) params.set("q", route.query);
    const suffix = params.toString();
    return suffix ? `#atlas?${suffix}` : "#atlas";
  }

  if (route.view === "search") {
    return route.query
      ? DYNAMIC_ROUTES.find(item => item.view === "search").format(route)
      : "#search";
  }
  if (Object.hasOwn(STATIC_HASHES, route.view)) return STATIC_HASHES[route.view];

  const definition = DYNAMIC_ROUTES.find(item => item.view === route.view);
  return definition ? definition.format(route) : "";
}

function getRouteUrl(route) {
  return `${window.location.pathname}${window.location.search}${getRouteHash(route)}`;
}

function createRouteState(route, depth) {
  return { [ROUTER_STATE_KEY]: true, depth, ...route };
}

function dispatch(route) {
  if (!routeHandler) throw new Error("Router has not been started");
  routeHandler(route);
}

export function navigate(route, options = {}) {
  const replace = options.replace === true;
  const shouldDispatch = options.dispatch !== false;
  const currentDepth = history.state?.[ROUTER_STATE_KEY]
    ? Number(history.state.depth) || 0
    : 0;
  const nextDepth = replace ? currentDepth : currentDepth + 1;
  const method = replace ? "replaceState" : "pushState";

  history[method](createRouteState(route, nextDepth), "", getRouteUrl(route));
  if (shouldDispatch) dispatch(route);
}

export function replaceRoute(route, options = {}) {
  navigate(route, { ...options, replace: true });
}

export function goBack(fallbackRoute = { view: "home" }) {
  const canGoBackInsideApp = history.state?.[ROUTER_STATE_KEY] &&
    Number(history.state.depth) > 0;

  if (canGoBackInsideApp) {
    history.back();
    return;
  }

  replaceRoute(fallbackRoute);
}

export function startRouter(handler) {
  routeHandler = handler;
  const initialRoute = parseRoute();
  history.replaceState(createRouteState(initialRoute, 0), "", getRouteUrl(initialRoute));

  if (!routerStarted) {
    window.addEventListener("popstate", () => dispatch(parseRoute()));
    routerStarted = true;
  }

  dispatch(initialRoute);
}
