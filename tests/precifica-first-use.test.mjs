import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = new URL("../guides/precifica/", import.meta.url);
const [html, guide, css] = await Promise.all([
  readFile(new URL("index.html", base), "utf8"),
  readFile(new URL("guia-primeiro-uso.md", base), "utf8"),
  readFile(new URL("guide.css", base), "utf8"),
]);

test("First-use guide matches the real eight-step tool", () => {
  for (let number = 1; number <= 8; number += 1) {
    assert.match(html, new RegExp('class="number">0' + number));
    assert.match(guide, new RegExp('### Etapa ' + number + ' —'));
  }
  for (const term of ["Produto", "Serviço", "Não quero incluir agora", "Ainda não",
    "Nova simulação", "margem", "contador", "navegador"]) {
    assert.ok(html.includes(term), 'Missing HTML term ' + term);
    assert.ok(guide.includes(term), 'Missing doc term ' + term);
  }
});

test("Guide contains approved cases but no fictitious access promises", () => {
  assert.match(html, /Óleo finalizador|óleo finalizador/i);
  assert.match(guide, /escova com hidratação/i);
  assert.match(html, /Condições comerciais ainda em definição/);
  assert.match(guide, /não promete.*acesso vitalício/i);
  assert.match(guide, /(?:não copie|não use).*alíquota.*exemplos/i);
});

test("Guide is static, isolated, accessible and cannot upload user information", () => {
  assert.match(html, /lang="pt-BR"/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /script-src 'none'/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /noindex,nofollow/);
  assert.doesNotMatch(html, /<(?:script|form)\b/i);
  assert.doesNotMatch(html, /checkout|kiwify\.com|google-analytics|googletagmanager/i);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(max-width:680px\)/);
});
