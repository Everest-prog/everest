import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const output = path.join(here, 'public');
if (path.dirname(output) !== here || path.basename(output) !== 'public') throw Error('Unsafe output path');
const read = async (file) => (await readFile(path.join(root, file), 'utf8')).replaceAll('\r\n', '\n');
function replaceOnce(text, old, replacement) {
  if (text.split(old).length !== 2) throw Error('Build assumption changed: ' + old.slice(0, 80));
  return text.replace(old, replacement);
}
const files = new Map();
for (const file of ['favicon.png', 'Ever.est topo branco.png', 'Imagem o vale.png', 'ferramentas/precifica/engine.mjs']) {
  files.set(file, await readFile(path.join(root, file)));
}
let html = await read('ferramentas/precifica/index.html');
html = replaceOnce(html, '<head>', '<head>\n  <script src="/__qa__/config.js"></script>\n  <meta name="robots" content="noindex,nofollow">');
html = replaceOnce(html, '<link rel="canonical" href="https://soueverest.com.br/ferramentas/precifica/">', '');
html = replaceOnce(html, '<body>', '<body>\n  <div class="qa-banner">STAGING · Métricas locais</div>');
html = replaceOnce(html, '<title>Ever.Precifica | Ever.Est</title>', '<title>Ever.Precifica — Staging integrado</title>');
files.set('ferramentas/precifica/index.html', html);
let css = await read('ferramentas/precifica/styles.css');
css = replaceOnce(css, 'https://raw.githubusercontent.com/Everest-prog/everest/refs/heads/feat/et-0e-ever-precifica/Imagem%20o%20vale.png', '/Imagem%20o%20vale.png');
css += '\n.qa-banner{position:relative;inset:auto;left:auto;transform:none;width:fit-content;margin:8px auto 0;text-align:center}\n';
files.set('ferramentas/precifica/styles.css', css);
let app = await read('ferramentas/precifica/app.mjs');
// Keep the paid access gate. Disable only recovery in this generated artifact:
// existing backend emails still point to the public site.
app = replaceOnce(app, 'document.getElementById("recovery-button").addEventListener("click", async () => {',
  'document.getElementById("recovery-button").disabled = true;\n  document.getElementById("recovery-email").disabled = true;\n  document.getElementById("recovery-message").textContent = "Recuperação por e-mail desativada neste staging. A ativação de teste deve ser preparada pelo responsável.";\n  document.getElementById("recovery-button").addEventListener("click", async () => {');
files.set('ferramentas/precifica/app.mjs', app);
let access = await read('ferramentas/precifica/access.mjs');
access = replaceOnce(access, 'const DEFAULT_API_BASE = "https://ever-tools-automation-staging.gabrielfelipegfrs.workers.dev";', 'const DEFAULT_API_BASE = window.location.origin;');
access = replaceOnce(access, '  const params = new URLSearchParams(window.location.search);\n  return String(params.get("activate") || "").trim();',
  '  const token = String(window.__everestQaActivationToken || "").trim();\n  delete window.__everestQaActivationToken;\n  return token;');
access = replaceOnce(access, '    clearAccessToken();\n    return { valid: false, expired: true };',
  '    if (response.status !== 401) return { valid: false, networkError: true };\n    clearAccessToken();\n    return { valid: false, expired: true };');
files.set('ferramentas/precifica/access.mjs', access);
let consent = await read('assets/js/consent.js');
consent = replaceOnce(consent, 'const GTM_ID = "GTM-TH5483TJ";', 'const GTM_ID = "LOCAL-TEST-ADAPTER";');
consent = replaceOnce(consent, '"https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID)', '"/__qa__/gtm.js?mode=" + encodeURIComponent(GTM_ID)');
files.set('assets/js/consent.js', consent);
files.set('assets/js/analytics.js', await read('staging/precifica/analytics.js'));
files.set('__qa__/config.js', await read('staging/precifica/config.js'));
files.set('__qa__/gtm.js', await read('staging/precifica/gtm.js'));
const head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><script src="/__qa__/config.js"></script><script src="/assets/js/consent.js" defer></script><script src="/assets/js/analytics.js" defer></script><link rel="stylesheet" href="/ferramentas/precifica/styles.css">';
files.set('index.html', '<!doctype html><html lang="pt-BR"><head>' + head + '<title>Ever.Precifica — Staging</title></head><body><main class="app-wrap"><section class="glass-shell" style="padding:32px"><h1>Ever.Precifica — Ambiente de teste</h1><p>Consentimento e ferramenta no mesmo endereço. As métricas deste ambiente ficam somente no navegador e não são enviadas ao Google.</p><p>Use dados fictícios. O acesso precisa de uma ativação de teste válida.</p><a class="primary-button" href="/ferramentas/precifica/">Abrir Ever.Precifica</a></section></main></body></html>');
files.set('privacidade.html', '<!doctype html><html lang="pt-BR"><head>' + head + '<title>Privacidade no staging</title></head><body><main class="app-wrap"><section class="glass-shell" style="padding:32px"><h1>Privacidade no ambiente de teste</h1><p>Simulações, consentimento e acesso ficam em registros separados neste navegador. Eventos de teste ficam apenas em memória. Nenhum GTM ou GA4 é carregado.</p><p>Apenas ativação e validação de acesso são encaminhadas ao backend de staging existente. Não informe dados reais. A recuperação por e-mail está desativada.</p><a href="/">Voltar ao teste</a></section></main></body></html>');
files.set('robots.txt', 'User-agent: *\nDisallow: /\n');
for (const [name, content] of files) {
  if (/\.(html|js|mjs|css)$/.test(name) && /GTM-TH5483TJ|https:\/\/www\.googletagmanager\.com|https:\/\/[^"'\s]*google-analytics\.com/.test(String(content))) throw Error('Commercial analytics in generated ' + name);
}
const hash = createHash('sha256');
for (const [name, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) hash.update(name + '\0').update(content).update('\0');
let sourceRef = process.env.GITHUB_SHA || 'unknown';
let dirty = true;
try {
  sourceRef = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  dirty = !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
} catch { /* Local restricted process environments remain explicitly unverified. */ }
files.set('__qa__/build-info.json', JSON.stringify({ source_ref: sourceRef, source_dirty: dirty, package_sha256: hash.digest('hex'), analytics_mode: 'local-test-adapter' }, null, 2) + '\n');
// Only remove stale files inside this fixed generated directory. Never touch inputs.
await mkdir(output, { recursive: true });
async function prune(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name);
    if (item.isSymbolicLink()) throw Error('Unexpected symlink in generated output');
    if (item.isDirectory()) await prune(full);
    else if (!files.has(path.relative(output, full).replaceAll('\\', '/'))) await rm(full);
  }
}
await prune(output);
for (const [name, content] of files) {
  const target = path.join(output, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}
console.log(`Built ${files.size} isolated staging assets (${sourceRef}, dirty=${dirty}).`);
