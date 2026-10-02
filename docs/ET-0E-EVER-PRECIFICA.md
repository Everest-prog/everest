# ET-0E — Ever.Precifica

Status: em desenvolvimento  
Branch: `feat/et-0e-ever-precifica`

## 1. Objetivo do produto

O Ever.Precifica é a primeira Ferramenta Ever.Est comercial. Seu papel é responder, de forma rápida e auditável:

> "Por quanto eu deveria vender este produto ou serviço — e até onde posso negociar sem destruir minha margem?"

O produto deve transformar custos, despesas, tributos e meta de margem em uma decisão de preço clara, sem se comportar como um ERP.

Princípio da arquitetura Ever.Est:

> **Ever.Tools responde perguntas. Ever.Finance administra o negócio.**

## 2. Proposta funcional do MVP

O MVP deve entregar cinco respostas centrais:

1. preço mínimo econômico;
2. preço recomendado;
3. margem no preço informado pelo usuário;
4. markup equivalente;
5. limite de desconto antes de violar a margem mínima definida.

Também deve explicar, em linguagem simples, quais componentes mais pressionam o preço.

## 3. Escopo inicial

### Entradas

O motor deve aceitar, no mínimo:

- custo direto unitário;
- custo adicional unitário;
- custo/despesa fixa alocada por unidade;
- tributos percentuais incidentes sobre a venda;
- taxas/comissões percentuais incidentes sobre a venda;
- taxas fixas por venda;
- margem de lucro desejada;
- margem mínima aceitável;
- preço atual ou preço que o usuário deseja testar;
- desconto que o usuário deseja simular.

Nenhum cálculo deve depender de IA.

### Saídas

O resultado deve expor, no mínimo:

- custo-base da operação;
- percentual total incidente sobre a venda;
- preço de equilíbrio;
- preço recomendado;
- lucro unitário no preço recomendado;
- margem do preço recomendado;
- markup do preço recomendado;
- resultado do preço atual/testado;
- desconto máximo compatível com a margem mínima;
- preço mínimo após desconto;
- alertas determinísticos.

## 4. Modelo matemático inicial

Definições:

- `CD` = custo direto unitário;
- `CA` = custos adicionais unitários;
- `CFU` = custos/despesas fixas alocados por unidade;
- `TF` = taxas fixas por venda;
- `PV` = preço de venda;
- `V` = soma dos percentuais variáveis incidentes sobre a venda;
- `M` = margem de lucro desejada sobre o preço de venda.

Custo fixo unitário total:

```
C = CD + CA + CFU + TF
```

Resultado unitário:

```
Lucro = PV - C - (PV × V)
```

Margem sobre a venda:

```
Margem = Lucro / PV
```

Preço para uma margem-alvo:

```
PV = C / (1 - V - M)
```

Condição de validade:

```
V + M < 1
```

Preço de equilíbrio:

```
Preço_equilibrio = C / (1 - V)
```

Markup multiplicador:

```
Markup = PV / C
```

Para margem mínima `Mmin`, o menor preço permitido é:

```
Preço_minimo_margem = C / (1 - V - Mmin)
```

Desconto máximo sobre um preço de referência `Pref`:

```
Desconto_max = 1 - (Preço_minimo_margem / Pref)
```

O desconto máximo deve ser limitado a zero quando o preço de referência já estiver abaixo do mínimo da margem.

## 5. Regras determinísticas

O motor deve rejeitar ou alertar quando:

- qualquer custo obrigatório for negativo;
- percentuais forem incompatíveis com o domínio;
- `V >= 1`;
- `V + M >= 1`;
- `V + Mmin >= 1`;
- margem mínima for maior que margem desejada;
- preço testado for menor ou igual a zero;
- o preço atual estiver abaixo do equilíbrio;
- o preço atual estiver acima do equilíbrio, mas abaixo da margem mínima;
- o desconto simulado derrubar o preço abaixo da margem mínima.

Arredondamento monetário deve seguir uma política explícita e testável. Não usar arredondamento implícito de ponto flutuante para decisões financeiras.

## 6. IA

A IA não calcula preço, lucro, margem ou desconto.

Uso permitido da IA em etapas futuras:

- explicar o resultado;
- resumir os principais fatores que pressionam o preço;
- transformar alertas determinísticos em linguagem mais acessível;
- sugerir perguntas que o empreendedor deve investigar.

As respostas financeiras exibidas ao usuário devem sempre derivar do motor determinístico.

## 7. Eventos de produto

Eventos previstos:

- `tool_activation`;
- `precifica_calculation_started`;
- `precifica_calculation_completed`;
- `tool_result_view`;
- `precifica_price_simulated`;
- `precifica_discount_simulated`;
- `cross_sell_click`.

Não enviar custos, preços, margens ou outros valores financeiros sensíveis ao GA4 por padrão.

## 8. Etapas ET-0E

### ET-0E-A — Product Contract & Scope
- fechar perguntas que o produto responde;
- fechar inputs/outputs;
- fechar limites do MVP;
- definir critérios de aceite.

### ET-0E-B — Deterministic Pricing Engine
- implementar núcleo matemático isolado;
- política monetária/decimal;
- validações;
- testes unitários e vetores conhecidos.

### ET-0E-C — Product/Application Architecture
- definir estado da ferramenta;
- persistência local quando necessária;
- integração com entrega/comercial;
- fronteira entre site, ferramenta e automações.

### ET-0E-D — UX Architecture
- jornada;
- ordem das perguntas;
- progressive disclosure;
- mensagens de erro;
- compreensão do resultado.

**Checkpoint obrigatório com o proprietário antes de iniciar UX.**

### ET-0E-E — Visual/UI Design
- identidade visual;
- componentes;
- hierarquia;
- responsividade;
- estados vazios/erro/sucesso.

**Checkpoint obrigatório com o proprietário antes de iniciar Design.**

### ET-0E-F — Build
- implementação da ferramenta;
- integração do motor com a interface;
- instrumentação de eventos.

### ET-0E-G — QA & E2E
- testes funcionais;
- casos-limite;
- mobile;
- consentimento/analytics;
- fluxo comercial e entrega.

### ET-0E-H — Release
- checkout final;
- preço comercial;
- publicação;
- monitoramento inicial;
- critérios de rollback.

## 9. Fora do MVP

- emissão fiscal;
- estoque;
- contas a pagar/receber;
- DRE completa;
- sincronização bancária;
- cadastro permanente de clientes;
- motor contábil/fiscal por regime tributário;
- recomendação automática de alíquota tributária;
- substituição de contador ou consultoria tributária;
- funcionalidades próprias do Ever.Finance.

## 10. Critério para concluir ET-0E-A

- [ ] perguntas centrais do produto confirmadas;
- [ ] entradas obrigatórias confirmadas;
- [ ] saídas confirmadas;
- [ ] fórmula-base confirmada;
- [ ] política de alocação de custos confirmada;
- [ ] tratamento de tributos/taxas definido;
- [ ] critérios de erro/alerta definidos;
- [ ] distinção entre produto e serviço decidida;
- [ ] critérios de aceite do MVP registrados.
