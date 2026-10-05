# ET-0E — Ever.Precifica

Status: ET-0E-A concluída · ET-0E-B concluída · ET-0E-C concluída · ET-0E-D concluída · ET-0E-E aguardando autorização  
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

## 4.5. Política confirmada para diagnóstico do preço atual

O campo de preço atual será opcional. Quando informado, o Ever.Precifica deverá comparar o preço praticado com os custos e metas do usuário.

O diagnóstico deverá retornar:

- preço atual;
- lucro unitário no preço atual;
- margem efetiva;
- diferença para o preço necessário à margem desejada;
- diferença percentual para a meta;
- situação econômica do preço.

Estados determinísticos:

- gera prejuízo;
- não gera prejuízo, mas fica abaixo da margem mínima;
- fica entre a margem mínima e a margem desejada;
- atende ou supera a margem desejada.

A ferramenta pode mostrar quanto o preço precisaria variar para alcançar a margem desejada, mas não deve afirmar que o usuário necessariamente deve aumentar ou reduzir o preço, pois a decisão comercial também depende de mercado e estratégia.

## 4.6. Política confirmada para descontos e promoções

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

## 4.7. Princípio de linguagem para público leigo

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
- [x] implementar núcleo matemático isolado;
- [x] política monetária/decimal;
- [x] validações;
- [x] testes unitários iniciais e vetores conhecidos;
- [x] executar segunda rodada de casos-limite e invariantes antes de encerrar a etapa.

Política técnica adotada:
- dinheiro representado em centavos inteiros;
- percentuais representados em basis points (0,01 ponto percentual);
- cálculos críticos executados com inteiros/BigInt;
- arredondamento explícito e testável;
- preço-alvo ajustado para cima até a margem efetivamente ser atingida após os arredondamentos de centavos;
- nenhuma decisão financeira depende de ponto flutuante ou IA.

Implementação: `ferramentas/precifica/engine.mjs`  
Testes: `tests/ever-precifica-engine.test.mjs`  
CI: `Ever.Precifica Engine Tests`

A segunda rodada adicionou uma matriz de cenários para validar duas invariantes essenciais:

- o preço técnico é o menor centavo que efetivamente atinge a margem desejada;
- o ponto de equilíbrio é o menor centavo que não gera prejuízo.

O cálculo foi ajustado para considerar que o arredondamento individual de tributos/taxas pode deslocar o mínimo real alguns centavos para cima ou para baixo em relação à fórmula fechada.

**ET-0E-B encerrada em 02/10/2026 com CI aprovada.**

### ET-0E-C — Product/Application Architecture
- [x] definir estratégia inicial de estado da ferramenta;
- [x] definir persistência local para o MVP;
- [x] definir integração de acesso/ativação do produto pago;
- [x] definir fronteira operacional entre site, ferramenta e automações;
- [x] definir política de limpeza/reset de dados;
- [x] registrar critérios de aceite da arquitetura.

#### Estratégia confirmada de execução e persistência no MVP

O Ever.Precifica executará seus cálculos diretamente no navegador, usando o motor determinístico da própria ferramenta.

Para o MVP:

- custos, preços, margens e simulações permanecem no cliente;
- esses valores não devem ser enviados ao GA4;
- o estado da ferramenta pode ser persistido em `localStorage` para permitir continuidade de uso;
- o usuário deve ter uma ação explícita para apagar os dados locais da ferramenta;
- não haverá histórico financeiro em backend;
- não haverá cadastro permanente de produtos, clientes ou operações;
- não haverá login apenas para suportar persistência;
- o Worker será utilizado apenas quando houver necessidade real de integração comercial, ativação, entrega ou automação;
- funcionalidades de histórico financeiro permanente continuam pertencendo ao Ever.Finance.

Princípio de privacidade do MVP:

> O Ever.Precifica deve funcionar sem enviar os dados financeiros da simulação para servidores da Ever.Est quando isso não for necessário.

A persistência local é uma conveniência de uso, não um registro contábil nem um backup.

#### Estratégia confirmada de acesso e ativação do produto pago

O MVP não terá criação de conta, senha ou área de membros própria apenas para liberar o Ever.Precifica.

Fluxo previsto:

1. compra aprovada na Kiwify;
2. webhook recebido pelo Worker;
3. D1 registra o direito de acesso vinculado ao pedido;
4. o cliente recebe um e-mail de ativação;
5. o link de ativação é validado pelo Worker;
6. o navegador recebe uma credencial local de acesso;
7. os cálculos continuam acontecendo localmente no navegador;
8. reembolso ou chargeback revoga o direito de acesso correspondente no backend.

A validação de acesso deve ser separada dos dados financeiros da simulação: o backend precisa saber apenas se o usuário possui direito de uso, não os custos, preços, margens ou cenários informados na ferramenta.

A interface deverá usar linguagem simples, evitando termos como "licença", "token" ou "credencial". Exemplo de mensagem ao usuário:

> Seu acesso está liberado. Você já pode usar o Ever.Precifica neste dispositivo.

A proteção de acesso do MVP é uma proteção comercial proporcional ao valor e ao risco do produto, não um sistema antipirataria complexo.

#### Recuperação de acesso no MVP

O usuário poderá recuperar o acesso sem senha e sem atendimento manual obrigatório.

Fluxo previsto:

1. o usuário seleciona "Recuperar meu acesso";
2. informa o mesmo e-mail utilizado na compra;
3. o Worker consulta se existe direito de acesso válido;
4. a interface sempre retorna uma mensagem genérica, independentemente do resultado da consulta;
5. quando houver direito válido, o sistema envia um novo link de ativação por e-mail;
6. o novo link invalida links de ativação anteriores ainda não utilizados;
7. a nova ativação grava novamente a credencial local no navegador.

Mensagem pública recomendada:

> Se encontrarmos uma compra válida para este e-mail, você receberá um novo link de acesso.

Essa resposta evita revelar se determinado e-mail está ou não cadastrado.

Para o MVP não haverá limite rígido de dispositivos. Abuso relevante poderá ser monitorado e tratado em evolução futura, sem introduzir complexidade prematura no produto.

A ação "Apagar meus dados" remove apenas o estado e os dados financeiros armazenados localmente no navegador. A eventual credencial de acesso deve ser tratada separadamente para evitar que uma limpeza de simulação force desnecessariamente uma nova ativação.

#### Fronteira operacional confirmada

**Site público — `soueverest.com.br`**
- apresenta o Ever.Precifica;
- explica proposta de valor e benefícios;
- conduz o usuário ao checkout;
- não processa pagamentos nem armazena dados financeiros das simulações.

**Kiwify**
- processa checkout e pagamento;
- emite eventos de compra aprovada, reembolso e chargeback;
- permanece como fonte comercial de origem para o direito de acesso no MVP.

**Cloudflare Worker**
- valida webhooks;
- registra e atualiza o direito de acesso;
- gera e valida links de ativação e recuperação;
- não recebe custos, preços, margens ou cenários da ferramenta por padrão.

**D1**
- persiste somente dados necessários à operação comercial e ao direito de acesso;
- não funciona como histórico financeiro das simulações.

**Ever.Precifica no navegador**
- executa o motor determinístico;
- mantém o estado e as simulações localmente;
- não depende do backend para calcular preços;
- não envia valores financeiros ao GA4.

