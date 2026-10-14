import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import worker from '../worker.mjs';

const origin = 'https://qa.example.invalid';
const token = 'synthetic-test-token-no-real-access';
const env = { ENVIRONMENT: 'integrated-staging', ASSETS: { fetch: async () => new Response('asset') } };
const req = (path, body, extra = {}) => new Request(origin + path, { method: 'POST', headers: { 'content-type': 'application/json', origin, ...extra }, body: JSON.stringify(body) });

test('staging is fail closed without explicit environment and private paths are absent', async () => {
  assert.equal((await worker.fetch(new Request(origin), {})).status, 503);
  for (const path of ['/automation-worker/schema.sql', '/.dev.vars', '/preview/precifica/', '/webhooks/kiwify', '/%2eenv']) {
    assert.equal((await worker.fetch(new Request(origin + path), env)).status, 404);
  }
});

test('all responses enforce local script and connection policy without caching', async () => {
  for (const path of ['/', '/missing', '/access/recover']) {
    const response = await worker.fetch(new Request(origin + path), env);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'; connect-src 'self';/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
  }
});

test('only activation and validation reach binding, with minimal credential payload', async () => {
  const calls = [];
  const bound = { ...env, ACCESS_SERVICE: { fetch: async (r) => {
    calls.push({ url: r.url, headers: Object.fromEntries(r.headers), body: await r.json() });
    return Response.json({ valid: true });
  } } };
  assert.equal((await worker.fetch(req('/access/activate', { token }, { cookie: 'must-not-forward=1' }), bound)).status, 200);
  assert.deepEqual(calls[0], { url: 'https://access.internal/access/activate', headers: { 'content-type': 'application/json' }, body: { token } });
  assert.equal((await worker.fetch(req('/access/validate', {}, { authorization: 'Bearer ' + token }), bound)).status, 200);
  assert.deepEqual(calls[1].body, {});
  assert.equal((await worker.fetch(req('/access/recover', { email: 'qa@example.invalid' }), bound)).status, 503);
  assert.equal(calls.length, 2);
});

test('financial fields, cross-origin requests, query strings and oversized bodies cannot reach backend', async () => {
  let calls = 0;
  const bound = { ...env, ACCESS_SERVICE: { fetch: async () => { calls++; return Response.json({}); } } };
  for (const request of [
    req('/access/activate', { token, cost: 7550 }),
    req('/access/activate?cost=7550', { token }),
    req('/access/activate', { token }, { origin: 'https://foreign.invalid' }),
    req('/access/validate', { price: 12345 }, { authorization: 'Bearer ' + token }),
    req('/access/activate', { token: 'x'.repeat(5000) }),
  ]) assert((await worker.fetch(request, bound)).status >= 400);
  assert.equal(calls, 0);
});

test('binding failure and unexpected redirects do not masquerade as access success', async () => {
  assert.equal((await worker.fetch(req('/access/activate', { token }), env)).status, 503);
  const bound = { ...env, ACCESS_SERVICE: { fetch: async () => Response.redirect('https://outside.invalid') } };
  assert.equal((await worker.fetch(req('/access/activate', { token }), bound)).status, 502);
});

test('analytics drops denied events and arbitrary money, identity and attribution parameters', async () => {
  const context = vm.createContext({ window: {}, document: { addEventListener() {} } });
  vm.runInContext(await readFile(new URL('../analytics.js', import.meta.url), 'utf8'), context);
  context.window.everestTrack('precifica_calculation_started', { stage: 'margin_complete' });
  assert.equal(context.window.__everestQaEvents.length, 0);
  context.window.everestAnalyticsConsent = true;
  context.window.everestTrack('precifica_calculation_started', { stage: 'margin_complete', price: 7550, email: 'test@example.invalid', token, utm_source: 'sensitive' });
  context.window.everestTrack('unknown_event', { stage: 'margin_complete' });
  context.window.everestTrack('precifica_calculation_started', { stage: '7550' });
  assert.equal(context.window.__everestQaEvents.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.__everestQaEvents[0])), { event: 'precifica_calculation_started', event_source: 'everest_site', item_name: 'ever_precifica', stage: 'margin_complete' });
});

test('generated consent cannot load the commercial GTM and activation config runs first', async () => {
  const consent = await readFile(new URL('../public/assets/js/consent.js', import.meta.url), 'utf8');
  assert(!consent.includes('GTM-TH5483TJ'));
  assert(!consent.includes('www.googletagmanager.com'));
  assert(consent.includes('/__qa__/gtm.js'));
  const html = await readFile(new URL('../public/ferramentas/precifica/index.html', import.meta.url), 'utf8');
  assert(html.indexOf('/__qa__/config.js') < html.indexOf('consent.js'));
  assert(!html.includes('rel="canonical"'));
});

test('temporary backend failure preserves credential; definitive rejection clears only access', async () => {
  const values = new Map([['ever_precifica_access_v1', token], ['ever_precifica_mvp_v1', '{"directCostCents":7550}']]);
  const saved = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch };
  globalThis.window = { location: { origin, search: '', href: origin + '/' }, history: { replaceState() {} } };
  globalThis.localStorage = { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
  try {
    const access = await import('../public/ferramentas/precifica/access.mjs');
    globalThis.fetch = async () => Response.json({ ok: false }, { status: 503 });
    assert.equal((await access.ensureAccess()).networkError, true);
    assert.equal(values.get('ever_precifica_access_v1'), token);
    globalThis.fetch = async () => Response.json({ valid: false }, { status: 401 });
    assert.equal((await access.ensureAccess()).expired, true);
    assert(!values.has('ever_precifica_access_v1'));
    assert.equal(values.get('ever_precifica_mvp_v1'), '{"directCostCents":7550}');
  } finally { Object.assign(globalThis, saved); }
});
