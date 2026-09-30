# Ever.Tools Automation Worker

Cloudflare Worker de staging da ET-0D.

- Root directory: `automation-worker`
- Branch: `feat/et-0d-digital-foundation`
- Configuração: `wrangler.toml`
- Banco: D1 `ever_tools_staging`

Este arquivo também serve como alteração segura para disparar o pipeline de implantação conectado ao GitHub.

Resend runtime secrets validation: redeploy trigger after both production build secrets were configured.