**Resend**
- envia os e-mails transacionais de ativação e recuperação de acesso.

Princípio arquitetural:

> Comercial e acesso ficam no backend. Cálculo e dados financeiros da simulação ficam no navegador.

#### Critérios de aceite da ET-0E-C

A arquitetura do MVP é considerada aceita quando:

- o Ever.Precifica consegue calcular integralmente no cliente;
- a ferramenta pode preservar estado local sem conta de usuário;
- o usuário pode apagar os dados financeiros locais sem perder necessariamente o direito de acesso;
- a compra aprovada pode gerar direito de uso;
- reembolso e chargeback podem revogar esse direito;
- o usuário pode recuperar o acesso por e-mail sem senha;
- consultas de recuperação não revelam se um e-mail possui compra;
- o backend não precisa receber os dados financeiros da simulação;
- não há sobreposição desnecessária com funcionalidades do Ever.Finance.

**ET-0E-C encerrada e aprovada em 03/10/2026.**

**Próximo checkpoint: ET-0E-D — UX Architecture. A etapa só deve começar após ciência explícita do proprietário de que o trabalho passará a tratar jornada, textos, compreensão, erros e organização da experiência.**

### ET-0E-D — UX Architecture
- [x] definir jornada principal;
- [x] definir ordem das perguntas;
- [x] definir progressive disclosure;
- [x] definir mensagens de erro;
- [x] definir compreensão e hierarquia dos resultados;
- [x] definir comportamento de retomada e edição;
- [x] registrar critérios de aceite de UX.

**Checkpoint com o proprietário concluído em 03/10/2026. ET-0E-D autorizada para início.**

#### Jornada principal proposta

O MVP utilizará um fluxo guiado em etapas curtas, com salvamento local automático e possibilidade de voltar sem perder respostas.

Ordem inicial:

1. O que você quer precificar? — Produto ou serviço.
2. Quanto custa entregar isso? — Compra/produção ou mão de obra/material.
3. Quais outros custos entram nessa venda? — Embalagem, frete, taxas fixas e outros custos diretos.
4. Quanto dos seus custos mensais precisa entrar nesse preço? — Rateio guiado de custos fixos.
5. Quanto é descontado da venda? — Tributos, cartão, marketplace, comissão e outros percentuais.
6. Quanto você quer que sobre? — Margem desejada e margem mínima em linguagem simples.
7. Você já vende por algum preço? — Campo opcional para diagnóstico.
8. Seu resultado — Resposta prática primeiro; detalhes técnicos depois.

Regra de ritmo: apresentar uma pergunta principal por vez quando o conceito for novo; campos intimamente relacionados podem ser agrupados para não tornar a jornada excessivamente lenta.

#### ET-0E-D1 — Etapa 1: Produto ou Serviço

**Objetivo de UX**

Descobrir qual tipo de item o usuário deseja precificar e adaptar a linguagem das próximas etapas sem exigir conhecimento contábil.

A seleção não altera o motor matemático central; altera apenas os nomes, exemplos e a forma de decompor os custos.

**Pergunta principal**

> O que você quer precificar?

**Texto de apoio**

> Escolha a opção que mais combina com o que você vende. Não precisa se preocupar com termos técnicos — vamos adaptar as próximas perguntas para você.

**Opção: Produto**

Descrição sugerida:

> Algo que você vende por unidade, como mercadoria, alimento, peça, artesanato ou item fabricado.

Exemplos de apoio:
- produto comprado para revenda;
- produto fabricado;
- comida ou bebida;
- artesanato;
- produto digital vendido por unidade.

**Opção: Serviço**

Descrição sugerida:

> Um trabalho que você realiza para o cliente, normalmente envolvendo tempo, conhecimento ou mão de obra.

Exemplos de apoio:
- consultoria;
- manutenção;
- instalação;
- atendimento profissional;
- serviço executado por hora ou por projeto.

**Ajuda para quem estiver em dúvida**

Texto sugerido:

> Se sua venda mistura produto e serviço, escolha o que representa a parte principal do que o cliente está comprando. Os outros custos poderão ser adicionados nas próximas etapas.

O MVP não terá uma terceira categoria "Produto + Serviço". Um item híbrido continuará utilizando um dos dois fluxos, com os demais custos adicionados posteriormente.

**Comportamento da etapa**

- uma única opção pode ficar selecionada por vez;
- a escolha deve ser salva imediatamente no estado local;
- ao voltar para esta etapa, a escolha anterior permanece selecionada;
- o usuário só pode avançar após escolher Produto ou Serviço;
- trocar a escolha deve atualizar as próximas perguntas sem apagar valores que ainda possam ser reaproveitados com segurança;
- quando a mudança tornar algum dado incompatível com o novo fluxo, a ferramenta deve pedir confirmação antes de descartar esse dado.

**Resultado interno esperado**

Valor normalizado:

```
itemType = "product" | "service"
```

Nenhum dado financeiro é coletado nesta etapa.

**Linguagem**

Evitar:
- "natureza da operação";
- "classificação do item";
- "objeto da precificação".

Preferir:
- "O que você quer precificar?";
- "Produto";
- "Serviço";
- "Escolha o que mais combina com o que você vende."

**Critérios de aceite da Etapa 1**

- o usuário consegue entender a diferença entre Produto e Serviço sem conhecimento técnico;
- a decisão cabe em uma única tela/etapa;
- a escolha adapta o vocabulário das etapas seguintes;
- não há exigência de preencher valores financeiros;
- um negócio híbrido consegue continuar sem precisar de uma terceira categoria;
- a escolha persiste ao voltar ou recarregar a ferramenta;
- nenhuma ação desta etapa envia dados financeiros ao backend ou ao GA4.

#### ET-0E-D2 — Etapa 2: Quanto custa entregar isso?

**Objetivo de UX**

Capturar o custo direto principal do item sem exigir que o usuário conheça expressões como "custo direto unitário" ou "custo de mão de obra apropriado".

A etapa muda de linguagem conforme `itemType`.

---

##### Fluxo Produto

**Pergunta principal**

> Quanto custa para você ter 1 unidade pronta para vender?

**Texto de apoio**

> Pense no valor que você paga para comprar ou produzir uma unidade. Embalagem, frete, taxas e outros gastos entram nas próximas etapas.

**Campo principal**

> Custo de 1 unidade

Entrada monetária em reais.

**Ajuda contextual**

Para revenda:

> Use o valor que você paga por uma unidade do produto.

Para fabricação/produção:

> Some apenas os materiais e custos diretamente usados para produzir uma unidade. Se preferir, você poderá detalhar outros gastos depois.

**Modo opcional: "Quero calcular esse valor"**

Para usuários que não conhecem o custo unitário, a ferramenta poderá abrir um cálculo auxiliar simples:

- custo total do lote/produção;
- quantidade de unidades produzidas/compradas.

Cálculo:

```
custo_unitario = custo_total_do_lote / quantidade_de_unidades
```

A ferramenta mostra o resultado em linguagem simples:

> Cada unidade custa aproximadamente R$ X para você.

O resultado calculado alimenta o mesmo campo principal.

---

##### Fluxo Serviço

**Pergunta principal**

> Quanto custa o trabalho usado para realizar este serviço?

**Texto de apoio**

> Considere somente o custo diretamente ligado à execução deste serviço. Materiais, deslocamento e outros gastos poderão ser adicionados depois.

