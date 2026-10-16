# Ever.Precifica — staging integrado

Worker separado: `ever-precifica-integrated-staging`. Nenhuma rota/domínio de produção, D1, segredo, webhook ou alteração do Worker existente. A ligação `ACCESS_SERVICE` aponta somente ao backend `ever-tools-automation-staging` na mesma conta Cloudflare.

O build copia uma lista explícita de arquivos e adapta apenas as cópias geradas. Os arquivos usados pelo preview atual permanecem intactos. Consentimento, ferramenta e `/access/activate` e `/access/validate` usam a mesma origem. A recuperação fica desabilitada porque o backend atual envia links para o site público.

**Analytics é um adaptador local inerte, não GTM/GA4.** Reutilizamos a lógica de consentimento com o carregador redirecionado para `/__qa__/gtm.js`. Eventos sanitizados ficam em `window.__everestQaEvents`; não há coleta externa. A CSP bloqueia scripts e conexões externos, permitindo somente estilos/fontes Google Fonts. A ativação é removida da URL antes do consentimento. Valores financeiros não são aceitos pelo proxy de acesso nem pela lista de eventos.

## Verificar

```sh
node staging/precifica/build.mjs
node --test staging/precifica/test/*.test.mjs
node staging/precifica/browser/consent-persistence.test.mjs
```

O teste de navegador precisa de Playwright e Chromium; aceita `PLAYWRIGHT_MODULE_PATH` e `PLAYWRIGHT_EXECUTABLE_PATH`. Seu backend de acesso é uma fixture sintética. Relatórios locais ficam em `browser/artifacts/` e não provam acesso pago real.

## Publicar somente após autenticação

Use Wrangler 4.150.0 ou compatível, dentro da conta Cloudflare que contém o backend de staging. Revise nome do Worker e service binding antes do deploy. Os comandos abaixo não alteram o Worker existente.

```sh
node staging/precifica/build.mjs
npx wrangler deploy --config staging/precifica/wrangler.jsonc --dry-run
npx wrangler deploy --config staging/precifica/wrangler.jsonc
```

Não há deploy automático no workflow. Registre a URL retornada, versão do Worker e resposta de `/__qa__/health` antes de anunciar disponibilidade. O health informa presença do binding, sem afirmar que o banco ou acesso real foram validados. Gere o pacote a partir de commit limpo antes de publicar.

Publicado e verificado em 15/10/2026: https://ever-precifica-integrated-staging.gabrielfelipegfrs.workers.dev/ . Versão `db2fad83-3399-4733-b4a5-65b9b6c8366b`, fonte `75dab56b731f958e8597e12061a5b939ed0bdd5c`. Seis verificações remotas passaram, incluindo consentimento e rejeição de credencial fictícia pelo backend; acesso válido ainda precisa de ativação E2E.

Runbook: `docs/ET-0E-QA-E2E-RUNBOOK.md`, seções 14–16. Permanecem pendentes: acesso E2E real, persistência com esse acesso no staging remoto, backend de recuperação isolado e container/propriedade GTM/GA4 exclusivos de QA. A aprovação do adaptador local não encerra Analytics nem ET-0E-G. O login oficial do Wrangler precisa de `workers_scripts:write`; `workers:write` sozinho não permite publicar este pacote.

Referências: [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/binding/) e [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/).
