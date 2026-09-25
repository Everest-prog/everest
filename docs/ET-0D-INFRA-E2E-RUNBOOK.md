# ET-0D — Infraestrutura externa e teste E2E

Este runbook fecha a ET-0D sem colocar segredos no repositório público.

## Arquitetura escolhida para o MVP

```
soueverest.com.br
      |
      | checkout_click
      v
Kiwify checkout
      |
      | webhook HTTPS
      v
Cloudflare Worker
      |
      +--> Cloudflare D1 (idempotência, pedidos e eventos)
      |
      +--> Resend (onboarding / lifecycle)
      |
      +--> logs operacionais
```

O Ever.Finance permanece fora deste fluxo.

### Por que Cloudflare Workers + D1

- endpoint HTTPS serverless sem manter servidor;
- Free plan do Workers é suficiente para a escala do MVP;
- D1 fornece persistência SQL e idempotência sem depender de planilha como banco;
- segredos ficam como Cloudflare Secrets, não em GitHub;
- não há risco de projeto gratuito pausar por inatividade;
- o endpoint pode começar em `workers.dev`; domínio customizado não é requisito para o webhook.

## Contas externas necessárias

1. Kiwify — produtor.
2. Cloudflare — Workers + D1.
3. Resend — e-mails transacionais.
4. Google Analytics 4 + Google Tag Manager — analytics, inicialmente em Preview.
5. Conta de teste separada/usuário de confiança para a compra E2E real.

## Ambientes

### Staging

- Worker: `ever-tools-automation-staging`
- D1: `ever_tools_staging`
- endpoint Kiwify: `https://<worker-staging>.workers.dev/webhooks/kiwify`
- endpoint Resend: `https://<worker-staging>.workers.dev/webhooks/resend`
- Resend: domínio/remetente de staging quando conveniente.
- Não usar dados reais desnecessários.

### Produção

- Worker: `ever-tools-automation`
- D1: `ever_tools_prod`
- endpoints equivalentes em Worker de produção.
- segredos independentes do staging.
- Kiwify de produção só aponta para o endpoint de produção depois do aceite E2E.

## Segredos

Nunca salvar valores reais neste repositório.

Segredos mínimos previstos no Cloudflare:

- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `KIWIFY_WEBHOOK_VERIFICATION_CONFIG` ou material equivalente definido pela especificação vigente
- `INTERNAL_EVENT_SECRET` para endpoints internos, se usados

Configuração não sensível:

- `ENVIRONMENT=staging|production`
- `RESEND_FROM_EMAIL`
- `SUPPORT_EMAIL`
- `SITE_URL=https://soueverest.com.br`

## D1 — schema mínimo

### webhook_events

- id
- provider
- provider_event_id UNIQUE
- event_type
- payload_hash
- received_at
- processed_at
- status
- error_code

Objetivo: idempotência, replay seguro e auditoria operacional.

### orders

- id
- provider
- provider_order_id UNIQUE
- product_code
- status
- gross_value
- currency
- contact_ref
- email_hash
- utm_source
- utm_medium
- utm_campaign
- approved_at
- refunded_at
- created_at
- updated_at

Não guardar CPF, telefone completo, senha ou payload bruto por padrão.

### email_events

- id
- provider_event_id UNIQUE
- contact_ref
- email_type
- event_type
- occurred_at
- created_at

## Kiwify

### Produto de produção

Depois de ET-0E:
- nome: Ever.Precifica
- pagamento único
- preço de lançamento: R$ 39,90
- página de vendas: URL Ever.Est
- checkout não listado em marketplace durante validação
- order bump só depois do Ever.Meta existir

### Produto técnico para E2E

Criar um produto privado/checkout não divulgado:
- nome sugerido: `Ever.Precifica — E2E interno`
- preço: R$ 5,00 (mínimo atualmente documentado pela Kiwify)
- usado somente para validar pagamento → webhook → email → reembolso
- não compartilhar publicamente

### Webhook

Em Kiwify > Apps > Webhooks:
1. apontar para `/webhooks/kiwify`;
2. selecionar produto;
3. habilitar pelo menos:
   - compra aprovada;
   - reembolso;
   - chargeback;
4. executar `Testar Webhook`;
5. confirmar HTTP 2xx;
6. revisar logs e payload;
7. testar replay pelo log.

O handler deve:
1. ler o corpo sem transformações antes da verificação;
2. verificar autenticidade conforme a especificação vigente da Kiwify;
3. extrair um ID estável do evento/pedido;
4. tentar inserir `webhook_events`;
5. se já existir, responder 2xx sem repetir efeitos;
6. mapear produto Kiwify → `product_code`;
7. atualizar `orders`;
8. disparar evento de onboarding/reembolso;
9. retornar 2xx rapidamente.

## Resend

### Domínios

Recomendação:
- `mail.soueverest.com.br` — transacional;
- futuramente outro subdomínio para marketing, se necessário.

Manter marketing e transacional separados ajuda a proteger reputação de entrega.