O usuário terá dois caminhos.

**Caminho simples — Já sei o custo**

Campo:

> Custo de mão de obra deste serviço

Exemplo de ajuda:

> Se você já sabe quanto custa a mão de obra necessária para realizar este serviço, informe o valor aqui.

**Caminho guiado — Quero calcular**

Perguntas:

1. Quanto custa 1 hora desse trabalho?
2. Quanto tempo este serviço leva?

O tempo deve aceitar horas e minutos em linguagem natural de formulário, mas ser normalizado internamente para minutos.

Cálculo:

```
custo_mao_de_obra =
  custo_hora × (minutos_do_servico / 60)
```

Exemplo de resultado:

> Este serviço usa aproximadamente R$ X de mão de obra.

A ferramenta não deve tentar definir automaticamente quanto "vale" a hora do usuário nesta etapa. Ela calcula a partir do valor informado.

**Ajuda para quem não sabe o custo da própria hora**

Texto confirmado:

> Se você ainda não sabe quanto custa uma hora do seu trabalho, tudo bem. Você pode informar uma estimativa agora e ajustar depois.

**Decisão de MVP:** não haverá assistente para calcular o custo-hora nesta etapa.

O Ever.Precifica não abrirá um módulo completo de formação do custo-hora pessoal/empresarial dentro desta etapa, para não misturar precificação com cálculo de pró-labore, folha ou estrutura financeira. Essa possibilidade poderá ser reavaliada em evolução futura do produto.

---

##### Regras comuns da Etapa 2

- valores monetários são armazenados em centavos inteiros;
- o campo principal não pode receber valor negativo;
- zero pode ser aceito apenas quando fizer sentido e deve gerar confirmação/aviso, pois um custo direto igual a zero pode indicar preenchimento incompleto;
- o usuário pode voltar e alterar o valor sem perder as demais etapas compatíveis;
- cálculos auxiliares servem apenas para chegar ao custo direto normalizado;
- a ferramenta deve mostrar o valor calculado antes de o usuário avançar;
- nenhum valor desta etapa é enviado ao GA4;
- nenhum valor financeiro precisa ser enviado ao backend.

**Resultado interno esperado**

Produto:

```
directCostCents
```

Serviço:

```
directCostCents
```

Mesmo com experiências diferentes, ambos convergem para o mesmo campo normalizado do motor.

**Linguagem a evitar**

- custo direto unitário;
- apropriação de mão de obra;
- custo de transformação;
- custo primário.

**Linguagem preferida**

- "Quanto custa para você ter 1 unidade pronta para vender?";
- "Quanto custa o trabalho usado para realizar este serviço?";
- "Custo de 1 unidade";
- "Custo de mão de obra deste serviço";
- "Quero calcular esse valor".

**Critérios de aceite da Etapa 2**

- um vendedor de produto consegue informar o custo de uma unidade sem entender contabilidade;
- um produtor consegue chegar ao custo unitário por lote e quantidade;
- um prestador de serviço pode informar o custo direto da mão de obra ou calculá-lo por hora × tempo;
- o fluxo não mistura custo direto com custos fixos, taxas ou tributos;
- Produto e Serviço convergem para `directCostCents`;
- o usuário entende o valor obtido antes de avançar;
- os dados permanecem locais ao navegador.

**Etapa 2 aprovada para o MVP em 05/10/2026, sem assistente de formação de custo-hora.**

#### ET-0E-D3 — Etapa 3: Quais outros custos entram nessa venda?

**Objetivo de UX**

Capturar gastos adicionais que acontecem por venda, unidade ou execução do serviço sem misturá-los com custos mensais, tributos percentuais ou margem.

A etapa deve ajudar o usuário a lembrar custos que normalmente ficam "escondidos", mas sem obrigá-lo a preencher categorias que não existem em seu negócio.

**Pergunta principal**

> Além do custo principal, você tem algum outro gasto para fazer esta venda?

**Texto de apoio**

> Pense em valores que aparecem porque esta venda aconteceu — como embalagem, entrega, deslocamento, material extra ou uma tarifa fixa. Se não tiver nenhum, você pode continuar.

A etapa é opcional: todos os valores podem permanecer em zero.

---

##### Fluxo Produto

Sugestões iniciais de campos:

- **Embalagem por unidade**
  > Caixa, saco, etiqueta, proteção ou outro material usado para entregar uma unidade.

- **Frete ou entrega que você paga**
  > Informe apenas a parte que fica por sua conta nesta venda.

- **Outros gastos por unidade**
  > Qualquer outro valor que só existe porque aquela unidade foi vendida.

- **Tarifa fixa por venda**
  > Um valor fixo cobrado por pedido ou transação. Percentuais de cartão, marketplace ou comissão entram depois.

Exemplos que podem aparecer como ajuda contextual:
- embalagem;
- etiqueta;
- sacola;
- material de proteção;
- frete subsidiado;
- montagem por unidade;
- personalização cobrada de forma fixa;
- tarifa fixa da plataforma.

---

##### Fluxo Serviço

Sugestões iniciais de campos:

- **Materiais usados neste serviço**
  > Peças, insumos, produtos ou materiais consumidos para realizar o serviço.

- **Deslocamento**
  > Combustível, transporte, pedágio, estacionamento ou outro gasto específico para atender este cliente.

- **Outros gastos deste serviço**
  > Qualquer outro valor que aparece porque este serviço foi realizado.

- **Tarifa fixa por venda**
  > Um valor fixo cobrado por pedido ou transação. Percentuais de cartão ou comissão entram depois.

Exemplos que podem aparecer como ajuda contextual:
- material consumível;
- peça aplicada;
- estacionamento;
- pedágio;
- deslocamento terceirizado;
- impressão;
- serviço terceirizado diretamente relacionado à entrega.

---

##### Progressive disclosure

Para evitar uma tela com muitos campos, o usuário verá primeiro opções simples como:

> + Adicionar embalagem  
> + Adicionar entrega/deslocamento  
> + Adicionar outro gasto  
> + Adicionar tarifa fixa

Somente os campos escolhidos são expandidos.

A ferramenta também poderá oferecer:

> Não tenho outros gastos nesta venda

Essa escolha apenas mantém os valores adicionais em zero; não impede o usuário de voltar e adicioná-los depois.

**Campo "Outro gasto"**

O usuário poderá adicionar mais de um gasto personalizado.

Cada item terá:

- nome opcional ou curto, como "laço", "estacionamento" ou "terceirização";
- valor em reais.

Internamente, todos os itens adicionais variáveis em valor fixo por venda/unidade serão somados para formar `additionalCostCents`.

A tarifa fixa por transação permanecerá separada em `fixedFeeCents`, porque possui papel próprio no contrato do motor.

**Importante: não duplicar custos**

A etapa deve alertar em linguagem simples:

> Se este valor já está incluído no custo que você informou antes, não adicione novamente.

Isso é especialmente importante para:
- frete já incorporado ao custo de compra;
- material já incluído no custo de produção;
- mão de obra já incluída no custo direto do serviço.

**Diferenciar valor fixo de percentual**

Ajuda contextual:

> Aqui entram valores em reais, como R$ 3,50 por embalagem. Percentuais, como 3,2% do cartão ou 12% do marketplace, serão informados em outra etapa.

