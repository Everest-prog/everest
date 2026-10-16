# Ever.Glass — Design System do Ever.Precifica

Status: aprovado para implementação no MVP  
Etapa: ET-0E-E — Visual/UI Design  
Produto: Ever.Precifica

## 1. Direção aprovada

O conceito visual aprovado combina:

- identidade dark-first da Ever.Est;
- montanha, altitude, rota e cume como território visual;
- superfícies translúcidas inspiradas em interfaces contemporâneas de vidro;
- azul-marinho profundo como base;
- laranja Ever.Est como luz, ação e progressão;
- números financeiros como protagonistas.

Princípio:

> **A montanha representa contexto e direção; o vidro representa tecnologia e clareza; os números continuam sendo o conteúdo principal.**

O mockup conceitual aprovado é referência de atmosfera, profundidade, hierarquia e materialidade. Elementos que não pertencem ao MVP, como "Meus Produtos", "Relatórios" ou conta completa de usuário, não devem ser implementados apenas porque apareceram no conceito visual.

## 2. Estrutura visual macro

### Desktop

A ferramenta usa três níveis:

1. **Atmosfera**
   - fotografia de montanha em plano distante;
   - overlay azul-marinho para estabilizar contraste;
   - luz laranja natural discreta;
   - linhas de rota/topografia em baixa opacidade.

2. **Shell Ever.Glass**
   - container principal central;
   - header compacto;
   - área de contexto/branding;
   - workspace da jornada.

3. **Conteúdo funcional**
   - progresso;
   - pergunta da etapa;
   - campos e escolhas;
   - resumo/contexto;
   - ações Voltar/Continuar;
   - resultados e simulações.

Layout desktop recomendado:

```
┌──────────────────────────────────────────────────────────────┐
│ Ever.Precifica by Ever.Est              Ajuda · Nova análise│
├──────────────────────────────────────────────────────────────┤
│ Contexto / marca     │ Jornada / formulário / resultado      │
│ Montanha + mensagem  │ Etapa 3 de 8                          │
│ curta                │ [ conteúdo da etapa ]                 │
│                      │ [ Voltar ]              [ Continuar ] │
└──────────────────────────────────────────────────────────────┘
```

A coluna de contexto é reduzida ou removida em larguras menores.

### Mobile

- uma coluna;
- header enxuto;
- progresso compacto;
- card principal ocupa quase toda a largura;
- fundo montanha com overlay mais forte;
- blur reduzido;
- CTA principal fica fácil de alcançar com o polegar;
- resultados usam cards empilhados.

## 3. Tokens de cor

### Base

```css
--ever-dark: #0f172a;
--ever-blue: #1e293b;
--ever-orange: #f97316;
--ever-orange-hover: #ea580c;
--ever-light: #f8fafc;
```

### Ever.Glass

```css
--bg-deep: #07111f;
--bg-mid: #0b1b2f;
--glass-strong: rgba(15, 23, 42, 0.78);
--glass-medium: rgba(15, 23, 42, 0.62);
--glass-soft: rgba(30, 41, 59, 0.46);
--glass-border: rgba(255, 255, 255, 0.14);
--glass-highlight: rgba(255, 255, 255, 0.09);
--text-primary: #f8fafc;
--text-secondary: #cbd5e1;
--text-muted: #94a3b8;
--accent: #f97316;
--accent-strong: #ea580c;
--accent-soft: rgba(249, 115, 22, 0.16);
--focus-ring: rgba(249, 115, 22, 0.42);
```

### Semântica

```css
--success: #34d399;
--warning: #fbbf24;
--danger: #fb7185;
--info: #60a5fa;
```

Estados nunca dependem apenas dessas cores; sempre têm texto e/ou ícone.

## 4. Material do vidro

### Shell principal

```css
background: linear-gradient(
  145deg,
  rgba(15, 23, 42, 0.82),
  rgba(15, 23, 42, 0.62)
);
backdrop-filter: blur(24px) saturate(120%);
border: 1px solid rgba(255,255,255,.14);
box-shadow:
  0 28px 80px rgba(0,0,0,.36),
  inset 0 1px 0 rgba(255,255,255,.08);
```

### Cards internos

- blur: 14–18px;
- opacidade maior que a do fundo;
- borda de 1px;
- sombra menor;
- sem brilho exagerado.

### Mobile / desempenho

- blur máximo recomendado: 14–16px;
- reduzir superfícies simultâneas;
- fallback sólido quando `backdrop-filter` não estiver disponível.

## 5. Raio e espaçamento

