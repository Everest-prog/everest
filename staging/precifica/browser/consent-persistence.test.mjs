import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Browser integration only. ACCESS_SERVICE below is a fixture, never a purchase,
// real customer entitlement, recovery email, or deployed Cloudflare binding.
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../public");
const artifacts = path.join(here, "artifacts");
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
} catch (error) {
  if (process.env.PLAYWRIGHT_MODULE_PATH) throw error;
  const bundled = path.join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
  if (!existsSync(bundled)) throw new Error("Install Playwright or set PLAYWRIGHT_MODULE_PATH.", { cause: error });
  playwright = require(bundled);
}
const worker = (await import("../worker.mjs")).default;
assert(existsSync(path.join(publicDir, "index.html")), "Run node staging/precifica/build.mjs first.");
await mkdir(artifacts, { recursive: true });

const ACCESS_KEY = "ever_precifica_access_v1";
const STATE_KEY = "ever_precifica_mvp_v1";
const CONSENT_KEY = "everest_analytics_consent";
const ACCESS_TOKEN = "browser-fixture-access-never-real";
const ACTIVATION_TOKEN = "browser-fixture-activation-never-real";
const requests = [];
const serviceCalls = [];
const browserErrors = [];
const report = {
  startedAt: new Date().toISOString(),
  scope: "Local staging worker + real browser. ACCESS_SERVICE is mocked; this does not validate Cloudflare deployment, purchases, or real entitlement.",
  checks: [],
};
const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".mjs": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".txt": "text/plain" };
const env = {
  ENVIRONMENT: "integrated-staging",
  SOURCE_REF: "local-browser-fixture",
  ASSETS: {
    async fetch(request) {
      let pathname = decodeURIComponent(new URL(request.url).pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const filename = path.resolve(publicDir, "." + pathname);
      if (!filename.startsWith(publicDir + path.sep)) return new Response("Forbidden", { status: 403 });
      try {
        return new Response(await readFile(filename), { headers: { "content-type": mime[path.extname(filename)] || "application/octet-stream" } });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        return new Response("Not found", { status: 404 });
      }
    },
  },
  ACCESS_SERVICE: {
    async fetch(request) {
      const pathname = new URL(request.url).pathname;
      const body = await request.json();
      serviceCalls.push({ pathname, method: request.method, hasAuthorization: request.headers.has("authorization") });
      if (pathname === "/access/activate" && body.token === ACTIVATION_TOKEN) {
        return Response.json({ access_token: ACCESS_TOKEN, product_code: "ever_precifica" });
      }
      if (pathname === "/access/validate" && request.headers.get("authorization") === `Bearer ${ACCESS_TOKEN}`) {
        return Response.json({ valid: true, product_code: "ever_precifica" });
      }
      return Response.json({ valid: false }, { status: 401 });
    },
  },
};
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const request = new Request(`http://${incoming.headers.host}${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      ...(body.length ? { body } : {}),
    });
    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500);
    outgoing.end("Local browser harness error");
    browserErrors.push(`Harness: ${error.message}`);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
if (!executablePath && !existsSync(playwright.chromium.executablePath()) && process.platform === "win32") {
  executablePath = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
}
let browser;
const contexts = [];

async function context(options = {}) {
  const result = await browser.newContext({ viewport: { width: 1360, height: 1000 }, ...options });
  contexts.push(result);
  // Abort every outbound route as a fail-safe; attempted requests are still
  // recorded and fail assertions, with only optional font hosts excepted.
  await result.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort("blockedbyclient");
    return route.continue();
  });
  result.on("request", (request) => requests.push({ url: request.url(), method: request.method(), body: request.postData() || "" }));
  result.on("page", (page) => page.on("pageerror", (error) => browserErrors.push(error.message)));
  return result;
}

async function stored(page, key) {
  return page.evaluate((name) => localStorage.getItem(name), key);
}
async function state(page) {
  return JSON.parse(await stored(page, STATE_KEY));
}
async function ready(page) {
  await page.locator('[data-type="product"]').waitFor();
}
async function resume(page) {
  await page.locator('[data-resume="continue"]').click();
  await page.locator("#direct-cost").waitFor();
}
async function check(name, work) {
  await work();
  report.checks.push({ name, result: "passed" });
  console.log(`PASS ${name}`);
}
function adapterRequests() {
  return requests.filter((request) => new URL(request.url).pathname === "/__qa__/gtm.js");
}

try {
  browser = await playwright.chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  report.browser = browser.version();
  const desktop = await context();
  const page = await desktop.newPage();

  await check("Unknown and denied consent never load the local Analytics adapter", async () => {
    const response = await page.goto(origin + "/");
    assert.equal(response.status(), 200);
    assert(response.headers()["content-security-policy"], "Worker must provide CSP on actual HTML response");
    await page.locator("[data-cookie-deny]").waitFor();
    assert.equal(await page.locator("script[data-everest-gtm]").count(), 0);
    assert.equal(adapterRequests().length, 0);
    await page.locator("[data-cookie-deny]").click();
    assert.equal(await stored(page, CONSENT_KEY), "denied");
    await page.reload();
    await page.locator("#everest-cookie-preferences").waitFor();
    assert.equal(await page.locator("script[data-everest-gtm]").count(), 0);
    assert.equal(adapterRequests().length, 0);
  });

  await check("Same-origin activation fixture and product cost persist while Analytics is denied", async () => {
    await page.goto(`${origin}/ferramentas/precifica/?activate=${ACTIVATION_TOKEN}`);
    await ready(page);
    assert.equal(new URL(page.url()).searchParams.has("activate"), false);
    assert.equal(await stored(page, ACCESS_KEY), ACCESS_TOKEN);
    await page.locator('[data-type="product"]').click();
    await page.locator('[data-action="next"]').click();
    await page.locator("#direct-cost").fill("75,50");
    assert.equal((await state(page)).directCostCents, 7550);
    assert.equal((await state(page)).step, 2);
    await page.reload();
    await resume(page);
    assert.equal(await page.locator("#direct-cost").inputValue(), "75,50");
    assert.equal(adapterRequests().length, 0);
    await page.screenshot({ path: path.join(artifacts, "desktop-product-denied.png"), fullPage: true });
  });

  await check("Consent granted at the landing applies to the tool on the same origin", async () => {
    const savedState = await stored(page, STATE_KEY);
    await page.goto(origin + "/");
    assert.equal(await stored(page, STATE_KEY), savedState);
    assert.equal(await stored(page, ACCESS_KEY), ACCESS_TOKEN);
    await page.locator("#everest-cookie-preferences").click();
    await page.locator("[data-cookie-accept]").click();
    await page.waitForFunction(() => window.__everestQaAdapterLoaded === true);
    assert.equal(await stored(page, CONSENT_KEY), "granted");
    assert.equal(new URL(await page.locator("script[data-everest-gtm]").getAttribute("src"), page.url()).origin, origin);
    assert.equal(new URL(await page.locator("script[data-everest-gtm]").getAttribute("src"), page.url()).pathname, "/__qa__/gtm.js");
    await page.goto(origin + "/ferramentas/precifica/");
    await resume(page);
    await page.waitForFunction(() => window.__everestQaAdapterLoaded === true);
    assert.equal(await page.locator("#direct-cost").inputValue(), "75,50");
    assert.equal(await stored(page, ACCESS_KEY), ACCESS_TOKEN);
  });

  await check("Analytics local allowlist excludes money, email, credentials and URL attribution", async () => {
    await page.evaluate(() => window.everestTrack("precifica_calculation_started", {
      item_name: "ever_precifica", stage: "margin_complete", directCostCents: 7550,
      financialValue: "75,50", email: "qa-sensitive@example.invalid", token: "qa-secret-never-real",
      page_path: "/?activate=qa-secret-never-real", utm_source: "qa-sensitive-source",
    }));
    const evidence = await page.evaluate(() => ({ events: window.__everestQaEvents, layer: window.dataLayer }));
    assert(evidence.events?.some((event) => event.event === "precifica_calculation_started"), "Expected an accepted semantic event to exercise the allowlist");
    for (const event of evidence.events) {
      assert(Object.keys(event).every((key) => ["event", "event_source", "item_name", "stage"].includes(key)), `Unexpected event field: ${Object.keys(event)}`);
    }
    const serialized = JSON.stringify(evidence);
    for (const forbidden of ["7550", "75,50", "qa-sensitive", "qa-secret", ACCESS_TOKEN, ACTIVATION_TOKEN]) assert(!serialized.includes(forbidden), `Sensitive fixture leaked: ${forbidden}`);
    report.sanitizedEventFields = [...new Set(evidence.events.flatMap(Object.keys))].sort();
  });

  await check("Revoking consent reloads and preserves the access fixture and financial simulation", async () => {
    const savedState = await stored(page, STATE_KEY);
    const beforeAdapters = adapterRequests().length;
    await page.locator("#everest-cookie-preferences").click();
    await Promise.all([page.waitForEvent("domcontentloaded"), page.locator("[data-cookie-deny]").click()]);
    await resume(page);
    assert.equal(await stored(page, CONSENT_KEY), "denied");
    assert.equal(await stored(page, STATE_KEY), savedState);
    assert.equal(await stored(page, ACCESS_KEY), ACCESS_TOKEN);
    assert.equal(await page.locator("#direct-cost").inputValue(), "75,50");
    assert.equal(await page.locator("script[data-everest-gtm]").count(), 0);
    assert.equal(adapterRequests().length, beforeAdapters);
    assert.equal(await page.evaluate(() => Boolean(window.__everestQaAdapterLoaded)), false);
  });

  await check("Reset preserves access; selecting Service and reloading does not create a false resume", async () => {
    const beforeReset = await stored(page, STATE_KEY);
    await page.locator("#new-simulation-button").click();
    await page.locator('#reset-dialog button.secondary-button').click();
    assert.equal(await stored(page, STATE_KEY), beforeReset);
    await page.locator("#new-simulation-button").click();
    await page.locator("#confirm-reset").click();
    await ready(page);
    assert.equal((await state(page)).directCostCents, 0);
    assert.equal((await state(page)).step, 1);
    assert.equal((await state(page)).itemType, null);
    assert.equal(await stored(page, ACCESS_KEY), ACCESS_TOKEN);
    await page.locator('[data-type="service"]').click();
    assert.equal(await page.locator('[data-resume="continue"]').count(), 0);
    await page.reload();
    await ready(page);
    assert.equal(await page.locator('[data-resume="continue"]').count(), 0);
    assert.match(await page.locator('[data-type="service"]').getAttribute("class"), /selected/);
    assert.equal((await state(page)).directCostCents, 0);
    assert.equal(await stored(page, ACCESS_KEY), ACCESS_TOKEN);
  });

  await check("Returning granted visitor removes the activation query before the adapter executes", async () => {
    const clean = await context();
    await clean.addInitScript(({ consentKey, expectedOrigin }) => {
      if (location.origin === expectedOrigin) localStorage.setItem(consentKey, "granted");
    }, { consentKey: CONSENT_KEY, expectedOrigin: origin });
    const activationPage = await clean.newPage();
    // Capture the document URL as the actual local adapter is about to execute.
    let adapterDocumentUrl;
    await activationPage.route("**/__qa__/gtm.js*", async (route) => {
      adapterDocumentUrl = await activationPage.evaluate(() => location.href);
      await route.continue();
    });
    await activationPage.goto(`${origin}/ferramentas/precifica/?activate=${ACTIVATION_TOKEN}&utm_source=private-attribution`);
    await ready(activationPage);
    await activationPage.waitForFunction(() => window.__everestQaAdapterLoaded === true);
    assert(adapterDocumentUrl, "Adapter request was observed");
    assert.equal(new URL(adapterDocumentUrl).searchParams.has("activate"), false);
    assert.equal(await stored(activationPage, ACCESS_KEY), ACCESS_TOKEN);
    const serialized = await activationPage.evaluate(() => JSON.stringify({ events: window.__everestQaEvents, layer: window.dataLayer }));
    assert(!serialized.includes("private-attribution"));
    assert(!serialized.includes(ACTIVATION_TOKEN));
    await clean.close();
  });

  await check("Mobile consent and restored cost remain usable without horizontal overflow", async () => {
    const mobile = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(`${origin}/ferramentas/precifica/?activate=${ACTIVATION_TOKEN}`);
    await ready(mobilePage);
    await mobilePage.screenshot({ path: path.join(artifacts, "mobile-consent.png"), fullPage: true });
    await mobilePage.locator("[data-cookie-accept]").click();
    await mobilePage.locator('[data-type="product"]').click();
    await mobilePage.locator('[data-action="next"]').click();
    await mobilePage.locator("#direct-cost").fill("123,45");
    await mobilePage.reload();
    await resume(mobilePage);
    assert.equal(await mobilePage.locator("#direct-cost").inputValue(), "123,45");
    assert.equal(await stored(mobilePage, ACCESS_KEY), ACCESS_TOKEN);
    assert(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Mobile page must fit the viewport");
    await mobilePage.screenshot({ path: path.join(artifacts, "mobile-product-restored.png"), fullPage: true });
    await mobile.close();
  });

  await check("Real browser CSP blocks external Google scripts and Analytics connections", async () => {
    const cspContext = await context();
    const cspPage = await cspContext.newPage();
    const response = await cspPage.goto(origin + "/");
    report.contentSecurityPolicy = response.headers()["content-security-policy"];
    await cspPage.evaluate(async () => {
      window.__cspViolations = [];
      document.addEventListener("securitypolicyviolation", (event) => window.__cspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI }));
      const script = document.createElement("script");
      script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-INTENTIONALLY-BLOCKED";
      document.head.appendChild(script);
      try { await fetch("https://www.google-analytics.com/g/collect?qa=blocked"); } catch {}
    });
    await cspPage.waitForFunction(() => window.__cspViolations.some((entry) => entry.directive.startsWith("script-src")) && window.__cspViolations.some((entry) => entry.directive === "connect-src"));
    report.cspBlocked = await cspPage.evaluate(() => window.__cspViolations);
    await cspContext.close();
  });

  await check("Normal journeys make no external Analytics request or financial network payload", async () => {
    const outside = requests.filter(({ url }) => new URL(url).origin !== origin);
    // Intentional CSP probes above may be surfaced as attempted requests by
    // Chromium. They must have a corresponding browser CSP violation.
    const unexpected = outside.filter(({ url }) => !url.includes("GTM-INTENTIONALLY-BLOCKED") && !url.includes("qa=blocked") && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url));
    assert.deepEqual(unexpected, []);
    const dataRequests = requests.filter(({ method }) => method !== "GET");
    assert(dataRequests.every(({ url }) => ["/access/activate", "/access/validate"].includes(new URL(url).pathname)));
    assert(!dataRequests.some(({ body }) => /directCostCents|7550|75,50|123,45|qa-sensitive/.test(body)));
    assert.deepEqual(browserErrors, []);
    assert(serviceCalls.some(({ pathname }) => pathname === "/access/activate"));
    assert(serviceCalls.some(({ pathname }) => pathname === "/access/validate"));
    report.fixtureServiceCalls = serviceCalls;
    report.externalRequests = outside.map(({ url }) => url);
  });
  report.result = "passed";
} catch (error) {
  report.result = "failed";
  report.error = error.stack || String(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await Promise.allSettled(contexts.map((item) => item.close()));
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log(`Report: ${path.join(artifacts, "report.json")}`);
}