Essa distinção deve aparecer antes ou junto do campo "Tarifa fixa por venda".

**Comportamento**

- a etapa é opcional;
- nenhum campo começa com valor financeiro presumido;
- valores negativos são inválidos;
- zero é permitido;
- o usuário pode adicionar e remover gastos personalizados;
- remover um gasto deve pedir confirmação apenas quando houver valor preenchido;
- a soma dos gastos adicionais deve ser recalculada imediatamente;
- a ferramenta pode mostrar um pequeno resumo ao final da etapa:
  > Outros gastos desta venda: R$ X
- valores permanecem salvos localmente;
- nenhuma descrição ou valor financeiro desta etapa é enviado ao GA4 ou ao backend.

**Resultado interno esperado**

```
additionalCostItems = [
  { label, amountCents },
  ...
]

additionalCostCents = soma(additionalCostItems.amountCents)

fixedFeeCents
```

O array detalhado pertence apenas ao estado da interface. O motor recebe os valores normalizados agregados.

**Linguagem a evitar**

- custos acessórios;
- custos variáveis unitários;
- despesas diretamente atribuíveis;
- despesas incrementais.

**Linguagem preferida**

- "Outros gastos desta venda";
- "Embalagem";
- "Entrega ou deslocamento";
- "Materiais usados";
- "Tarifa fixa por venda";
- "Outro gasto";
- "Se este valor já está incluído no custo anterior, não adicione novamente."

**Critérios de aceite da Etapa 3**

- o usuário entende que a etapa trata de valores em reais ligados àquela venda;
- Produto e Serviço recebem exemplos compatíveis com sua realidade;
- a etapa não mistura percentuais, custos mensais ou margem;
- o usuário pode continuar sem preencher nenhum gasto adicional;
- é possível adicionar gastos personalizados sem aumentar a complexidade do motor;
- a interface previne, por texto, a duplicação de custos;
- os valores convergem para `additionalCostCents` e `fixedFeeCents`;
- os dados permanecem locais ao navegador.

**Etapa 3 aprovada para o MVP em 05/10/2026.**

#### ET-0E-D4 — Etapa 4: Quanto dos seus custos mensais precisa entrar nesse preço?

**Objetivo de UX**

Ajudar o usuário a incluir uma parte dos custos mensais do negócio no preço sem exigir que ele conheça termos como rateio, absorção ou custo fixo unitário.

A etapa deve explicar primeiro o raciocínio prático:

> Seu negócio tem gastos que existem mesmo quando nenhuma venda acontece. Vamos dividir uma parte deles entre os produtos ou serviços para que o preço ajude a pagar essas contas.

Exemplos de apoio:
- aluguel;
- internet;
- sistema/software;
- contador;
- salários administrativos;
- energia mínima;
- telefone;
- outras despesas mensais recorrentes.

**Pergunta de entrada**

> Você quer incluir uma parte dos custos mensais do negócio neste preço?

Opções:

- **Sim, quero calcular**
- **Já sei quanto colocar por venda**
- **Não quero incluir agora**

A terceira opção deve gerar um aviso informativo, sem bloquear:

> Tudo bem. Só lembre que, sem considerar esses custos, o preço pode parecer mais lucrativo do que realmente é.

---

##### Produto — caminho guiado

Perguntas:

1. **Quanto seu negócio gasta por mês, mesmo sem vender?**
   - valor total dos custos mensais que o usuário deseja considerar;
2. **Quantas unidades você espera vender por mês?**
   - quantidade estimada.

Cálculo:

```
custo_fixo_por_unidade =
  custos_mensais / unidades_esperadas_no_mes
```

Mensagem de resultado:

> Para ajudar a pagar esses custos, cada unidade precisa carregar aproximadamente R$ X.

Ajuda para quantidade:

> Use uma estimativa realista de vendas mensais. Se vender menos do que isso, cada unidade precisaria carregar uma parcela maior desses custos.

---

##### Serviço — caminho guiado

Perguntas:

1. **Quanto seu negócio gasta por mês, mesmo sem atender clientes?**
2. **Quantas horas você consegue realmente vender em um mês?**
3. **Quanto tempo este serviço leva?**

A expressão "horas faturáveis" não será usada como pergunta principal.

Ajuda contextual:

> Pense apenas nas horas que podem virar serviço pago. Desconte pausas, tarefas administrativas, reuniões internas e tempo sem atendimento.

Cálculo interno:

```
custo_fixo_por_hora =
  custos_mensais / horas_que_podem_ser_vendidas

custo_fixo_deste_servico =
  custo_fixo_por_hora × horas_deste_servico
```

Mensagem de resultado:

> Para ajudar a pagar os custos mensais do negócio, este serviço precisa carregar aproximadamente R$ X.

Se o tempo do serviço já tiver sido informado na Etapa 2, o Ever.Precifica deve reaproveitá-lo, sem pedir o mesmo dado novamente. O usuário poderá editar o tempo caso necessário.

---

##### Caminho manual

Para Produto:

> **Quanto dos seus custos mensais você já definiu para cada unidade?**

Para Serviço:

> **Quanto dos seus custos mensais você já definiu para este serviço?**

Esse valor alimenta diretamente `allocatedFixedCostCents`.

---

##### Progressive disclosure e prevenção de sobrecarga

A primeira tela da etapa não deve exibir simultaneamente todos os campos de cálculo.

Primeiro, o usuário escolhe entre:
- calcular;
- informar manualmente;
- não incluir.

Somente depois aparecem os campos necessários ao caminho escolhido.

A ferramenta não exigirá que o usuário liste individualmente todas as despesas mensais no MVP. Ela pedirá apenas o **total mensal que deseja considerar**.

Pode existir ajuda contextual com exemplos, mas não um mini-DRE ou cadastro de despesas.

---

##### Validações e mensagens

Custos mensais negativos:
> Confira este valor. O total de custos mensais não pode ser negativo.

Unidades esperadas igual a zero:
> Informe pelo menos 1 unidade para conseguirmos dividir os custos.

Horas disponíveis igual a zero:
> Informe pelo menos algum tempo disponível para serviços pagos.

Estimativa aparentemente muito baixa ou alta:
- não bloquear;
- apenas permitir revisão;
- não presumir que a estimativa está errada.

Quando o usuário selecionar "Não quero incluir agora":
> Você poderá voltar e incluir esses custos depois.

---

##### Resultado interno esperado

Todos os caminhos convergem para:

```
allocatedFixedCostCents
```

Dados auxiliares podem permanecer no estado local da interface:

```
fixedCostMode = "guided" | "manual" | "skipped"
monthlyFixedCostCents
expectedMonthlyUnits
monthlyBillableMinutes
serviceMinutes
```

O motor recebe apenas o valor alocado normalizado.

**Linguagem a evitar**

- rateio de custos fixos;
- absorção de despesas;
- custo fixo unitário;
- horas faturáveis, como termo principal.

**Linguagem preferida**

- "custos mensais do negócio";
- "quanto seu negócio gasta por mês, mesmo sem vender?";
- "quantas unidades você espera vender por mês?";
- "quantas horas você consegue realmente vender em um mês?";
- "quanto desses custos precisa entrar neste preço?".

**Critérios de aceite da Etapa 4**

