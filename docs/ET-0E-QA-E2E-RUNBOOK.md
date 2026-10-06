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

### Recuperação com compra

Esperado:
- HTTP 200 com mesma mensagem genérica;
- e-mail de ativação enviado;
- link de uso único;
- nova solicitação dentro de 5 minutos não dispara novo e-mail.

## 4. E2E de compra e ativação

1. concluir compra E2E interna;
2. confirmar webhook `purchase_approved`;
3. confirmar pedido `approved` no D1;
4. confirmar criação de activation token hash;
5. confirmar envio pelo Resend;
6. abrir link de ativação;
7. confirmar que o token de ativação vira `used_at`;
8. confirmar criação de sessão opaca;
9. confirmar carregamento da jornada Ever.Precifica;
10. atualizar a página;
11. confirmar acesso sem novo e-mail.

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
- [ ] sem overflow horizontal;
- [ ] campos legíveis;
- [ ] CTA alcançável;
- [ ] progresso compreensível;
- [ ] modal cabe na viewport;
- [ ] cards empilham corretamente;
- [ ] fundo não compromete contraste;
- [ ] performance aceitável com blur reduzido.

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
