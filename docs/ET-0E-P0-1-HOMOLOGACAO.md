# ET-0E-P0-1 — Homologação do direito comercial de 12 meses

**Emissão:** 16/10/2026. **Estado:** homologação automatizada local aprovada; homologação remota no Cloudflare D1/Workers em ambiente isolado **ainda não executada**. **Não é autorização para publicar.**

## Escopo e integridade

- Branch exclusiva: feat/et-0e-p0-1-homologation; PR draft #7, base feat/et-0e-p0-1-commercial-access (PR draft #6).
- Nenhuma alteração em main, produção, Kiwify real, Resend real, SITE_URL existente, D1 ever_tools_staging ou Worker ever-precifica-integrated-staging.
- Identidade, e-mail e pedidos usados nos testes: somente valores sintéticos **example.invalid**, com captura de mensagens inteiramente em memória, sem envio externo. O HMAC sintético é apenas fixture, nunca token de produção.
- Nenhum dado financeiro real ou credencial de comprador foi utilizado ou armazenado no repositório.

## Evidências que passaram

**GitHub Actions:** job Ever.Precifica P0-1 Isolated Homologation, run ID **38905962492**, conclusão success; job ID **116989479014**, commit **094ab169da87b9ef6897095e7cf5f3fea442d7d3**.

### Camada 1 — chamadas reais ao módulo Worker com banco SQL descartável

**18/18 testes PASS, 0 falhas.** Código em:
- automation-worker/test/commercial-entitlements.test.mjs
- automation-worker/test/commercial-access-db.test.mjs
- automation-worker/test/commercial-worker-e2e.test.mjs

Cobertura: 12 meses calendários, normalização UTC, caso de 29/02, renovação antecipada/tardia, reembolso apenas de termo específico, migração do schema anterior, webhook Kiwify sintético assinado em SHA1-HMAC, rejeição de assinatura falsa, emissão de e-mail **interceptada**, ativação real por token de uso único, sessão, validação, renovação por novo pedido, reembolso, chargeback, expiração contratual mesmo com sessão técnica vigente, proteção contra repetição e recuperação genérica quando não houver direito.

### Camada 2 — emulador Cloudflare local de Worker e D1

**PASS** no job do mesmo run, em 16/10/2026.

- Criado D1 **local descartável** com configuração temporária que usa nome/ID de banco exclusivamente QA (sem conta Cloudflare remota).
- Importado schema legado como SQL real.
- Executada **migração 0002** na base local.
- Criados pedido e grant fictícios, mais token sintético gerado e armazenado exclusivamente como hash no D1.
- Iniciado Wrangler dev em 127.0.0.1, serviço Worker real integrado à emulação D1.
- Verificado health, POST /access/activate, bloqueio de segundo uso do link, POST /access/validate com sessão ativa, data final do contrato e bloqueio de token inválido.
- Arquivo executado: automation-worker/test/qa-wrangler-local.mjs. O script verifica ausência de CLOUDFLARE_API_TOKEN/CF_API_TOKEN e usa flags **--local** e **--persist-to** com arquivos temporários descartáveis.

**O que o resultado NÃO prova:** compatibilidade com a infraestrutura remota do usuário, entrega pelo Resend real, assinatura gerada pela Kiwify real, segurança em concorrência real de webhooks, migração de dados históricos de clientes, login/ativação no navegador real e fluxo de compra/renovação/reembolso de valores financeiros. Nenhum desses testes foi executado ou autorizado em ambiente comercial.

## Próxima camada — homologação remota com Cloudflare realmente isolada

**Executar somente no Work com autenticação e autorização do proprietário para usar a conta Cloudflare e criar recursos de QA.** Não executar este procedimento na branch de produção nem apontar variáveis para bancos já existentes.

1. **Inventariar**, sem modificar: Workers existentes, D1 existentes, bindings, domínios. Confirmar que não há nomes de QA idênticos.
2. **Criar exclusivamente** novos Worker e D1, sugeridos: Worker `ever-precifica-p0-hml`, D1 `ever_precifica_p0_hml`. Devem ser recursos diferentes de `ever-tools-automation-staging` e `ever_tools_staging`.
3. Worker QA em URL `*.workers.dev` própria, com `ENVIRONMENT=hml` e `SITE_URL` igual à **origem QA** (não `soueverest.com.br`). Nunca reutilizar os webhooks, API keys comerciais ou domínios públicos. Credenciais QA gerenciadas somente pelo ambiente autenticado; não salvá-las em chat/PR/log.
4. Aplicar `schema.sql` num banco **novo**, ou migrar uma cópia **descartável** de schema legado com `0002`. Não rodar ALTER TABLE da 0002 em banco que já veio com `schema.sql` novo (coluna account_id já existente).
5. Fixtures fictícias de pedidos com valor zero, e-mail sintético ou caixa QA autorizada. Testar ativação/validação/expiração e recuperação somente com fluxo de QA, sem enviar e-mail ao domínio errado. Se Resend não estiver isolado, interceptar o envio em adaptador seguro; **não ligar o emissor comercial**.
6. Executar webhooks fictícios com assinatura **do ambiente QA**, nunca da conta comercial: (a) compra aprovada, (b) duplicação, (c) renovação antecipada, (d) refund apenas renovação, (e) chargeback da última compra válida, (f) eventual expiração simulada somente no D1 QA.
7. Testar QA no navegador com nova simulação fictícia, consentimento, recarregamento e persistência local. Confirmar que os dados locais NÃO são enviados a Worker, e-mails ou analytics.
8. Auditar saída: status das ordens, grants, tokens revogados, sessões, horários UTC e Brasília, logs sanitizados; não incluir URL de ativação/portador de sessão nem e-mail real em relatório.
9. Produzir relatório de aprovação ou bloqueios com versão do Worker QA, ID de implantação, evidências temporais e testes realmente realizados. Requer autorização explícita separada antes de migrar staging existente ou produção.

### Critérios de saída

- [x] 18/18 testes automatizados integrados locais passaram.
- [x] Emulador Cloudflare Workers + D1 passou com migração real local.
- [ ] Novo Worker QA/D1 **remotos e isolados** implantados e inventariados.
- [ ] Compra/aprovação/renovação/reembolso sintéticos comprovados no Worker remoto QA.
- [ ] Navegador real com ativação e preservação dos dados locais.
- [ ] Proteção contra corrida/idempotência validada sob carga/reordenação.
- [ ] Resend QA e recuperação de acesso completos sem exposição de credenciais.
- [ ] Plano de migração de dados existentes (backfill e sessões antigas) revisto, com backup/rollback.
- [ ] Revisão jurídica, preço, suporte e fluxo comercial completos; autorização de publicação.

**Decisão atual:** ET-0E-P0-1 aprovou apenas as camadas automatizadas locais. Avançar para Workers/D1 remotos somente em ambiente exclusivamente QA, preservando todo o estágio existente.
