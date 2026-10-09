# ET-0E-G — QA & E2E Runbook | Ever.Precifica

Status: preparado para execução  
Pré-requisito: ET-0E-F code-complete

## 1. Objetivo

Validar o Ever.Precifica como produto completo antes de release:

- jornada Produto;
- jornada Serviço;
- motor determinístico;
- persistência local;
- acesso pago;
- recuperação de acesso;
- revogação por refund/chargeback;
- responsividade;
- acessibilidade;
- consentimento/analytics;
- segurança de dados financeiros.

## 2. Pré-flight técnico

Antes do E2E real:

- [ ] CI Ever.Precifica Engine Tests verde;
- [ ] CI Ever.Tools Worker Tests verde;
- [ ] schema D1 atualizado no ambiente de staging;
- [ ] Worker de staging com as rotas /access/* implantadas;
- [ ] site/preview apontando para a versão ET-0E;
- [ ] Resend operacional;
- [ ] webhook Kiwify operacional;
- [ ] produto E2E interno disponível;
- [ ] GTM preparado para eventos específicos do Precifica, sem parâmetros financeiros.

### Aplicar schema D1 em staging

A partir do diretório `automation-worker`:

```bash
npx wrangler d1 execute ever_tools_staging --remote --file=./schema.sql
```

O schema usa `CREATE TABLE IF NOT EXISTS`, portanto a operação é aditiva para as tabelas de acesso.

## 3. Smoke test Worker

### Health

Esperado:

```json
{
  "ok": true,
  "environment": "staging",
  "database": "connected"
}
```

### Recuperação sem compra

Enviar e-mail sem entitlement.

Esperado:
- HTTP 200;
- mensagem genérica;
- nenhum indicador público de que o e-mail não possui compra;
- nenhum e-mail enviado.

Evidência em 06/10/2026:
- [x] endpoint respondeu `ok: true`;
- [x] mensagem pública genérica confirmada;
- [x] nenhum dado sobre existência de cadastro exposto.

### Recuperação com compra

Esperado:
- HTTP 200 com mesma mensagem genérica;
- e-mail de ativação enviado;
- link de uso único;
- nova solicitação dentro de 5 minutos não dispara novo e-mail.

Evidência em 06/10/2026:
- [x] recuperação com compra aprovada respondeu HTTP 200 e mensagem genérica;
- [x] recuperação com compra aprovada enviou novo e-mail de ativação;
- [x] novo token de recuperação criado no D1, ainda não usado e não revogado;
- [x] segunda recuperação dentro de 5 minutos manteve HTTP 200/mensagem genérica e não enviou novo e-mail;
- [x] novo link de recuperação ativado com sucesso em janela anônima, sem sessão prévia;
- [x] endpoint retornou HTTP 200, `ok = true`, `product_code = ever_precifica_e2e` e nova credencial opaca ao navegador;
- [x] sessão recuperada em janela anônima validada com HTTP 200, `valid = true` e `product_code = ever_precifica_e2e`.
- [x] confirmar novo token no D1;
- [x] confirmar cooldown de 5 minutos;
- [x] confirmar ativação do novo link em um navegador sem sessão.

## 4. E2E de compra e ativação

1. [x] concluir compra E2E interna;
2. [x] confirmar webhook `purchase_approved`;
3. [x] confirmar pedido `approved` no D1;
4. [x] confirmar criação de activation token hash;
5. [x] confirmar envio pelo Resend;
6. [ ] abrir link de ativação;
7. [x] confirmar que o token de ativação vira `used_at`;
8. [x] confirmar criação de sessão opaca;
9. [ ] confirmar carregamento da jornada Ever.Precifica;
10. [x] validar sessão persistida diretamente no Worker;
11. [x] confirmar acesso válido sem reutilizar link de ativação.

Evidência em 06/10/2026:
- novo pedido E2E registrado no D1 com `product_code = ever_precifica_e2e`;
- status confirmado como `approved`;
- `approved_at` preenchido;
- `refunded_at` nulo;
- activation token criado para o novo pedido, com `used_at` e `revoked_at` nulos;
- expiração configurada para 30 minutos após a criação;
- e-mail de ativação recebido na caixa do comprador.

Critério:
- token bruto de sessão fica somente no navegador;
- banco armazena apenas hash.

## 5. E2E de recuperação

1. apagar apenas a credencial local de acesso;
2. abrir a ferramenta;
3. usar "Recuperar meu acesso";
4. informar o e-mail da compra;
5. confirmar mensagem pública genérica;
6. confirmar e-mail;
7. ativar novo navegador;
8. validar sessão.

## 6. Refund e chargeback

### Refund

1. com sessão válida, executar refund do pedido;
2. receber webhook;
3. confirmar pedido `refunded`;
4. confirmar revogação dos activation tokens ainda ativos;
5. confirmar revogação das sessões;
6. recarregar ferramenta.

Esperado:
- acesso recusado;
- formulário de recuperação não reativa pedido reembolsado.

Evidência parcial em 06/10/2026:
- [x] pedido E2E existente confirmado no D1 como `refunded`;
- [x] tentativa de recuperação retornou somente a mensagem pública genérica;
- [x] nenhum e-mail de ativação foi recebido para o pedido reembolsado;
- [x] novo ciclo E2E: pedido aprovado posteriormente confirmado como `refunded` no D1, com `refunded_at` preenchido;
- [x] validar revogação de sessão/token no novo ciclo compra → ativação → recovery → refund.
- Evidência: `revoked_activation_tokens = 2`, `revoked_sessions = 2`, `active_sessions = 0` para o pedido reembolsado.
- [x] sessão previamente válida passou a retornar HTTP 401, `ok = false` e `valid = false` após o reembolso.

### Chargeback

Repetir com status `chargeback`.

## 7. Jornada Produto

Cenário base:

- Produto;
- custo por unidade;
- embalagem;
- entrega;
- tarifa fixa;
- custo mensal guiado por unidades;
- impostos;
- pagamento;
- comissão;
- margem desejada;
- margem mínima;
- preço atual.

Validar:
- [ ] 8 etapas;
- [ ] Voltar preserva dados;
- [ ] recarregar restaura estado;
- [ ] resultado bate com engine;
- [ ] preço técnico nunca abaixo da margem-meta;
- [ ] sugestão comercial não arredonda para baixo;
- [ ] preço atual recebe diagnóstico correto;
- [ ] desconto atualiza sem reload;
- [ ] nova simulação limpa números;
- [ ] direito de acesso permanece.

## 8. Jornada Serviço

Cenário base:

- Serviço;
- custo de mão de obra por hora × minutos;
- material;
- deslocamento;
- custo mensal guiado por horas vendáveis;
- taxas;
- margens;
- preço atual.

Validar:
- [ ] tempo informado é reaproveitado;
- [ ] custo de mão de obra calculado corretamente;
- [ ] custo mensal alocado por capacidade;
- [ ] linguagem não usa "horas faturáveis" como pergunta principal;
- [ ] resultado bate com engine.

## 9. Casos-limite

- [ ] custo principal zero;
- [ ] lote com 0 unidades;
- [ ] horas vendáveis zero;
- [ ] percentuais totalizando >=100%;
- [ ] margem mínima > margem desejada;
- [ ] taxas + margem desejada >=100%;
- [ ] preço atual abaixo do equilíbrio;
- [ ] desconto 0%;
- [ ] desconto 100%;
- [ ] sem custos mensais;
- [ ] todos percentuais 0%;
- [ ] vários gastos personalizados;
- [ ] troca Produto ↔ Serviço com dados específicos.

## 10. Mobile e responsividade

Testar ao menos:
- 360×800;
- 390×844;
- 768×1024;
- desktop >=1280px.

Validar:
- [x] sem overflow horizontal;
- [x] campos legíveis;
- [x] CTA alcançável;
- [x] progresso compreensível;
- [x] modal cabe na viewport;
- [x] cards empilham corretamente;
- [x] fundo não compromete contraste;
- [x] performance aceitável com blur reduzido.

Evidência: validação manual mobile realizada pelo proprietário em 07/10/2026 e considerada aprovada para o MVP.

## 11. Acessibilidade

- [ ] navegação por Tab;
- [ ] foco visível;
- [ ] labels persistentes;
- [ ] erro compreensível sem depender de cor;
- [ ] botões >=44px quando aplicável;
- [ ] reduced motion respeitado;
- [ ] fallback sem backdrop-filter legível;
- [ ] leitura de resultado em ordem lógica.

## 12. Analytics e privacidade

Eventos permitidos:
- `tool_activation`;
- `precifica_calculation_started`;
- `precifica_calculation_completed`;
- `tool_result_view`;
- `precifica_price_simulated`;
- `precifica_discount_simulated`.

Proibido enviar como parâmetro:
- preço;
- custo;
- lucro;
- margem;
- tributos;
- taxas;
- desconto;
- e-mail.

Validar:
- [ ] sem consentimento, GTM não carrega;
- [ ] após consentimento, eventos sem valores financeiros;
- [ ] revogação de consentimento mantém cálculo funcionando;
- [ ] localStorage financeiro é independente do consentimento analítico.

## 13. Critério de saída ET-0E-G

ET-0E-G só fecha quando:

- todos os testes bloqueantes passarem;
- acesso pago estiver operacional em staging;
- compra → ativação → uso → recovery → refund tiver evidência real;
- mobile não apresentar defeito bloqueante;
- analytics não transportar dados financeiros;
- nenhum erro crítico permanecer aberto.

Depois disso, seguir para ET-0E-H — Release.


### Evidência visual — Etapa 5

Validado em 06/10/2026:
- Percentuais de teste 6% + 3,2% + 12% + 1% = 22,2%;
- entrada com vírgula decimal (`3,2`) interpretada corretamente;
- resumo total atualizado em tempo real;
- distinção entre tarifa fixa em reais e cobrança percentual permaneceu clara.


### Evidência visual — Etapa 6

Validado em 06/10/2026:
- meta de R$ 25 por R$ 100 traduzida corretamente para 25%;
- tentativa de mínimo de R$ 30 com meta de R$ 25 foi bloqueada;
- mensagem exibida: "O mínimo não pode ser maior que sua meta.";
- erro apresentado de forma legível e sem apagar os valores informados.


### Evidência visual — Etapa 8

Validado em 06/10/2026:
- sugestão comercial exibida em destaque: R$ 154,00;
- menor preço para atingir a meta: R$ 153,56;
- alternativa comercial/psicológica: R$ 153,90;
- lucro por venda: R$ 46,41;
- margem resultante: 30,14%;
- menor preço sem prejuízo: R$ 94,34;
- composição do preço reconciliada entre custos, taxas/comissões e lucro;
- preço atual de R$ 79,90 diagnosticado como prejuízo;
- diferença para a meta exibida em reais;
- limites de desconto exibidos separadamente para preservação da meta e do mínimo.


### Evidência visual — Simulador de desconto

Validado em 06/10/2026:
- desconto de 10% aplicado sobre preço de referência de R$ 154,00;
- novo preço calculado: R$ 138,60;
- lucro por venda: R$ 34,42;
- margem resultante: 24,83%;
- status corretamente classificado como acima do mínimo de 15% e abaixo da meta de 25%;
- atualização ocorreu em tempo real sem reload.


### Evidência visual — Limite mínimo de desconto

Validado em 06/10/2026:
- desconto de 24,1% aplicado sobre preço de referência de R$ 154,00;
- preço resultante: R$ 116,89;
- lucro por venda: R$ 17,54;
- margem resultante: 15,01%;
- resultado ficou praticamente no limite mínimo definido de 15%;
- mensagem manteve classificação correta: acima do mínimo e abaixo da meta.


### Evidência visual — Desconto abaixo do mínimo

Validado em 06/10/2026:
- desconto de 30% aplicado sobre preço de referência de R$ 154,00;
- preço resultante: R$ 107,80;
- lucro por venda: R$ 10,46;
- margem resultante: 9,7%;
- sistema classificou corretamente como abaixo do mínimo definido de 15%;
- mensagem exibida: "Com esse desconto, sobra menos do que o mínimo que você definiu.";


### Evidência visual — Etapa 2 (Serviço)

Validado em 07/10/2026:
- fluxo de Serviço alterou corretamente a linguagem de custo por unidade para custo do trabalho;
- modo guiado exibiu custo por hora + duração do serviço;
- cenário de teste: R$ 5,00/hora por 78 minutos;
- custo direto calculado corretamente em R$ 6,50;
- texto de ajuda permaneceu em linguagem leiga e sem jargões.


### Evidência visual — Etapa 3 (Serviço)

Validado em 07/10/2026:
- linguagem adaptada corretamente para materiais usados no serviço e deslocamento;
- tarifa fixa por venda mantida como valor em reais;
- gasto personalizado adicional aceito e incluído no total;
- cenário de teste: R$ 10,00 materiais + R$ 0,50 deslocamento + R$ 1,10 tarifa fixa + R$ 5,00 estacionamento = R$ 16,60;
- alerta contra duplicidade de custos permaneceu visível.


### Evidência visual — Etapa 4 (Serviço)

Validado em 07/10/2026:
- rateio de custos mensais adaptado para horas realmente vendáveis;
- cenário de teste: R$ 4.200/mês, 200 horas vendáveis e serviço com duração de 78 minutos;
- parcela dos custos mensais calculada em R$ 27,30;
- duração do serviço foi reaproveitada da Etapa 2;
- linguagem manteve "horas que você consegue realmente vender" em vez de jargões como "horas faturáveis".


### Evidência visual — Resultado final (Serviço)

Validado em 07/10/2026:
- sugestão comercial exibida: R$ 82,00;
- menor preço calculado para atingir a meta: R$ 81,30;
- alternativa comercial: R$ 81,90;
- lucro por venda: R$ 25,04;
- margem resultante: 30,54%;
- menor preço sem prejuízo: R$ 54,79;
- custos informados consolidados em R$ 50,40;
- impostos, taxas e comissões consolidados em R$ 6,56;
- preço atual de R$ 78,00 permaneceu lucrativo, com R$ 21,36 de lucro e margem de 27,38%, porém abaixo da meta;
- limite de desconto preservando a meta: 0,85%;
- limite de desconto sem ficar abaixo do mínimo: 20,17%;
- motor combinou corretamente mão de obra, materiais, deslocamento, tarifa fixa e custos mensais alocados.


### Evidência de Analytics — Ever.Precifica

Validado em 09/10/2026:
- evento `precifica_calculation_started` apareceu no Tag Assistant;
- o acionador `Eventos Ever.Est — Analytics` reconheceu o evento;
- a tag `GA4 — Eventos Ever.Est` disparou com sucesso;
- validação de payload sem dados financeiros ainda pendente.