- o usuário entende por que custos mensais precisam ser considerados;
- ele pode calcular, informar um valor já conhecido ou pular;
- Produto usa divisão por unidades esperadas;
- Serviço usa horas disponíveis e duração do serviço;
- dados já informados anteriormente são reaproveitados;
- a ferramenta não força o usuário a montar uma lista contábil de despesas;
- todos os caminhos convergem para `allocatedFixedCostCents`;
- os dados permanecem locais ao navegador.

**Etapa 4 aprovada para o MVP em 05/10/2026.**

#### ET-0E-D5 — Etapa 5: Quanto é descontado da venda?

**Objetivo de UX**

Capturar os percentuais que reduzem o valor que realmente sobra da venda, sem exigir que o usuário domine conceitos tributários, financeiros ou de marketplace.

A etapa deve deixar claro que aqui entram **percentuais**, e não valores fixos em reais.

**Pergunta principal**

> Quando você vende, alguma parte do valor fica com impostos, cartão, marketplace ou comissão?

**Texto de apoio**

> Informe apenas os percentuais que realmente se aplicam à sua venda. Se algum deles não existir no seu caso, deixe em 0%.

---

##### Campos principais

**Tributos sobre a venda**

Pergunta:

> Quanto da venda vai para impostos?

Ajuda obrigatória:

> Informe a alíquota que realmente incide sobre esta venda. Se tiver dúvida, consulte seu contador.

O Ever.Precifica não deve tentar sugerir ou adivinhar a alíquota.

**Taxa do meio de pagamento**

Pergunta:

> Quanto o cartão, gateway ou meio de pagamento desconta em percentual?

Exemplos de apoio:
- cartão;
- link de pagamento;
- gateway;
- adquirente.

**Comissão ou marketplace**

Pergunta:

> Alguma plataforma ou vendedor fica com uma porcentagem da venda?

Exemplos de apoio:
- marketplace;
- aplicativo de entrega;
- representante;
- vendedor com comissão;
- plataforma intermediadora.

**Outro percentual**

Pergunta:

> Existe mais algum percentual descontado desta venda?

O usuário poderá adicionar mais de um item personalizado, cada um com:
- nome curto;
- percentual.

---

##### Progressive disclosure

A etapa começa com as categorias mais comuns e permite adicionar apenas o que existe no negócio.

Exemplo de ações:

> + Adicionar taxa do cartão  
> + Adicionar comissão/marketplace  
> + Adicionar outro percentual

Tributos podem permanecer como campo visível por sua relevância, sempre aceitando 0%.

Não utilizar seleção obrigatória de regime tributário, CNAE ou tipo societário.

---

##### Ajuda para percentuais

A ferramenta deve aceitar entrada em percentual de forma natural.

Exemplo:

```
6
```

deve ser entendido como:

```
6%
```

O usuário não deve precisar digitar `0,06`.

Precisão do MVP:
- até duas casas decimais de ponto percentual;
- internamente, conversão para basis points.

Exemplos:

```
6%    → 600 bps
3,2%  → 320 bps
12,75% → 1275 bps
```

---

##### Resumo antes de avançar

A ferramenta deve mostrar uma frase simples:

> No total, X% do valor da venda é consumido por impostos, taxas e comissões.

E, opcionalmente, a abertura por item:

```
Impostos .......... 6,0%
Cartão ............. 3,2%
Marketplace ....... 12,0%
Outros ............. 1,0%
Total ............. 22,2%
```

Esse resumo ajuda o usuário a perceber erros de digitação antes de avançar.

---

##### Alertas e validações

Percentual negativo:
> Confira este valor. O percentual não pode ser negativo.

Percentual individual igual ou acima de 100%:
> Esse percentual parece muito alto. Confira antes de continuar.

Soma dos percentuais igual ou acima de 100%:
> Com esses percentuais, todo o valor da venda seria consumido antes mesmo dos seus custos e do lucro. Revise os números informados.

Percentuais altos, mas matematicamente possíveis:
- não bloquear automaticamente;
- destacar para revisão.

Quando todos os campos forem 0%:
> Nenhum percentual foi informado. Você pode continuar se isso estiver correto para sua venda.

---

##### Evitar duplicidade com a Etapa 3

A ferramenta deverá lembrar:

> Se uma taxa foi informada como valor fixo em reais na etapa anterior, não repita aqui. Nesta etapa entram apenas cobranças percentuais.

Exemplo simples:

> R$ 2,50 por transação → etapa anterior.  
> 3,2% sobre a venda → aqui.

---

##### Resultado interno esperado

Campos normalizados:

```
ratesBps = {
  taxes,
  payment,
  commission,
  other
}
```

Caso existam vários "outros percentuais", a interface poderá manter os itens detalhados localmente e somá-los em `other` antes de enviar ao motor.

Nenhum desses valores deve ser enviado ao GA4.

---

##### Linguagem a evitar

- alíquota efetiva agregada;
- despesas variáveis percentuais;
- deduções incidentes;
- carga tributária calculada pela ferramenta;
- MDR, como termo principal sem explicação.

**Linguagem preferida**

- "Quanto da venda vai para impostos?";
- "Quanto o cartão desconta?";
- "Alguma plataforma fica com uma porcentagem?";
- "No total, X% do valor da venda é consumido por impostos, taxas e comissões."

---

##### Critérios de aceite da Etapa 5

- o usuário entende que esta etapa trata apenas de percentuais;
- tributos, cartão, comissão/marketplace e outros percentuais ficam separados;
- o sistema não calcula nem recomenda tributos;
- a entrada aceita percentuais em formato humano, como 3,2%;
- o usuário vê o total antes de avançar;
- existe proteção textual contra duplicar taxas fixas da etapa anterior;
- todos os campos podem ser 0%;
- os valores convergem para `ratesBps`;
- os dados financeiros permanecem locais ao navegador.

**Etapa 5 aprovada para o MVP em 05/10/2026.**

**Oportunidade futura — Split Payment no Brasil**

Registrar no roadmap pós-MVP a avaliação de uma evolução do Ever.Precifica para cenários de Split Payment vinculados à reforma tributária brasileira.

Essa evolução só deverá ser desenhada após validar a regulamentação, o cronograma efetivo e os impactos operacionais vigentes à época. Possíveis frentes futuras:

- separar visualmente valor da venda, tributos retidos e valor líquido disponível;
- simular o efeito do recolhimento segregado no caixa;
- adaptar a explicação de "quanto sobra da venda";
- revisar o tratamento de tributos no motor sem transformar o Ever.Precifica em sistema fiscal;
- avaliar uma edição ou módulo comercial específico, caso exista demanda relevante.

Essa funcionalidade fica explicitamente fora do MVP atual.

#### ET-0E-D6 — Etapa 6: Quanto você quer que sobre?

**Objetivo de UX**

Coletar a margem desejada e a margem mínima sem exigir que o usuário compreenda previamente os conceitos de margem e markup.

A etapa começa pela consequência prática e só depois apresenta o termo técnico.

**Pergunta principal**

> De cada R$ 100 vendidos, quanto você gostaria que sobrasse como lucro?

**Texto de apoio**

> Pense no valor que você gostaria de manter como lucro depois dos custos e taxas considerados pelo Ever.Precifica.

**Campo principal**

> Quero que sobrem R$ ___ de cada R$ 100 vendidos

Exemplos de interpretação:

