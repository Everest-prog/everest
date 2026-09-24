# Ever.Est — Site institucional

Site público da Ever.Est em `soueverest.com.br`.

## Estrutura

- `index.html` — home institucional
- `ferramentas/index.html` — hub das Ferramentas Ever.Est
- `artigo-*.html` — conteúdo O Adm Explica
- `privacidade.html` — política de privacidade
- `assets/js/analytics.js` — camada de eventos e atribuição, independente de provedor
- `robots.txt` / `sitemap.xml` — descoberta e SEO
- `docs/ET-0D-DIGITAL-ARCHITECTURE.md` — arquitetura digital e contratos de eventos

## Arquitetura

O site é estático e não deve armazenar segredos ou processar webhooks.
`app.soueverest.com.br` permanece separado para o Ever.Finance.
Checkout, e-mails e automações do MVP são integrações externas/server-side.

## Tracking

Elementos rastreáveis usam `data-track` e formulários usam `data-track-form`.
`assets/js/analytics.js` envia eventos apenas para `window.dataLayer`; nenhum provedor de analytics é carregado por esse arquivo.

## Desenvolvimento

Mudanças de produto devem usar branch + pull request. Não publicar páginas incompletas diretamente na `main`.
