// ET-0E-PRE-01 · read-only interactive demos.
// All numerical outputs are computed with the same engine as the paid tool.
// No financial input, access validation, network calls, or analytics are used.
import {
  calculatePricing,
  calculateDiscountLimits,
  simulateDiscount,
} from "../../ferramentas/precifica/engine.mjs";
import { DEMO_CASES, DEMO_STEPS } from "./cases.mjs";

const fmtMoney = new Intl.NumberFormat("pt-BR", {style: "currency",currency: "BRL"});
const fmtPercent = new Intl.NumberFormat("pt-BR", {minimumFractionDigits: 0,maximumFractionDigits: 2});
const money = (cents) => fmtMoney.format(cents / 100);
const pct = (bps) => fmtPercent.format(bps / 100) + "%";
const root = document.querySelector("#demo-screen");
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const dots = document.querySelector("#progress-dots");
const counter = document.querySelector("#stage-counter");
const heading = document.querySelector("#current-example");
const hint = document.querySelector("#footer-hint");

let activeId = "product";
let stage = 0;
let discountShown = false;

function e(tag, cls = "", text = "") {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== "") node.textContent = text;
  return node;
}

function add(parent, child) { parent.appendChild(child); return child; }
function lead(parent, eyebrow, title, description) {
  add(parent, e("p", "screen-eyebrow", eyebrow));
  add(parent, e("h3", "screen-title", title));
  add(parent, e("p", "screen-description", description));
}
function metric(parent, label, value, tone = "") {
  const card = add(parent, e("div", "metric" + (tone ? " metric--" + tone : "")));
  add(card, e("span", "metric-label", label));
  add(card, e("strong", "metric-value", value));
  return card;
}
function facts(parent, rows) {
  const panel = add(parent, e("div", "facts"));
  for (const [label, value, small] of rows) {
    const row = add(panel, e("div", "fact-row"));
    const left = add(row, e("span", "fact-label", label));
    if (small) add(left, e("small", "fact-detail", small));
    add(row, e("strong", "fact-value", String(value)));
  }
}
function insight(parent, title, text, warn = false) {
  const panel = add(parent, e("div", "insight" + (warn ? " insight--warning" : "")));
  const mark = add(panel, e("span", "insight-icon", warn ? "!" : "↗"));
  mark.setAttribute("aria-hidden", "true");
  const body = add(panel, e("div"));
  add(body, e("strong", "", title));
  add(body, e("p", "", text));
}
function scoreGrid(parent, entries) {
  const grid = add(parent, e("div", "metric-grid"));
  for (const entry of entries) metric(grid, ...entry);
}
function showIntro(c, output) {
  lead(root, "ANTES DE COMEÇAR", "Uma decisão real, com números fictícios.",
    c.scenario);
  const banner = add(root, e("div", "scenario-card"));
  add(banner, e("span", "scenario-label", "A PERGUNTA DO NEGÓCIO"));
  add(banner, e("p", "scenario-question", c.question));
  scoreGrid(root, [
    ["Preço praticado", money(c.currentPriceCents)],
    ["Preço sugerido pelo cálculo", money(output.commercial.priceCents), "accent"],
  ]);
  insight(root, "Você vai enxergar o caminho",
    "Siga as oito etapas reais do Ever.Precifica. Os campos são exemplos fixos; o resultado é calculado pelo mesmo motor da ferramenta. Nenhuma compra é necessária.");
}
function step1(c) {
  lead(root, "01 / TIPO DE VENDA", "O que vamos precificar?",
    "Tudo começa escolhendo o que o negócio vende. Isso muda a maneira de apresentar os custos, mas mantém o método financeiro.");
  const panel = add(root, e("div", "selected-type"));
  add(panel, e("span", "type-check", "✓")).setAttribute("aria-hidden", "true");
  const body = add(panel, e("div"));
  add(body, e("strong", "", c.kind + " selecionado"));
  add(body, e("p", "", c.name + " · " + c.segment));
  insight(root, "Por que começamos aqui?",
    c.id === "product"
      ? "Em produtos, o custo de compra e os gastos por unidade formam a base da conta."
      : "Em serviços, tempo de trabalho, materiais e capacidade de atendimento precisam ser considerados.");
}
function step2(c) {
  lead(root, "02 / CUSTO PRINCIPAL",
    c.id === "product" ? "Quanto custa ter uma unidade pronta?" : "Quanto custa executar o atendimento?",
    "Este é o primeiro custo que precisa ser coberto por cada venda.");
  if (c.id === "product") {
    facts(root, [
      ["Custo de compra de uma unidade", money(c.direct.purchaseCents), "Valor ilustrativo de revenda"],
      ["Quantidade considerada", "1 unidade", "O exemplo usa o valor direto"],
    ]);
  } else {
    facts(root, [
      ["Custo de uma hora de trabalho", money(c.direct.hourlyCostCents)],
      ["Tempo por atendimento", "60 minutos"],
      ["Custo do trabalho neste serviço", money(c.input.directCostCents)],
    ]);
  }
  insight(root, "O que aprendemos?",
    c.id === "product"
      ? "O preço de compra não é o preço de venda. Ainda faltam gastos indiretos e percentuais."
      : "Tempo de trabalho tem custo. Aqui consideramos 60 minutos a um custo estimado de R$ 35 por hora.");
}
function step3(c) {
  lead(root, "03 / OUTROS GASTOS", "Quais despesas surgem em cada venda?",
    "São despesas em reais que acontecem porque o produto foi vendido ou o serviço foi executado.");
  facts(root, [
    [c.extras.primaryLabel, money(c.extras.primaryCents)],
    [c.id === "product" ? "Outros gastos por unidade" : "Deslocamento", money(c.extras.secondaryCents)],
    ["Tarifa fixa por venda", money(c.extras.fixedFeeCents)],
    ["Total adicional", money(c.input.additionalCostCents + c.extras.fixedFeeCents)],
  ]);
  insight(root, "Sem contar duas vezes",
    "Cada valor entra em uma única etapa. Percentuais de impostos e cartão entram depois, e não aqui.");
}
function step4(c) {
  lead(root, "04 / CUSTOS MENSAIS", "E os gastos que existem mesmo sem vender?",
    "Uma parte dos gastos mensais também precisa ser sustentada pela operação.");
  facts(root, [
    ["Gastos fixos estimados no mês", money(c.fixed.monthlyCents), "Ex.: estrutura, internet, aluguel e outros"],
    [c.id === "product" ? "Unidades previstas" : "Horas disponíveis para vender",
      c.id === "product" ? String(c.fixed.allocationBase) + " unidades" : String(c.fixed.allocationBase) + " horas"],
    ...(c.id === "service" ? [["Duração do atendimento", "60 minutos"]] : []),
    ["Parcela alocada nesta venda", money(c.input.allocatedFixedCostCents)],
  ]);
  insight(root, "O divisor faz diferença",
    c.id === "product"
      ? "R$ 600 divididos por 100 unidades esperadas resultam em R$ 6 por unidade. Vender menos que o previsto pode alterar a realidade."
      : "R$ 2.400 divididos por 120 horas faturáveis resultam em R$ 20 por hora. Uma escova de 60 minutos absorve R$ 20.");
}
function step5(c) {
  lead(root, "05 / PERCENTUAIS", "O que é descontado do valor vendido?",
    "Taxas e tributos percentuais são calculados sobre o preço, não sobre o custo.");
  facts(root, [
    ["Impostos sobre a venda", pct(c.ratesBps.taxes), "Apenas hipótese didática"],
    ["Taxa do meio de pagamento", pct(c.ratesBps.payment)],
    ["Comissão", pct(c.ratesBps.commission)],
    ["Outros percentuais", pct(c.ratesBps.other)],
    ["Total sobre a venda", pct(Object.values(c.ratesBps).reduce((a, b) => a + b, 0))],
  ]);
  insight(root, "As alíquotas são exemplos, não orientações",
    "No uso real, a pessoa informa as taxas efetivamente aplicáveis ao seu negócio. O Ever.Precifica não determina regime tributário nem alíquotas.");
}
function step6(c) {
  lead(root, "06 / META DE LUCRO", "Quanto você quer que sobre em cada venda?",
    "A meta é definida pelo negócio. A ferramenta não escolhe uma margem ideal universal.");
  scoreGrid(root, [
    ["Margem desejada", pct(c.desiredMarginBps), "accent"],
    ["Margem mínima aceitável", pct(c.minimumMarginBps)],
  ]);
  const desired = Math.round(c.desiredMarginBps / 100);
  const minimum = Math.round(c.minimumMarginBps / 100);
  insight(root, "Em linguagem simples",
    "Para cada R$ 100 de venda, o exemplo busca deixar aproximadamente R$ " + desired +
      " de lucro, aceitando no mínimo R$ " + minimum + ". A margem é calculada sobre a venda, e não sobre o custo.");
}
function step7(c, output) {
  lead(root, "07 / PREÇO ATUAL", "O preço praticado está ajudando?",
    "É possível comparar o preço de hoje com a meta, antes de decidir mudar qualquer valor.");
  scoreGrid(root, [
    ["Preço atual", money(c.currentPriceCents)],
    ["Lucro no preço atual", money(output.current.profitCents)],
    ["Margem efetiva", pct(output.current.marginBps), "accent"],
  ]);
  insight(root, "Como interpretar?",
    c.id === "product"
      ? "A margem atual fica abaixo dos 15% mínimos informados. O exemplo recomenda investigar a diferença antes de oferecer descontos."
      : "A margem atual supera os 20% mínimos, mas não atinge os 30% desejados. A meta ainda não foi alcançada.",
    c.id === "product");
}
function step8(c, output) {
  lead(root, "08 / SEU RESULTADO", "Os números se transformam em uma decisão.",
    "O valor sugerido mantém a margem desejada conforme as entradas fictícias. Isso não é garantia de demanda ou de lucro real.");
  const hero = add(root, e("div", "result-hero"));
  add(hero, e("span", "result-caption", "SUGESTÃO COMERCIAL DE PREÇO"));
  add(hero, e("strong", "result-price", money(output.commercial.priceCents)));
  add(hero, e("p", "", "Arredondamento para cima, preservando a meta informada"));
  scoreGrid(root, [
    ["Menor preço técnico", money(output.technical.priceCents)],
    ["Lucro no preço sugerido", money(output.commercial.profitCents)],
    ["Margem no preço sugerido", pct(output.commercial.marginBps), "accent"],
  ]);
  facts(root, [
    ["Custos totais por venda", money(output.costBaseCents)],
    ["Impostos e taxas no preço sugerido", money(output.commercial.totalVariableChargesCents)],
    ["Lucro estimado por venda", money(output.commercial.profitCents)],
    ["Preço anterior", money(c.currentPriceCents)],
    ["Margem anterior", pct(output.current.marginBps)],
  ]);
  const limit = calculateDiscountLimits(c.input, output.commercial.priceCents);
  const limitPanel = add(root, e("div", "discount-panel"));
  add(limitPanel, e("h4", "", "E se eu der um desconto?"));
  add(limitPanel, e("p", "", "Explore somente o cenário fixo de 10% — sem alterar os dados da simulação."));
  const controls = add(limitPanel, e("div", "discount-buttons"));
  const zero = add(controls, e("button", "discount-btn" + (!discountShown ? " is-selected" : ""), "Sem desconto"));
  const ten = add(controls, e("button", "discount-btn" + (discountShown ? " is-selected" : ""), "Com 10%"));
  zero.type = "button"; ten.type = "button";
  zero.setAttribute("aria-pressed", String(!discountShown));
  ten.setAttribute("aria-pressed", String(discountShown));
  zero.addEventListener("click", () => { discountShown = false; render(); });
  ten.addEventListener("click", () => { discountShown = true; render(); });
  if (discountShown) {
    const discounted = simulateDiscount(c.input, output.commercial.priceCents, 1000);
    scoreGrid(limitPanel, [
      ["Preço após 10%", money(discounted.discountedPriceCents)],
      ["Lucro por venda", money(discounted.evaluation.profitCents)],
      ["Nova margem", pct(discounted.evaluation.marginBps), "accent"],
    ]);
  } else {
    scoreGrid(limitPanel, [
      ["Margem desejada preservada até", pct(limit.preserveDesiredMarginBps)],
      ["Limite para margem mínima", pct(limit.maximumSafeDiscountBps)],
    ]);
  }
  insight(root, "A decisão continua sendo sua", c.takeaway + " " + c.lesson);
  add(root, e("p", "prototype-note", "Cálculos do motor Ever.Precifica; exemplos fictícios. Tributos e taxas não são recomendações. O preço de mercado pode variar."));
}
function render() {
  const c = DEMO_CASES[activeId];
  const output = calculatePricing(c.input);
  root.replaceChildren();
  heading.textContent = c.eyebrow;
  counter.textContent = stage === 0 ? "Introdução" : "Etapa " + stage + " de 8 · " + DEMO_STEPS[stage - 1];
  dots.replaceChildren();
  for (let index = 1; index <= 8; index++) {
    const dot = add(dots, e("span", "progress-dot" + (index <= stage ? " is-passed" : "")));
    dot.setAttribute("aria-label", "Etapa " + index + ": " + DEMO_STEPS[index - 1]);
    if (index === stage) dot.setAttribute("aria-current", "step");
  }
  const renderers = [showIntro, step1, step2, step3, step4, step5, step6, step7, step8];
  renderers[stage](c, output);
  previous.disabled = stage === 0;
  next.innerHTML = "";
  const buttonLabel = stage === 0 ? "Começar demonstração" : stage === 8 ? "Explorar outro exemplo" : stage === 7 ? "Ver resultado" : "Próxima etapa";
  next.appendChild(document.createTextNode(buttonLabel + " "));
  add(next, e("span", "", "→")).setAttribute("aria-hidden", "true");
  hint.textContent = stage === 8 ? "Explore o impacto do desconto" : "Exemplo fixo · Somente leitura";
  document.querySelectorAll("[data-select]").forEach((button) => {
    const selected = button.dataset.select === activeId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
function selectCase(id) {
  if (!(id in DEMO_CASES)) return;
  activeId = id;
  stage = 0;
  discountShown = false;
  render();
}
document.querySelectorAll("[data-select]").forEach((button) => {
  button.addEventListener("click", () => selectCase(button.dataset.select));
});
previous.addEventListener("click", () => {
  if (stage > 0) { stage -= 1; discountShown = false; render(); }
});
next.addEventListener("click", () => {
  if (stage < 8) { stage += 1; render(); }
  else selectCase(activeId === "product" ? "service" : "product");
});
render();