```
R$ 20 de cada R$ 100 → margem desejada de 20%
R$ 25 de cada R$ 100 → margem desejada de 25%
R$ 32,50 de cada R$ 100 → margem desejada de 32,5%
```

Depois do preenchimento, a ferramenta traduz:

> Isso corresponde a uma margem desejada de X%.

##### Margem mínima em linguagem simples

Segunda pergunta:

> E qual é o mínimo que você aceita que sobre?

Texto de apoio:

> Esse será seu limite de segurança para descontos e negociações.

Campo:

> No mínimo, quero que sobrem R$ ___ de cada R$ 100 vendidos

A margem mínima deve ser menor ou igual à margem desejada.

##### Ajuda contextual

Para a meta:

> Esta é sua meta de lucro sobre a venda. O Ever.Precifica vai calcular qual preço é necessário para atingir esse valor com os custos e taxas que você informou.

Para o mínimo:

> Este não é o preço ideal. É apenas o limite que você considera aceitável para uma promoção ou negociação.

Explicação opcional:

> Em finanças, chamamos esse percentual de margem. Você não precisa fazer a conta: o Ever.Precifica faz isso para você.

Markup não aparece como entrada nesta etapa.

##### Validações

Valor negativo:
> O valor que deve sobrar não pode ser negativo.

Valor igual ou acima de R$ 100:
> Para calcular um preço possível, precisa sobrar menos de R$ 100 a cada R$ 100 vendidos.

Margem mínima acima da desejada:
> O seu mínimo não pode ser maior que a sua meta. Reduza o mínimo ou aumente quanto você gostaria que sobrasse.

Combinação impossível com os percentuais já informados:
> Com os percentuais da etapa anterior e o valor que você quer que sobre, não existe espaço suficiente no preço para cobrir tudo. Revise sua meta ou as taxas informadas.

Quando ajudar na compreensão, a ferramenta pode complementar:

> Dos R$ 100 vendidos, X já são consumidos por impostos e taxas. Você definiu que Y devem sobrar como lucro.

##### Valores padrão

O MVP não deve escolher uma margem "ideal" automaticamente.

Nenhum percentual deve vir pré-preenchido como recomendação financeira. Exemplos didáticos podem existir, desde que sejam claramente apresentados como exemplos.

##### Resultado interno esperado

```
desiredMarginBps
minimumMarginBps
```

Conversão:

```
R$ 25 de cada R$ 100 = 25,00% = 2500 bps
```

Os valores permanecem locais ao navegador e não são enviados ao GA4.

##### Linguagem a evitar

- "defina seu markup";
- "margem de contribuição desejada", como pergunta principal;
- "rentabilidade alvo";
- "percentual ótimo";
- recomendações universais de margem.

**Linguagem preferida**

- "De cada R$ 100 vendidos, quanto você gostaria que sobrasse como lucro?";
- "E qual é o mínimo que você aceita que sobre?";
- "Esta é sua meta.";
- "Este é seu limite de segurança.";
- "Em finanças, chamamos esse percentual de margem."

##### Critérios de aceite da Etapa 6

- o usuário consegue informar a meta sem saber previamente o que é margem;
- margem desejada e margem mínima ficam claramente diferentes;
- o sistema não sugere uma margem "correta";
- markup não é usado como entrada;
- combinações matematicamente impossíveis são explicadas em linguagem simples;
- os valores convergem para `desiredMarginBps` e `minimumMarginBps`;
- os dados permanecem locais ao navegador.

**Etapa 6 aprovada para o MVP em 05/10/2026.**

#### ET-0E-D7 — Etapa 7: Você já vende por algum preço?

**Objetivo de UX**

Permitir que o usuário compare o preço que já pratica com os custos, taxas e metas informados, transformando o Ever.Precifica também em um diagnóstico do preço atual.

Esta etapa é opcional.

**Pergunta principal**

> Você já vende este produto ou serviço por algum preço?

Opções:

- **Sim**
- **Ainda não**

Se o usuário escolher "Ainda não", a ferramenta segue diretamente para o resultado sem qualquer penalidade.

---

##### Quando o usuário já possui preço

Pergunta:

> Qual preço você cobra hoje?

Campo:

> Preço atual: R$ ___

Texto de apoio:

> Vamos comparar esse valor com seus custos e com o quanto você gostaria que sobrasse. Isso não significa que você precisa mudar o preço — é apenas um diagnóstico.

O usuário também poderá usar esse campo para testar um preço que esteja pensando em praticar, mesmo que ainda não seja o preço oficial.

Ajuda contextual:

> Você pode informar o preço atual ou um preço que queira testar.

---

##### Diagnóstico em linguagem simples

O motor classifica o preço em quatro situações.

**1. Prejuízo**

> Nesse preço, a venda não cobre todos os custos e taxas que você informou.

Complemento possível:

> A cada venda, faltam aproximadamente R$ X para cobrir tudo.

**2. Dá lucro, mas fica abaixo do mínimo**

> Esse preço dá lucro, mas sobra menos do que o mínimo que você definiu como aceitável.

**3. Fica entre o mínimo e a meta**

> Esse preço dá lucro e está acima do seu limite mínimo, mas ainda não chega ao valor que você gostaria que sobrasse.

**4. Atende ou supera a meta**

> Com esse preço, sua meta de lucro é atingida ou superada.

---

##### Mostrar a diferença para a meta

Quando o preço atual estiver abaixo do preço técnico necessário à meta:

> Para alcançar sua meta, o preço calculado precisa ser aproximadamente R$ X maior.

A ferramenta também pode mostrar a diferença percentual:

> Isso representa cerca de Y% acima do preço informado.

Quando o preço atual já atingir ou superar a meta:

> Seu preço atual já alcança a meta que você definiu.

Se estiver significativamente acima, a ferramenta não deve sugerir redução automática.

---

##### Não transformar diagnóstico em ordem comercial

O Ever.Precifica não deve dizer:

- "Aumente seu preço";
- "Baixe seu preço";
- "Seu preço está errado";
- "Este é o preço ideal de mercado".

Preferir:

- "Para alcançar sua meta, o preço calculado seria...";
- "Com o preço atual, sobra...";
- "Seu preço atual está abaixo/acima da meta que você definiu.";
- "Use esta comparação como apoio à sua decisão."

Preço de mercado, concorrência e posicionamento não são inferidos pelo motor.

---

##### Validações

Preço negativo:
> Confira este valor. O preço não pode ser negativo.

Preço igual a zero:
> Para comparar sua venda, informe um preço maior que zero.

Preço muito abaixo dos custos:
- não bloquear;
- mostrar diagnóstico de prejuízo de forma clara.

Preço muito acima:
- não bloquear;
- apenas calcular o resultado;
- não presumir erro de digitação sem evidência.

---

##### Resultado interno esperado

Quando informado:

```
currentPriceCents
```

Quando não informado:

```
currentPriceCents = null
```

O motor devolve, quando aplicável:
- lucro unitário;
- margem efetiva;
- status econômico;
- diferença em reais para o preço técnico;
- diferença percentual para a meta.

Nenhum preço informado é enviado ao GA4 ou ao backend.

---

##### Linguagem a evitar

- "preço incorreto";
- "preço subótimo";
- "gap de pricing";
- "desvio de margem";
- "reposicionamento obrigatório".

**Linguagem preferida**