```css
--radius-shell: 30px;
--radius-panel: 24px;
--radius-card: 20px;
--radius-control: 16px;
--radius-pill: 999px;

--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

## 6. Tipografia

Família principal: **Montserrat**, preservando a implementação atual do site.

Fallback:

```css
font-family: "Montserrat", Inter, ui-sans-serif, system-ui, sans-serif;
```

Hierarquia recomendada:

- display/contexto: 44–56px desktop;
- título da etapa: 30–36px;
- resultado principal: 44–64px;
- subtítulo: 18–20px;
- body: 15–17px;
- label: 13–14px;
- helper: 12–14px.

Valores financeiros importantes:
- peso 700 ou 800;
- tracking neutro;
- números alinhados visualmente;
- evitar fontes decorativas.

## 7. Componentes

### 7.1 Header

Contém:
- assinatura Ever.Precifica + by Ever.Est;
- Ajuda;
- Nova simulação / Limpar, quando aplicável.

Não criar navegação de ERP ou módulos que não existem no MVP.

### 7.2 Progress route

Representa as 8 etapas:
- linha fina;
- checkpoint concluído;
- checkpoint atual com accent orange;
- futuros em cinza frio;
- label "Etapa X de 8".

No mobile, pode mostrar apenas:
- número atual;
- barra de progresso;
- nome da etapa atual.

### 7.3 Panel da etapa

Conteúdo:
- eyebrow/contexto opcional;
- pergunta principal;
- explicação curta;
- controles;
- feedback/alerta;
- ações.

Uma única ideia principal por painel.

### 7.4 Choice card

Usado para:
- Produto / Serviço;
- Calcular / Informar manualmente / Pular;
- opções binárias.

Estado selecionado:
- borda laranja;
- glow discreto;
- ícone/check;
- fundo levemente mais claro.

### 7.5 Campo monetário

- prefixo R$ visível;
- input grande;
- helper curto;
- estado de foco com ring laranja;
- erro abaixo do campo;
- nunca apagar valor digitado ao mostrar erro.

### 7.6 Campo percentual

- símbolo % fixo;
- aceita vírgula;
- normaliza internamente;
- mostra exemplo quando necessário.

### 7.7 Inline helper

Formato:
- ícone info;
- texto curto;
- pode expandir "Entenda melhor".

Não usar tooltips como única forma de transmitir informação importante no mobile.

### 7.8 Alert card

Quatro variantes:
- informação;
- atenção;
- erro;
- sucesso.

Sempre:
- ícone;
- título curto;
- frase acionável.

### 7.9 Result hero

Elemento de maior hierarquia na Etapa 8:

> Sua sugestão de preço  
> **R$ X**

Abaixo:
- lucro;
- margem;
- menor preço para meta;
- alternativa psicológica.

### 7.10 KPI cards

Máximo recomendado de três por linha no desktop.

Exemplos:
- Lucro por venda;
- Margem;
- Menor preço sem prejuízo.

### 7.11 Breakdown

Título:
> Entenda para onde vai o dinheiro

Usar barras/segmentos simples e texto. Não transformar em dashboard contábil.

### 7.12 Discount simulator

- slider opcional + input percentual;
- resultado recalculado em tempo real;
- status textual;
- não sugerir que o desconto "deve" ser concedido.

### 7.13 Modal

Usado somente para:
- começar nova simulação;
- apagar dados;
- troca Produto/Serviço quando houver perda de campos incompatíveis.

## 8. Hierarquia da jornada

Etapas 1–7:

1. progresso;
2. título/pergunta;
3. texto de apoio;
4. escolha/campo principal;
5. ajuda opcional;
6. feedback;
7. Voltar / Continuar.

Etapa 8:

1. sugestão de preço;
2. lucro + margem;
3. composição;
4. preço atual;
5. limites de desconto;
6. simulador;
7. avisos;
8. detalhes do cálculo;
9. ações.

## 9. Fundo e imagens

A fotografia de montanha:
- é atmosfera, não conteúdo;
- recebe overlay escuro;
- não deve competir com campos;
- pode variar entre desktop e mobile;
- não precisa mostrar alpinista em todas as telas.

Topografia/rota:
- opacidade baixa;
- decorativa;
- não deve parecer gráfico financeiro;
- pode conectar visualmente checkpoints da jornada.

## 10. Motion

### Padrões

- hover/press: 120–180ms;
- troca de estado: 180–240ms;
- entrada de etapa: 220–320ms;
- expansão de campos: 180–260ms;
- atualização de resultado: 200–300ms.

Easing:
```css
cubic-bezier(.2,.8,.2,1)
```

Evitar:
- parallax agressivo;
- animação contínua de fundo;
- números "contando" por longos períodos;
- bounce excessivo.

`prefers-reduced-motion: reduce` desliga movimentos não essenciais.

## 11. Responsividade

### >= 1200px
- shell amplo;
- duas colunas;
- contexto de marca visível;
- progresso completo.

### 768–1199px
- contexto reduzido;
- workspace dominante;
- progresso adaptado.

### < 768px
- uma coluna;
- contexto de marca vira detalhe de fundo/cabeçalho;
- labels de etapas futuras podem ser ocultadas;
- cards de KPI empilhados;
- CTA principal com largura confortável;
- blur e sombras reduzidos.

## 12. Acessibilidade

- foco de teclado sempre visível;
- contraste de texto principal compatível com WCAG AA;
- helper e muted text nunca podem ficar ilegíveis sobre fotografia;
- área clicável mínima recomendada: 44×44px;
- labels persistentes nos campos;
- erros associados semanticamente ao input;
- não usar placeholder como label;
- `prefers-reduced-motion`;
- fallback para `prefers-reduced-transparency` quando possível;
- fallback sólido sem `backdrop-filter`.

## 13. Estados

Cobrir explicitamente:

- carregamento inicial;
- estado salvo encontrado;
- etapa vazia;
- campo focado;
- erro de validação;
- alerta não bloqueante;
- seleção ativa;
- etapa concluída;
- cálculo impossível;
- resultado normal;
- resultado com prejuízo no preço atual;
- desconto dentro da meta;
- desconto entre meta e mínimo;
- desconto abaixo do mínimo;
- desconto com prejuízo;
- modal de limpeza;
- fallback sem transparência.

## 14. Critério de aceite da ET-0E-E

- identidade Ever.Glass documentada;
- conceito visual aprovado traduzido em regras implementáveis;
- tokens definidos;
- componentes definidos;
- hierarquia da jornada definida;
- responsividade definida;
- estados de erro/sucesso definidos;
- motion definido;
- acessibilidade visual definida;
- design não cria funcionalidades fora do MVP;
- branding de montanha/alpinismo permanece presente sem dominar o uso.
