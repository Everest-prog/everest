const ASSET_PATHS = new Set([
  "/index.html",
  "/privacidade.html",
  "/robots.txt",
  "/favicon.png",
  "/Ever.est topo branco.png",
  "/Imagem o vale.png",
  "/ferramentas/precifica/index.html",
  "/ferramentas/precifica/app.mjs",
  "/ferramentas/precifica/access.mjs",
  "/ferramentas/precifica/engine.mjs",
  "/ferramentas/precifica/styles.css",
  "/assets/js/consent.js",
  "/assets/js/analytics.js",
  "/__qa__/config.js",
  "/__qa__/gtm.js",
  "/__qa__/build-info.json",
]);
const ACCESS_PATHS = new Set(["/access/activate", "/access/validate"]);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,512}$/;
const SECURITY_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};

function secure(response, head = false) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  headers.delete("set-cookie");
  headers.delete("access-control-allow-origin");
  return new Response(head ? null : response.body, { status: response.status, headers });
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

async function readSmallJson(request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new Error("invalid_request");
  }
  if (Number(request.headers.get("content-length")) > 4096) throw new Error("payload_too_large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_request");
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 4096) {
      await reader.cancel();
      throw new Error("payload_too_large");
    }
    text += decoder.decode(value, { stream: true });
  }
  const body = JSON.parse(text + decoder.decode());
  if (!body || Array.isArray(body) || typeof body !== "object") throw new Error("invalid_request");
  return body;
}

async function proxyAccess(request, env, url) {
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, { allow: "POST" });
  const origin = request.headers.get("origin");
  if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }
  if (url.search) return json({ ok: false, error: "query_not_allowed" }, 400);
  if (!env.ACCESS_SERVICE?.fetch) return json({ ok: false, error: "access_service_unavailable" }, 503);
  let body;
  try { body = await readSmallJson(request); }
  catch (error) {
    return json({ ok: false, error: error.message === "payload_too_large" ? "payload_too_large" : "invalid_request" }, error.message === "payload_too_large" ? 413 : 400);
  }

  const headers = new Headers({ "content-type": "application/json" });
  let payload = {};
  if (url.pathname === "/access/activate") {
    if (Object.keys(body).some((key) => key !== "token") || typeof body.token !== "string" || !TOKEN_PATTERN.test(body.token)) {
      return json({ ok: false, error: "invalid_request" }, 400);
    }
    payload = { token: body.token };
  } else {
    const authorization = request.headers.get("authorization") || "";
    if (Object.keys(body).length || !authorization.startsWith("Bearer ") || !TOKEN_PATTERN.test(authorization.slice(7))) {
      return json({ ok: false, valid: false, error: "invalid_request" }, 400);
    }
    headers.set("authorization", authorization);
  }

  try {
    // An explicit service binding is the only upstream. Never proxy a URL supplied
    // by a visitor; never forward query strings, cookies, attribution or form data.
    const upstream = await env.ACCESS_SERVICE.fetch(new Request("https://access.internal" + url.pathname, {
      method: "POST", headers, body: JSON.stringify(payload), redirect: "manual",
    }));
    if (upstream.status >= 300 && upstream.status < 400) throw new Error("unexpected_redirect");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return json({ ok: false, error: "access_service_unavailable" }, 502);
  }
}

async function handle(request, env) {
  const url = new URL(request.url);
  if (env.ENVIRONMENT !== "integrated-staging") return json({ ok: false, error: "staging_only" }, 503);
  if (url.pathname === "/access/recover") {
    return json({ ok: false, error: "recovery_disabled", message: "Recuperação por e-mail desativada neste staging. Nenhum e-mail foi enviado." }, 503);
  }
  if (ACCESS_PATHS.has(url.pathname)) return proxyAccess(request, env, url);
  if (!["GET", "HEAD"].includes(request.method)) return json({ error: "method_not_allowed" }, 405, { allow: "GET, HEAD" });
  if (url.pathname === "/__qa__/health") {
    let build;
    try {
      const response = await env.ASSETS.fetch(new Request(url.origin + "/__qa__/build-info.json"));
      if (!response.ok) throw new Error("missing_build");
      build = await response.json();
    } catch { return json({ ok: false, error: "build_info_unavailable" }, 503); }
    return json({ ok: true, environment: env.ENVIRONMENT, source_ref: build.source_ref,
      package_sha256: build.package_sha256, source_dirty: build.source_dirty,
      analytics_mode: "local-test-adapter", access_service: env.ACCESS_SERVICE?.fetch ? "binding_present_unverified" : "missing_binding",
      database: "shared_existing_staging_backend_not_probed", recovery: "disabled" });
  }
  const aliases = { "/": "/index.html", "/ferramentas/": "/index.html", "/ferramentas/precifica/": "/ferramentas/precifica/index.html" };
  if (["/ferramentas", "/ferramentas/precifica"].includes(url.pathname)) {
    return new Response(null, { status: 302, headers: { location: url.pathname + "/" + url.search } });
  }
  let path;
  try { path = aliases[url.pathname] || decodeURIComponent(url.pathname); }
  catch { return json({ error: "not_found" }, 404); }
  if (!ASSET_PATHS.has(path)) return json({ error: "not_found" }, 404);
  if (!env.ASSETS?.fetch) return json({ error: "assets_unavailable" }, 503);
  const assetUrl = new URL(path, url.origin);
  // Cache lookup receives only the canonical allowlisted path, never activation
  // tokens or other query parameters. ASSETS is a local static binding.
  const response = await env.ASSETS.fetch(new Request(assetUrl, { method: request.method }));
  if (!response.ok) return json({ error: "asset_unavailable" }, response.status === 404 ? 404 : 502);
  return response;
}

export default {
  async fetch(request, env) {
    try { return secure(await handle(request, env), request.method === "HEAD"); }
    catch { return secure(json({ ok: false, error: "staging_unavailable" }, 503), request.method === "HEAD"); }
  },
};