- "Qual preço você cobra hoje?";
- "Vamos comparar esse valor com seus custos e sua meta.";
- "Com esse preço, sobra...";
- "Para alcançar sua meta, o preço calculado seria...";
- "Use esta comparação como apoio à sua decisão."

---

##### Critérios de aceite da Etapa 7

- a etapa pode ser ignorada sem impedir o cálculo;
- o usuário consegue informar um preço atual ou um preço de teste;
- o diagnóstico distingue prejuízo, abaixo do mínimo, abaixo da meta e meta atingida;
- o sistema explica a diferença para a meta em reais e percentual;
- o texto não transforma o resultado em ordem para aumentar ou reduzir preços;
- preço de mercado não é inferido;
- o valor converge para `currentPriceCents`;
- os dados permanecem locais ao navegador.

**Etapa 7 aprovada para o MVP em 05/10/2026.**

#### ET-0E-D8 — Etapa 8: Seu resultado

**Objetivo de UX**

Entregar uma resposta útil em poucos segundos para três perguntas:

1. por quanto posso vender para atingir minha meta;
2. quanto sobra nesse preço;
3. até onde consigo negociar ou dar desconto sem ultrapassar o limite que defini.

O resultado deve priorizar decisão prática. Termos técnicos e decomposição detalhada ficam em segundo plano.

---

##### Bloco principal — sugestão de preço

Título:

> Sua sugestão de preço

Valor principal:

> R$ X

Texto de apoio:

> Este valor foi arredondado para uma referência comercial e mantém a meta que você definiu.

A sugestão comercial será o destaque principal da experiência.

Logo abaixo:

> Menor preço calculado para atingir sua meta: R$ Y

O termo interno `technicalPrice` não precisa aparecer para o usuário. A linguagem pública será "menor preço para atingir sua meta".

Quando houver referência psicológica diferente e aplicável:

> Outra opção de preço: R$ Z  
> Mantém sua meta e usa uma terminação comercial como R$ 79,90.

A ferramenta não deve afirmar que a terminação psicológica venderá mais.

---

##### Bloco — o que acontece nesse preço

Mostrar primeiro valores concretos:

> Vendendo por R$ X:
> - sobra aproximadamente R$ Y de lucro por venda;
> - sua margem fica em Z%;
> - os custos e percentuais informados ficam cobertos.

Quando a margem efetiva ficar ligeiramente acima da meta por causa do arredondamento comercial, explicar de forma simples:

> O valor ficou um pouco acima da sua meta porque arredondamos o preço para cima, nunca para baixo.

---

##### Bloco — entenda para onde vai o dinheiro

Usar uma decomposição simples do preço escolhido.

Exemplo conceitual:

```
De cada R$ 100 desta venda:
R$ A ajudam a pagar produto/serviço e outros custos
R$ B vão para impostos, taxas e comissões
R$ C sobram como lucro
```

Quando houver custos mensais alocados, eles devem aparecer dentro do grupo de custos, com possibilidade de detalhamento.

A soma visual e textual precisa reconciliar com o preço avaliado, respeitando o arredondamento do motor.

---

##### Bloco condicional — seu preço atual

Só aparece quando `currentPriceCents` tiver sido informado.

Título:

> Como seu preço atual se compara?

Mostrar:
- preço atual;
- quanto sobra em reais;
- margem atual;
- diagnóstico em linguagem simples;
- diferença para o preço necessário à meta.

Exemplos:

> Com R$ 69,90, a venda dá lucro, mas ainda fica abaixo da meta que você definiu.

ou:

> Seu preço atual já alcança a meta que você definiu.

A ferramenta nunca deve apresentar essa comparação como ordem para alterar o preço.

---

##### Bloco — quanto posso dar de desconto?

A linguagem principal deve evitar "desconto máximo seguro" sem explicação.

Mostrar duas referências:

**Mantendo sua meta**
> Você pode dar até X% de desconto e ainda manter a margem que deseja.

**Sem ficar abaixo do seu mínimo**
> Até Y% de desconto, você ainda permanece no limite mínimo que definiu.

Quando o preço de referência já estiver abaixo de alguma dessas faixas, mostrar 0% e explicar o motivo em linguagem simples.

---

##### Simulador de desconto

Pergunta:

> Quer testar um desconto?

Campo:

> Desconto: ___%

Ao digitar, atualizar imediatamente:

- preço depois do desconto;
- lucro por venda;
- quanto sobra de cada R$ 100;
- situação em relação à meta e ao mínimo.

Estados de linguagem:

**Meta preservada**
> Mesmo com esse desconto, sua meta continua sendo atingida.

**Entre meta e mínimo**
> Esse desconto reduz seu lucro, mas ainda mantém o mínimo que você definiu.

**Abaixo do mínimo**
> Com esse desconto, sobra menos do que o mínimo que você definiu.

**Prejuízo**
> Com esse desconto, a venda não cobre todos os custos e taxas informados.

O simulador informa consequência; não recomenda conceder o desconto.

---

##### Avisos contextuais

Se custos mensais foram ignorados na Etapa 4:

> Você optou por não incluir os custos mensais do negócio. Por isso, o lucro mostrado pode parecer maior do que o resultado real da operação.

Se todos os percentuais da Etapa 5 forem zero:

> Nenhum imposto, taxa percentual ou comissão foi considerado neste cálculo.

Esses avisos não devem competir com o preço principal, mas precisam permanecer acessíveis.

---

##### Detalhes do cálculo — progressive disclosure

A área "Ver detalhes do cálculo" fica recolhida por padrão.

Pode mostrar:

- custo principal;
- outros gastos;
- parcela dos custos mensais;
- tarifa fixa;
- tributos;
- taxa de pagamento;
- comissão/marketplace;
- outros percentuais;
- menor preço para não ter prejuízo;
- margem;
- lucro por venda;
- markup.

Para markup, usar explicação:

> Markup mostra quantas vezes o preço representa o custo-base. Ele aparece aqui apenas como informação complementar.

Para ponto de equilíbrio, usar primeiro linguagem comum:

> Menor preço para não ter prejuízo

e, secundariamente:

> Também chamado de ponto de equilíbrio desta venda.

As fórmulas não precisam aparecer na visualização principal. A auditabilidade será garantida pelo detalhamento dos valores e pelas regras registradas no motor.

---

##### Ações depois do resultado

A experiência deve permitir:

**Alterar informações**
> Volta às etapas anteriores sem perder os dados.

**Testar outro preço**
> Permite avaliar outro preço sem alterar automaticamente os dados-base.

**Começar nova simulação**
> Limpa os dados financeiros da simulação após confirmação.

O autosave local continua ativo. Não é necessário um botão "Salvar" para o MVP.

---

##### Ordem de leitura recomendada

1. sugestão de preço;
2. lucro e margem resultantes;
3. composição simples da venda;
4. diagnóstico do preço atual, quando houver;
5. limites e simulador de desconto;
6. avisos contextuais;
7. detalhes técnicos recolhidos;
8. ações para editar ou iniciar nova simulação.

Essa ordem é de informação/UX, não uma especificação de layout visual.

---

##### Eventos de produto

Podem ser enviados sem valores financeiros:

- `tool_result_view`;
- `precifica_price_simulated`;
- `precifica_discount_simulated`.

