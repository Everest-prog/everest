# Ever.Tools Automation Worker

Cloudflare Worker de staging das automações Ever.Tools.

- Root directory: `automation-worker`
- Branch de deploy: `main`
- Configuração: `wrangler.toml`
- Banco: D1 `ever_tools_staging`

## Endpoints mantidos

- `GET /health` — apenas disponibilidade do Worker/D1, sem revelar estado de segredos.
- `POST /webhooks/resend` — webhook autenticado do Resend.
- `POST /webhooks/kiwify` — webhook autenticado da Kiwify.

Endpoints temporários de diagnóstico usados durante a ET-0D foram removidos após a validação E2E.

## Segredos de runtime

Os valores reais ficam somente em Cloudflare Secrets e nunca no repositório:

- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `KIWIFY_WEBHOOK_TOKEN`

Variáveis não sensíveis ficam em `wrangler.toml`.

## Evidência de staging

Validado na ET-0D:

- Worker ↔ D1;
- assinatura e idempotência do Resend;
- envio transacional e callback de entrega;
- assinatura do webhook Kiwify;
- compra real controlada;
- persistência do pedido;
- onboarding via Resend;
- reembolso real;
- GTM + GA4 + consentimento em Preview/DebugView.

O deploy normal do staging usa `wrangler deploy`.
