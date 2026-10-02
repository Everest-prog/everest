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

### Escopo confirmado: Produto + Serviço

O Ever.Precifica atenderá **produtos e serviços** no mesmo MVP.

Os dois fluxos alimentam o mesmo motor determinístico. O que muda é a forma de decompor os custos para facilitar o preenchimento pelo usuário.

**Produto**
- custo de compra ou produção;
- embalagem, frete e outros custos diretos unitários;
- custos/despesas fixas alocados;
- tributos, taxas e comissões sobre a venda.

**Serviço**
- mão de obra/horas consumidas;
- materiais e despesas diretamente ligadas ao serviço;
- custos/despesas fixas alocados;
- tributos, taxas e comissões sobre a venda.

A interface não deve obrigar o usuário a traduzir seu negócio para termos contábeis complexos. A normalização para o motor ocorre internamente.

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

## 4.1. Política confirmada de alocação de custos fixos

O MVP adotará três caminhos simples:

**Produto — rateio por quantidade**
```
CFU = custos fixos mensais / unidades esperadas vendidas no mês
```

**Serviço — rateio por horas faturáveis**
```
custo_fixo_hora = custos fixos mensais / horas faturáveis disponíveis no mês
CFU_serviço = custo_fixo_hora × horas consumidas pelo serviço
```

**Modo manual**
O usuário poderá informar diretamente o custo fixo já alocado por unidade/serviço quando conhecer esse valor.

Ficam fora do MVP rateios por faturamento, centro de custo, ABC e métodos avançados de custeio.

## 4.2. Política confirmada para tributos, taxas e comissões

O Ever.Precifica não calculará nem recomendará alíquotas tributárias.

O usuário informará manualmente os percentuais incidentes sobre a venda, em campos separados:

- tributos sobre a venda;
- taxa percentual do meio de pagamento;
- comissão de marketplace/vendedor;
- outras taxas percentuais.

O motor somará esses percentuais em `V` para fins de cálculo, mas os resultados preservarão a abertura por componente para transparência.

Taxas fixas por transação devem ser informadas separadamente e incorporadas ao custo unitário total, não ao percentual variável.

É permitido informar `0%` em qualquer componente.

Orientação obrigatória no campo de tributos:

> Informe a alíquota efetivamente incidente sobre esta venda. Em caso de dúvida, consulte seu contador.

Fica fora do escopo do MVP:
- identificação automática de regime tributário;
- cálculo automático de impostos por CNAE/regime;
- recomendação de alíquota;
- substituição de orientação contábil ou tributária.

## 4.3. Política confirmada para margem e markup

A **margem sobre a venda** será o conceito principal do Ever.Precifica.

O usuário informará:

- margem de lucro desejada;
- margem mínima aceitável.

O preço recomendado será calculado a partir da margem desejada.

O markup não será solicitado como entrada principal. Ele será calculado automaticamente e exibido apenas como indicador secundário/educacional:

```
Markup = preço de venda / custo-base
```

A ferramenta deve evitar apresentar markup como sinônimo de margem.

Racional de produto: o público-alvo do Ever.Precifica tende a ter menor familiaridade com o conceito de markup. A experiência deve priorizar a pergunta de negócio "quanto da venda precisa sobrar?" em vez de exigir domínio de multiplicadores de custo.

Quando a etapa de UX for iniciada, o markup deverá receber explicação contextual simples e não competir visualmente com margem, preço recomendado e lucro unitário.

## 4.4. Política confirmada para preço técnico e referências comerciais

O Ever.Precifica distinguirá o resultado matemático do preço de apresentação comercial.

A ferramenta deverá calcular e exibir:

- **preço técnico**: menor preço necessário para atingir a margem desejada, conforme o motor determinístico;
- **sugestão comercial**: referência arredondada igual ou superior ao preço técnico;
- **sugestão psicológica**: referência comercial terminada em padrão de varejo, como `.90` ou `.99`, quando aplicável.

A ferramenta **nunca deve arredondar automaticamente para baixo** em relação ao preço técnico quando isso reduzir a margem abaixo da meta definida.

Cada referência deve exibir a margem efetivamente resultante.

O usuário poderá testar livremente outro preço; o motor recalculará lucro, margem e demais indicadores para esse valor.

O MVP não deve impor preço psicológico a todos os negócios. A sugestão psicológica é apenas uma alternativa e pode ser inadequada para serviços B2B, consultoria, produtos premium ou outros contextos.

## 4.5. Política confirmada para descontos e promoções

O MVP incluirá um simulador de descontos.

A ferramenta deverá calcular e diferenciar:

- **desconto que preserva a margem desejada**;
- **desconto máximo seguro**, limitado pela margem mínima aceitável definida pelo usuário;
- resultado de qualquer desconto livremente simulado pelo usuário.

Para cada desconto simulado, o motor deverá retornar:

- preço após desconto;
- lucro unitário;
- margem resultante;
- situação econômica do preço.

Estados determinísticos:

- atende ou supera a margem desejada;
- dá lucro, mas fica entre a margem mínima e a margem desejada;
- fica abaixo da margem mínima;
- gera prejuízo por estar abaixo do ponto de equilíbrio.

A ferramenta não deve afirmar que o usuário "deve" conceder determinado desconto. Ela informa os efeitos financeiros da decisão.

## 4.6. Princípio de linguagem para público leigo

O Ever.Precifica deve falar com o usuário em linguagem simples, direta e orientada à decisão.

Regras de comunicação:

- evitar jargão contábil, financeiro ou tributário quando houver equivalente simples;
- quando um termo técnico for necessário, explicar imediatamente em linguagem comum;
- priorizar frases que respondam "o que isso significa para mim?";
- mostrar primeiro a conclusão prática e depois o detalhe técnico;
- não usar tom alarmista, punitivo ou excessivamente técnico;
- diferenciar claramente "margem desejada", "margem mínima" e "prejuízo";
- usar exemplos monetários concretos sempre que isso facilitar a compreensão;
- markup deve aparecer apenas como informação secundária e explicada.

Exemplos de tradução de linguagem:

- "Margem abaixo do mínimo" → "Com este preço, sobra menos lucro do que o mínimo que você definiu."
- "Abaixo do ponto de equilíbrio" → "Nesse preço, você vende com prejuízo."
- "Margem desejada não atingida" → "Este preço ainda dá lucro, mas não chega à margem que você quer."
- "Desconto máximo seguro" → "Este é o maior desconto que você pode dar sem ficar abaixo da margem mínima que definiu."
- "Preço técnico" → "É o menor preço calculado para alcançar a margem que você escolheu."

Na ET-0E-D — UX Architecture, essa diretriz deve ser transformada em microcopy, mensagens de erro, ajuda contextual e explicações dos resultados.

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
- [x] política de alocação de custos confirmada;
- [x] tratamento de tributos/taxas definido;
- [ ] critérios de erro/alerta definidos;
- [x] distinção entre produto e serviço decidida;
- [ ] critérios de aceite do MVP registrados.