Passos:
1. criar conta;
2. adicionar domínio;
3. publicar os registros DNS solicitados (SPF/DKIM e demais registros exibidos);
4. aguardar verificação;
5. criar API key;
6. salvar chave apenas como Cloudflare Secret;
7. criar remetente, ex.: `Ever.Est <noreply@mail.soueverest.com.br>`;
8. configurar Reply-To para o endereço real de suporte;
9. criar webhook Resend para `/webhooks/resend`;
10. salvar signing secret como Cloudflare Secret.

### Eventos Resend importantes

- email.sent
- email.delivered
- email.delivery_delayed
- email.bounced
- email.complained
- email.failed
- contact.updated/unsubscribed, conforme modelo usado

Webhook Resend deve ter assinatura validada antes de qualquer processamento.

## GA4 / GTM

1. criar propriedade GA4 para Ever.Est;
2. criar Web Data Stream para `soueverest.com.br`;
3. criar container Web no Google Tag Manager;
4. NÃO publicar o container imediatamente;
5. conectar os eventos existentes de `window.dataLayer` em Preview;
6. criar eventos GA4 equivalentes;
7. configurar consentimento antes de analytics/ads em produção;
8. publicar GTM somente após validar consentimento e eventos.

Eventos iniciais:
- everest_page_view
- tools_hub_click
- tool_interest_click
- commercial_lead_submit
- commercial_lead_thank_you
- everfinance_click
- checkout_click

Eventos de compra devem preferencialmente vir da camada server-side ou ser conciliados com a Kiwify para evitar confiar apenas no navegador.

## Testes

### T0 — Site / dataLayer

Usar URL com UTMs fictícias:
`?utm_source=e2e&utm_medium=test&utm_campaign=et0d`

Critérios:
- página carrega;
- `everest_page_view` aparece no dataLayer;
- clique em Ferramentas gera `tools_hub_click`;
- UTMs aparecem no evento;
- nenhum PII aparece no dataLayer.

### T1 — Webhook sintético Kiwify

Usar `Testar Webhook` da Kiwify.

Critérios:
- endpoint retorna 2xx;
- evento entra no D1 uma vez;
- reenvio/replay não duplica efeitos;
- log não registra segredo ou PII desnecessário.

### T2 — Resend

Disparar um onboarding de staging.

Critérios:
- mensagem enviada;
- entrega aparece no Resend;
- webhook `email.delivered` chega no Worker;
- evento é persistido uma única vez;
- assinatura inválida recebe rejeição.

### T3 — Compra real controlada

Usar checkout E2E de R$ 5,00 com comprador de teste confiável.

Preferência operacional: Pix por facilitar o ciclo compra/reembolso.

Critérios:
- compra aprovada na Kiwify;
- Worker recebe evento real;
- pedido fica `approved`;
- apenas um onboarding é enviado;
- dados de atribuição são mantidos quando disponíveis;
- nenhum acesso ao Ever.Finance é criado.

### T4 — Replay real

Reenviar o webhook de compra aprovada pelos logs da Kiwify.

Critérios:
- HTTP 2xx;
- nenhuma segunda linha lógica de pedido;
- nenhum segundo onboarding;
- `webhook_events` registra/reconhece idempotência conforme estratégia adotada.

### T5 — Reembolso

Reembolsar a compra de teste pela Kiwify.

Critérios:
- webhook de reembolso recebido;
- pedido muda para `refunded`;
- fluxos promocionais relacionados são interrompidos;
- reprocessamento do evento não duplica efeitos.

### T6 — Falhas

Executar no staging:
- assinatura Kiwify inválida;
- assinatura Resend inválida;
- produto desconhecido;
- evento duplicado;
- Resend indisponível/erro simulado;
- D1 indisponível/erro simulado.

Critério geral: falha observável, sem corrupção de estado e com replay possível.

## Critério para fechar ET-0D

Todos obrigatórios:

- [ ] contas externas criadas;
- [ ] Worker staging ativo;
- [ ] D1 staging ativo;
- [ ] Kiwify webhook de teste passa;
- [ ] Resend domínio/remetente verificado;
- [ ] Resend webhook passa;
- [ ] GTM/GA4 validados em Preview;
- [ ] consentimento definido antes de publicação de tags;
- [ ] compra real controlada passa;
- [ ] replay não duplica efeitos;
- [ ] reembolso passa;
- [ ] segredos ausentes do GitHub;
- [ ] logs não expõem PII desnecessário;
- [ ] evidências registradas;
- [ ] PR ET-0D revisado antes do merge.

## Go-live

Somente depois:
1. trocar URLs/config de staging pelas de produção;
2. repetir T1/T2 na produção;
3. ativar checkout real do Ever.Precifica somente quando ET-0E estiver pronto;
4. monitorar as primeiras vendas manualmente;
5. manter capacidade de replay e reconciliação.

## Fora do escopo da ET-0D

- lógica financeira do Ever.Precifica;
- página final de vendas do Ever.Precifica;
- automações avançadas de cross-sell;
- afiliados;
- integração com Ever.Finance.