Não enviar:
- preço;
- custo;
- lucro;
- margem;
- percentual de desconto;
- decomposição financeira.

---

##### Critérios de aceite da Etapa 8

- o usuário identifica rapidamente uma sugestão prática de preço;
- o menor preço para atingir a meta fica distinguível da sugestão comercial;
- lucro e margem são traduzidos em linguagem compreensível;
- a composição do preço explica para onde o dinheiro vai;
- o diagnóstico do preço atual aparece somente quando aplicável;
- os dois limites de desconto são claramente diferentes;
- o simulador explica a consequência do desconto sem recomendar a decisão;
- avisos sobre dados omitidos permanecem visíveis;
- markup e demais termos técnicos ficam secundários;
- o usuário pode voltar, testar outro preço ou iniciar nova simulação;
- nenhum valor financeiro é enviado ao GA4 ou ao backend.

**Etapa 8 aprovada para o MVP em 05/10/2026.**

#### Revisão transversal da ET-0E-D

A revisão final de UX consolida regras que valem para toda a jornada.

##### Navegação e progresso

- a experiência usa 8 etapas principais;
- o usuário sempre pode voltar sem perder respostas compatíveis;
- avançar depende apenas dos dados realmente obrigatórios da etapa;
- etapas opcionais podem ser puladas de forma explícita;
- a interface deve indicar progresso sem sugerir urgência;
- recarregar a página restaura a simulação salva localmente quando houver estado válido.

##### Salvamento e retomada

- alterações são salvas localmente de forma automática;
- não existe botão obrigatório "Salvar";
- ao retornar à ferramenta, o usuário pode continuar a simulação anterior;
- quando houver dados locais, a experiência deve oferecer de forma compreensível "Continuar de onde parei" ou "Começar nova simulação";
- iniciar nova simulação exige confirmação quando houver dados preenchidos;
- "Apagar meus dados" remove os dados financeiros locais, mantendo o tratamento separado do direito de acesso.

##### Edição e dependências

- alterar uma resposta recalcula imediatamente os resultados dependentes;
- dados reaproveitáveis não são apagados silenciosamente;
- mudança Produto ↔ Serviço preserva valores compatíveis;
- quando uma mudança tornar dados incompatíveis, a ferramenta explica o que será removido antes da confirmação;
- dados repetidos, como duração do serviço, são reaproveitados entre etapas.

##### Progressive disclosure

- uma pergunta nova por vez quando o conceito exigir explicação;
- grupos pequenos podem aparecer juntos quando pertencem ao mesmo raciocínio;
- campos opcionais ficam recolhidos até serem necessários;
- detalhes técnicos do resultado ficam recolhidos por padrão;
- a experiência evita telas longas que se comportem como planilhas.

##### Validação e erros

- erros de digitação não devem interromper o usuário enquanto ele ainda está preenchendo;
- validações bloqueantes aparecem ao tentar avançar ou quando o campo perde foco e o valor já é claramente inválido;
- a mensagem deve explicar como corrigir o problema;
- preservar o valor digitado sempre que possível;
- nunca substituir um valor inválido silenciosamente por outro;
- alertas não bloqueantes devem ser claramente diferentes de erros que impedem o cálculo;
- erros técnicos inesperados não devem expor stack traces, códigos internos ou detalhes de implementação ao usuário.

Exemplo de erro bloqueante:

> Confira este valor para continuar.

seguido da explicação específica do campo.

##### Linguagem transversal

- conclusão prática antes do termo técnico;
- frases curtas e concretas;
- valores monetários usados como exemplos quando ajudam;
- evitar tom de julgamento sobre a gestão do usuário;
- não chamar um preço de "certo", "errado" ou "ideal de mercado";
- não recomendar margem universal;
- não transformar diagnóstico em ordem comercial;
- quando houver termo técnico, explicar em linguagem comum no mesmo contexto.

##### Estados e segurança de compreensão

A jornada deve contemplar:
- estado inicial;
- estado parcialmente preenchido;
- etapa válida;
- erro de campo;
- alerta não bloqueante;
- cálculo impossível;
- resultado sem preço atual;
- resultado com preço atual;
- desconto dentro da meta;
- desconto entre meta e mínimo;
- desconto abaixo do mínimo;
- desconto com prejuízo;
- simulação retomada do navegador;
- confirmação de limpeza/nova simulação.

##### Privacidade e analytics

- valores de custo, preço, lucro, margem, tributos, taxas e desconto permanecem fora do GA4;
- eventos de uso podem indicar apenas ações e etapas, sem transportar valores financeiros;
- cálculos permanecem no navegador;
- UX de consentimento analítico continua obedecendo à arquitetura já definida no site.

##### Critérios finais de aceite de UX

A ET-0E-D é aceita quando:

- um usuário não especialista consegue completar a jornada sem conhecer markup ou terminologia contábil;
- Produto e Serviço utilizam linguagem própria sem duplicar o motor;
- o usuário entende o que é obrigatório, opcional e estimado;
- a ferramenta previne duplicidade entre custos fixos em reais e percentuais;
- custos mensais podem ser calculados, informados manualmente ou ignorados conscientemente;
- margem desejada e limite mínimo são compreendidos por meio de "quanto sobra de cada R$ 100";
- preço atual é opcional e produz diagnóstico, não ordem;
- o resultado responde rapidamente preço, lucro e capacidade de desconto;
- detalhes técnicos continuam disponíveis sem dominar a leitura;
- voltar, editar, recarregar e retomar não causam perda silenciosa de dados;
- mensagens de erro são corrigíveis e escritas para público leigo;
- dados financeiros não saem do navegador por analytics ou por necessidade de cálculo.

**ET-0E-D encerrada e aprovada em 05/10/2026.**

**Próximo checkpoint obrigatório: ET-0E-E — Visual/UI Design. Não iniciar decisões visuais antes de nova autorização explícita do proprietário.**

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

- [x] perguntas centrais do produto confirmadas;
- [x] entradas obrigatórias confirmadas;
- [x] saídas confirmadas;
- [x] fórmula-base confirmada;
- [x] política de alocação de custos confirmada;
- [x] tratamento de tributos/taxas definido;
- [x] critérios de erro/alerta definidos;
- [x] distinção entre produto e serviço decidida;
- [x] critérios de aceite do MVP registrados.

### Critérios de aceite do MVP

O Ever.Precifica deve:

- atender produtos e serviços com um único motor normalizado;
- calcular preço técnico, referência comercial e referência psicológica sem arredondar abaixo da meta;
- considerar custos diretos, custos adicionais, custos fixos alocados, taxas fixas e percentuais variáveis;
- usar margem desejada como conceito principal e margem mínima como limite de segurança;
- calcular markup apenas como indicador secundário;
- calcular ponto de equilíbrio, lucro unitário e margem efetiva;
- diagnosticar opcionalmente o preço já praticado;
- simular descontos e identificar os limites de preservação da margem desejada e da margem mínima;
- rejeitar entradas matematicamente inválidas e produzir alertas determinísticos;
- nunca inferir ou recomendar alíquotas tributárias;
- nunca delegar cálculos financeiros à IA;
- comunicar resultados em linguagem adequada a um público não especialista;
- permitir que todo resultado financeiro relevante seja reproduzido manualmente a partir das entradas e regras registradas.

**ET-0E-A encerrada e aprovada em 02/10/2026.**
