import {
  PricingInputError,
  allocateProductFixedCostCents,
  allocateServiceFixedCostCents,
  calculateDiscountLimits,
  calculatePricing,
  simulateDiscount,
} from "./engine.mjs";
import { ensureAccess, requestRecovery } from "./access.mjs";

const STORAGE_KEY = "ever_precifica_mvp_v1";
const STEPS = ["Tipo", "Custo", "Outros gastos", "Custos mensais", "Taxas", "Meta", "Preço atual", "Resultado"];
const screen = document.getElementById("app-screen");
const stepLabel = document.getElementById("step-label");
const progressRoute = document.getElementById("progress-route");
const autosaveStatus = document.getElementById("autosave-status");
const helpDialog = document.getElementById("help-dialog");
const resetDialog = document.getElementById("reset-dialog");

function freshState() {
  return {
    version: 1,
    step: 1,
    itemType: null,
    directMode: "direct",
    directCostCents: 0,
    productLotCostCents: 0,
    productLotUnits: 0,
    serviceHourlyCostCents: 0,
    serviceMinutes: 0,
    additionalPrimaryCents: 0,
    deliveryCents: 0,
    customCosts: [],
    fixedFeeCents: 0,
    fixedCostMode: null,
    monthlyFixedCostCents: 0,
    expectedMonthlyUnits: 0,
    monthlyBillableMinutes: 0,
    allocatedFixedCostCents: 0,
    ratesBps: { taxes: 0, payment: 0, commission: 0, other: 0 },
    desiredMarginBps: 0,
    minimumMarginBps: 0,
    hasCurrentPrice: null,
    currentPriceCents: 0,
    discountBps: 0,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: freshState(), resumed: false };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return { state: freshState(), resumed: false };
    return {
      state: {
        ...freshState(),
        ...parsed,
        ratesBps: { ...freshState().ratesBps, ...(parsed.ratesBps || {}) },
        customCosts: Array.isArray(parsed.customCosts) ? parsed.customCosts : [],
      },
      resumed: true,
    };
  } catch (_) {
    return { state: freshState(), resumed: false };
  }
}

const loaded = loadState();
let state = loaded.state;
let resumePending = loaded.resumed && hasMeaningfulData(state);
let resultViewTracked = false;
let accessValidated = false;

function hasMeaningfulData(s) {
  return Boolean(
    s.itemType ||
    s.directCostCents ||
    s.productLotCostCents ||
    s.serviceHourlyCostCents ||
    s.additionalPrimaryCents ||
    s.deliveryCents ||
    s.fixedFeeCents ||
    s.monthlyFixedCostCents ||
    s.desiredMarginBps ||
    s.currentPriceCents ||
    s.step > 1
  );
}

function track(name, params = {}) {
  if (typeof window.everestTrack === "function") {
    window.everestTrack(name, { item_name: "ever_precifica", ...params });
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    autosaveStatus.textContent = "Salvo neste dispositivo";
  } catch (_) {
    autosaveStatus.textContent = "Não foi possível salvar";
  }
}

function clearState() {
  state = freshState();
  resultViewTracked = false;
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decimalFromInput(value) {
  const raw = String(value ?? "").trim().replace(/[^0-9,.-]/g, "");
  if (!raw) return 0;
  let normalized = raw;
  if (raw.includes(",")) normalized = raw.replaceAll(".", "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function moneyToCents(value) {
  const number = decimalFromInput(value);
  if (!Number.isFinite(number)) return NaN;
  return Math.round(number * 100);
}

function percentToBps(value) {
  const number = decimalFromInput(value);
  if (!Number.isFinite(number)) return NaN;
  return Math.round(number * 100);
}

function numberToInput(value, decimals = 2) {
  if (!value) return "";
  return (value / 100).toFixed(decimals).replace(".", ",");
}

function intToInput(value) {
  return value ? String(value) : "";
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function money(cents) { return brl.format((cents || 0) / 100); }
function pct(bps) { return ((bps || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "%"; }

function setProgress() {
  stepLabel.textContent = `Etapa ${state.step} de 8`;
  progressRoute.innerHTML = STEPS.map((name, i) => {
    const n = i + 1;
    const cls = n < state.step ? "done" : n === state.step ? "active" : "";
    return `<div class="route-step ${cls}" aria-current="${n === state.step ? "step" : "false"}"><span>${escapeHTML(name)}</span></div>`;
  }).join("");
}

function navActions({ nextLabel = "Continuar", back = true, next = true } = {}) {
  return `
    <div class="screen-actions">
      ${back ? '<button type="button" class="secondary-button" data-action="back">← Voltar</button>' : "<span></span>"}
      <div class="right">
        ${next ? `<button type="button" class="primary-button" data-action="next">${escapeHTML(nextLabel)} →</button>` : ""}
      </div>
    </div>`;
}

function notice(message, type = "error") {
  return `<div class="notice ${type}" id="screen-notice"><span aria-hidden="true">${type === "error" ? "!" : "i"}</span><div>${escapeHTML(message)}</div></div>`;
}

function showError(message) {
  const previous = document.getElementById("screen-notice");
  if (previous) previous.remove();
  const holder = document.createElement("div");
  holder.innerHTML = notice(message, "error");
  screen.insertBefore(holder.firstElementChild, screen.querySelector(".screen-actions"));
  screen.querySelector("#screen-notice")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function moneyField(id, label, cents, help = "") {
  return `
    <label class="form-group" for="${id}">
      <span class="form-label">${escapeHTML(label)}</span>
      <span class="input-shell"><span class="input-prefix">R$</span><input id="${id}" inputmode="decimal" autocomplete="off" value="${numberToInput(cents)}"></span>
      ${help ? `<span class="form-help">${escapeHTML(help)}</span>` : ""}
    </label>`;
}

function percentField(id, label, bps, help = "") {
  return `
    <label class="form-group" for="${id}">
      <span class="form-label">${escapeHTML(label)}</span>
      <span class="input-shell"><input id="${id}" inputmode="decimal" autocomplete="off" value="${numberToInput(bps)}"><span class="input-suffix">%</span></span>
      ${help ? `<span class="form-help">${escapeHTML(help)}</span>` : ""}
    </label>`;
}

function bindMoney(id, setter, onUpdate) {
  document.getElementById(id)?.addEventListener("input", (event) => {
    const cents = moneyToCents(event.target.value);
    if (Number.isFinite(cents)) {
      setter(Math.max(0, cents));
      saveState();
      onUpdate?.();
    }
  });
}

function bindPercent(id, setter, onUpdate) {
  document.getElementById(id)?.addEventListener("input", (event) => {
    const bps = percentToBps(event.target.value);
    if (Number.isFinite(bps)) {
      setter(Math.max(0, bps));
      saveState();
      onUpdate?.();
    }
  });
}

function renderResume() {
  stepLabel.textContent = "Simulação encontrada";
  progressRoute.innerHTML = "";
  screen.innerHTML = `
    <span class="eyebrow">Bem-vindo de volta</span>
    <h2 class="screen-title">Continuar de onde você parou?</h2>
    <p class="screen-copy">Encontramos uma simulação salva neste navegador. Você pode continuar sem preencher tudo novamente.</p>
    <div class="choice-grid">
      <button class="choice-card selected" data-resume="continue">
        <strong>Continuar minha simulação</strong>
        <p>Voltar para a etapa ${state.step} com os dados que já estão neste dispositivo.</p>
      </button>
      <button class="choice-card" data-resume="new">
        <strong>Começar uma nova</strong>
        <p>Apagar os números salvos e iniciar uma nova precificação.</p>
      </button>
    </div>`;
  screen.querySelector('[data-resume="continue"]').addEventListener("click", () => {
    resumePending = false;
    render();
  });
  screen.querySelector('[data-resume="new"]').addEventListener("click", () => resetDialog.showModal());
}

function renderStep1() {
  screen.innerHTML = `
    <span class="eyebrow">Primeiro checkpoint</span>
    <h2 class="screen-title">O que você quer precificar?</h2>
    <p class="screen-copy">Escolha a opção que mais combina com o que você vende. Vamos adaptar as próximas perguntas para você.</p>
    <div class="choice-grid">
      <button class="choice-card ${state.itemType === "product" ? "selected" : ""}" data-type="product">
        <strong>Produto</strong>
        <p>Algo vendido por unidade, como mercadoria, alimento, artesanato, item fabricado ou produto digital.</p>
      </button>
      <button class="choice-card ${state.itemType === "service" ? "selected" : ""}" data-type="service">
        <strong>Serviço</strong>
        <p>Um trabalho realizado para o cliente, normalmente envolvendo tempo, conhecimento ou mão de obra.</p>
      </button>
    </div>
    <div class="notice info"><span>i</span><div>Se sua venda mistura produto e serviço, escolha o que representa a parte principal. Os outros custos entram depois.</div></div>
    ${navActions({ back:false })}`;
  screen.querySelectorAll("[data-type]").forEach((button) => button.addEventListener("click", () => {
    const nextType = button.dataset.type;
    if (state.itemType && state.itemType !== nextType && hasTypeSpecificData()) {
      if (!window.confirm("Trocar Produto por Serviço pode alterar alguns dados específicos das próximas etapas. Deseja continuar?")) return;
      clearTypeSpecificData();
    }
    state.itemType = nextType;
    saveState();
    renderStep1();
  }));
}

function hasTypeSpecificData() {
  return Boolean(state.productLotCostCents || state.productLotUnits || state.serviceHourlyCostCents || state.serviceMinutes || state.expectedMonthlyUnits || state.monthlyBillableMinutes);
}
function clearTypeSpecificData() {
  state.directMode = "direct";
  state.productLotCostCents = 0;
  state.productLotUnits = 0;
  state.serviceHourlyCostCents = 0;
  state.serviceMinutes = 0;
  state.expectedMonthlyUnits = 0;
  state.monthlyBillableMinutes = 0;
  state.allocatedFixedCostCents = 0;
}

function guidedDirectCost() {
  if (state.itemType === "product") {
    if (!state.productLotCostCents || !state.productLotUnits) return 0;
    return Math.ceil(state.productLotCostCents / state.productLotUnits);
  }
  if (!state.serviceHourlyCostCents || !state.serviceMinutes) return 0;
  return Math.round((state.serviceHourlyCostCents * state.serviceMinutes) / 60);
}

function renderStep2() {
  const product = state.itemType === "product";
  const title = product ? "Quanto custa para você ter 1 unidade pronta para vender?" : "Quanto custa o trabalho usado para realizar este serviço?";
  const copy = product
    ? "Pense no valor que você paga para comprar ou produzir uma unidade. Embalagem, frete e taxas entram depois."
    : "Considere somente o custo diretamente ligado à execução. Materiais e deslocamento entram depois.";
  const directLabel = product ? "Custo de 1 unidade" : "Custo de mão de obra deste serviço";
  const guided = state.directMode === "guided";
  const calculated = guidedDirectCost();
  screen.innerHTML = `
    <span class="eyebrow">Custo principal</span>
    <h2 class="screen-title">${title}</h2>
    <p class="screen-copy">${copy}</p>
    <div class="choice-grid">
      <button class="choice-card ${!guided ? "selected" : ""}" data-mode="direct"><strong>Já sei o valor</strong><p>Informe diretamente o custo principal desta venda.</p></button>
      <button class="choice-card ${guided ? "selected" : ""}" data-mode="guided"><strong>Quero calcular</strong><p>${product ? "Use custo do lote e quantidade." : "Use custo por hora e duração do serviço."}</p></button>
    </div>
    <div class="section-card">
      ${!guided ? `<div class="form-grid">${moneyField("direct-cost",directLabel,state.directCostCents)}</div>` : product ? `
        <div class="form-grid">
          ${moneyField("lot-cost","Custo total do lote ou produção",state.productLotCostCents)}
          <label class="form-group" for="lot-units"><span class="form-label">Quantidade de unidades</span><span class="input-shell"><input id="lot-units" inputmode="numeric" value="${intToInput(state.productLotUnits)}"></span></label>
        </div>
        <div class="summary-strip"><span>Cada unidade custa aproximadamente</span><strong id="guided-result">${money(calculated)}</strong></div>` : `
        <div class="form-grid">
          ${moneyField("hourly-cost","Quanto custa 1 hora desse trabalho?",state.serviceHourlyCostCents)}
          <label class="form-group" for="service-minutes"><span class="form-label">Quanto tempo este serviço leva?</span><span class="input-shell"><input id="service-minutes" inputmode="numeric" value="${intToInput(state.serviceMinutes)}"><span class="input-suffix">min</span></span><span class="form-help">Ex.: 150 minutos para um serviço de 2h30.</span></label>
        </div>
        <div class="summary-strip"><span>Este serviço usa aproximadamente</span><strong id="guided-result">${money(calculated)}</strong></div>
        <div class="notice info"><span>i</span><div>Se ainda não sabe quanto custa uma hora do seu trabalho, use uma estimativa e ajuste depois.</div></div>`}
    </div>
    ${navActions()}`;

  screen.querySelectorAll("[data-mode]").forEach((button)=>button.addEventListener("click",()=>{state.directMode=button.dataset.mode;saveState();renderStep2();}));
  bindMoney("direct-cost",(v)=>state.directCostCents=v);
  bindMoney("lot-cost",(v)=>state.productLotCostCents=v,updateGuided);
  document.getElementById("lot-units")?.addEventListener("input",(e)=>{state.productLotUnits=Math.max(0,parseInt(e.target.value||"0",10)||0);saveState();updateGuided();});
  bindMoney("hourly-cost",(v)=>state.serviceHourlyCostCents=v,updateGuided);
  document.getElementById("service-minutes")?.addEventListener("input",(e)=>{state.serviceMinutes=Math.max(0,parseInt(e.target.value||"0",10)||0);saveState();updateGuided();});
  function updateGuided(){const el=document.getElementById("guided-result");if(el) el.textContent=money(guidedDirectCost());}
}

function additionalTotal() {
  return state.additionalPrimaryCents + state.deliveryCents + state.customCosts.reduce((sum,item)=>sum+(item.amountCents||0),0);
}

function renderStep3() {
  const product = state.itemType === "product";
  screen.innerHTML = `
    <span class="eyebrow">Gastos da venda</span>
    <h2 class="screen-title">Além do custo principal, você tem algum outro gasto para fazer esta venda?</h2>
    <p class="screen-copy">Aqui entram valores em reais que aparecem porque esta venda aconteceu. Se não tiver nenhum, deixe em zero.</p>
    <div class="form-grid">
      ${moneyField("additional-primary",product?"Embalagem por unidade":"Materiais usados neste serviço",state.additionalPrimaryCents,product?"Caixa, saco, etiqueta ou proteção.":"Peças, insumos ou materiais consumidos.")}
      ${moneyField("delivery-cost",product?"Frete ou entrega que você paga":"Deslocamento",state.deliveryCents,product?"Somente a parte que fica por sua conta.":"Combustível, transporte, pedágio ou estacionamento.")}
      ${moneyField("fixed-fee","Tarifa fixa por venda",state.fixedFeeCents,"Ex.: R$ 2,50 por transação. Percentuais entram na próxima etapa.")}
    </div>
    <div class="section-card">
      <h3>Outros gastos</h3>
      <div id="custom-costs">
        ${state.customCosts.map((item,index)=>`
          <div class="form-grid" style="margin-bottom:12px">
            <label class="form-group"><span class="form-label">Nome do gasto</span><span class="input-shell"><input data-custom-label="${index}" value="${escapeHTML(item.label)}" placeholder="Ex.: personalização"></span></label>
            <label class="form-group"><span class="form-label">Valor</span><span class="input-shell"><span class="input-prefix">R$</span><input data-custom-value="${index}" inputmode="decimal" value="${numberToInput(item.amountCents)}"></span><button type="button" class="ghost-button" data-remove-custom="${index}" style="margin-top:8px">Remover gasto</button></label>
          </div>`).join("")}
      </div>
      <button type="button" class="secondary-button" id="add-custom-cost">+ Adicionar outro gasto</button>
    </div>
    <div class="notice info"><span>i</span><div>Se um valor já está incluído no custo anterior, não adicione novamente.</div></div>
    <div class="summary-strip"><span>Outros gastos desta venda</span><strong id="additional-total">${money(additionalTotal()+state.fixedFeeCents)}</strong></div>
    ${navActions()}`;

  bindMoney("additional-primary",(v)=>state.additionalPrimaryCents=v,updateSummary);
  bindMoney("delivery-cost",(v)=>state.deliveryCents=v,updateSummary);
  bindMoney("fixed-fee",(v)=>state.fixedFeeCents=v,updateSummary);
  screen.querySelectorAll("[data-custom-label]").forEach((input)=>input.addEventListener("input",(e)=>{state.customCosts[Number(input.dataset.customLabel)].label=e.target.value;saveState();}));
  screen.querySelectorAll("[data-custom-value]").forEach((input)=>input.addEventListener("input",(e)=>{const v=moneyToCents(e.target.value);if(Number.isFinite(v)){state.customCosts[Number(input.dataset.customValue)].amountCents=Math.max(0,v);saveState();updateSummary();}}));
  screen.querySelectorAll("[data-remove-custom]").forEach((button)=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.removeCustom);
    const item=state.customCosts[index];
    if(item?.amountCents>0 && !window.confirm("Remover este gasto preenchido?")) return;
    state.customCosts.splice(index,1);
    saveState();
    renderStep3();
  }));
  document.getElementById("add-custom-cost").addEventListener("click",()=>{state.customCosts.push({label:"",amountCents:0});saveState();renderStep3();});
  function updateSummary(){document.getElementById("additional-total").textContent=money(additionalTotal()+state.fixedFeeCents);}
}

function computeAllocatedFixedCost() {
  if (state.fixedCostMode === "manual") return state.allocatedFixedCostCents || 0;
  if (state.fixedCostMode !== "guided" || !state.monthlyFixedCostCents) return 0;
  try {
    if (state.itemType === "product") {
      if (!state.expectedMonthlyUnits) return 0;
      return allocateProductFixedCostCents(state.monthlyFixedCostCents,state.expectedMonthlyUnits);
    }
    if (!state.monthlyBillableMinutes || !state.serviceMinutes) return 0;
    return allocateServiceFixedCostCents(state.monthlyFixedCostCents,state.monthlyBillableMinutes,state.serviceMinutes);
  } catch (_) { return 0; }
}

function renderStep4() {
  const product=state.itemType==="product";
  const mode=state.fixedCostMode;
  const allocated=computeAllocatedFixedCost();
  screen.innerHTML=`
    <span class="eyebrow">Custos mensais</span>
    <h2 class="screen-title">Você quer incluir uma parte dos custos mensais do negócio neste preço?</h2>
    <p class="screen-copy">Aluguel, internet, contador e outros gastos existem mesmo quando nenhuma venda acontece. Podemos dividir uma parte deles entre suas vendas.</p>
    <div class="choice-grid">
      <button class="choice-card ${mode==="guided"?"selected":""}" data-fixed-mode="guided"><strong>Sim, quero calcular</strong><p>Vamos chegar a uma parcela por unidade ou serviço.</p></button>
      <button class="choice-card ${mode==="manual"?"selected":""}" data-fixed-mode="manual"><strong>Já sei quanto colocar</strong><p>Informe diretamente quanto desses custos entra nesta venda.</p></button>
      <button class="choice-card ${mode==="skipped"?"selected":""}" data-fixed-mode="skipped"><strong>Não quero incluir agora</strong><p>Você pode voltar e acrescentar depois.</p></button>
    </div>
    ${mode==="guided"?`<div class="section-card"><div class="form-grid">
      ${moneyField("monthly-fixed","Quanto seu negócio gasta por mês, mesmo sem vender?",state.monthlyFixedCostCents)}
      ${product?`<label class="form-group"><span class="form-label">Quantas unidades você espera vender por mês?</span><span class="input-shell"><input id="expected-units" inputmode="numeric" value="${intToInput(state.expectedMonthlyUnits)}"></span><span class="form-help">Use uma estimativa realista.</span></label>`:`
      <label class="form-group"><span class="form-label">Quantas horas você consegue realmente vender em um mês?</span><span class="input-shell"><input id="billable-hours" inputmode="decimal" value="${state.monthlyBillableMinutes?String(state.monthlyBillableMinutes/60).replace(".",","):""}"><span class="input-suffix">h</span></span><span class="form-help">Considere apenas horas que podem virar serviço pago.</span></label>
      <label class="form-group"><span class="form-label">Quanto tempo este serviço leva?</span><span class="input-shell"><input id="service-duration-fixed" inputmode="numeric" value="${intToInput(state.serviceMinutes)}"><span class="input-suffix">min</span></span></label>`}
      </div><div class="summary-strip"><span>Parcela dos custos mensais nesta venda</span><strong id="allocated-fixed-result">${money(allocated)}</strong></div></div>`:mode==="manual"?`<div class="section-card"><div class="form-grid">${moneyField("manual-fixed",product?"Quanto dos custos mensais entra em cada unidade?":"Quanto dos custos mensais entra neste serviço?",state.allocatedFixedCostCents)}</div></div>`:mode==="skipped"?'<div class="notice warn"><span>!</span><div>Sem esses custos, o lucro mostrado pode parecer maior do que o resultado real da operação.</div></div>':""}
    ${navActions()}`;

  screen.querySelectorAll("[data-fixed-mode]").forEach((button)=>button.addEventListener("click",()=>{state.fixedCostMode=button.dataset.fixedMode;saveState();renderStep4();}));
  bindMoney("monthly-fixed",(v)=>state.monthlyFixedCostCents=v,updateAllocated);
  bindMoney("manual-fixed",(v)=>state.allocatedFixedCostCents=v);
  document.getElementById("expected-units")?.addEventListener("input",(e)=>{state.expectedMonthlyUnits=Math.max(0,parseInt(e.target.value||"0",10)||0);saveState();updateAllocated();});
  document.getElementById("billable-hours")?.addEventListener("input",(e)=>{const h=decimalFromInput(e.target.value);if(Number.isFinite(h)){state.monthlyBillableMinutes=Math.max(0,Math.round(h*60));saveState();updateAllocated();}});
  document.getElementById("service-duration-fixed")?.addEventListener("input",(e)=>{state.serviceMinutes=Math.max(0,parseInt(e.target.value||"0",10)||0);saveState();updateAllocated();});
  function updateAllocated(){const v=computeAllocatedFixedCost();const el=document.getElementById("allocated-fixed-result");if(el)el.textContent=money(v);}
}

function totalRates() { return Object.values(state.ratesBps).reduce((sum,v)=>sum+(v||0),0); }

function renderStep5() {
  screen.innerHTML=`
    <span class="eyebrow">Percentuais da venda</span>
    <h2 class="screen-title">Quando você vende, alguma parte do valor fica com impostos, cartão, marketplace ou comissão?</h2>
    <p class="screen-copy">Aqui entram somente percentuais. Se algum deles não existir no seu caso, deixe em 0%.</p>
    <div class="form-grid">
      ${percentField("tax-rate","Quanto da venda vai para impostos?",state.ratesBps.taxes,"Informe a alíquota que realmente incide nesta venda. Se tiver dúvida, consulte seu contador.")}
      ${percentField("payment-rate","Quanto o meio de pagamento desconta?",state.ratesBps.payment,"Cartão, gateway, link de pagamento ou adquirente.")}
      ${percentField("commission-rate","Comissão ou marketplace",state.ratesBps.commission,"Plataforma, aplicativo, representante ou vendedor.")}
      ${percentField("other-rate","Outro percentual",state.ratesBps.other)}
    </div>
    <div class="notice info"><span>i</span><div>R$ 2,50 por transação entra na etapa anterior. 3,2% sobre a venda entra aqui.</div></div>
    <div class="summary-strip"><span>No total, o valor consumido por impostos, taxas e comissões é</span><strong id="rates-total">${pct(totalRates())}</strong></div>
    ${navActions()}`;
  bindPercent("tax-rate",(v)=>state.ratesBps.taxes=v,update);
  bindPercent("payment-rate",(v)=>state.ratesBps.payment=v,update);
  bindPercent("commission-rate",(v)=>state.ratesBps.commission=v,update);
  bindPercent("other-rate",(v)=>state.ratesBps.other=v,update);
  function update(){document.getElementById("rates-total").textContent=pct(totalRates());}
}

function renderStep6() {
  screen.innerHTML=`
    <span class="eyebrow">Sua meta</span>
    <h2 class="screen-title">De cada R$ 100 vendidos, quanto você gostaria que sobrasse como lucro?</h2>
    <p class="screen-copy">Você não precisa calcular margem. Diga apenas quanto gostaria que sobrasse; nós traduzimos para o percentual.</p>
    <div class="form-grid">
      ${moneyField("desired-margin","Quero que sobrem, de cada R$ 100",state.desiredMarginBps,"Ex.: R$ 25 de cada R$ 100 corresponde a uma margem de 25%.")}
      ${moneyField("minimum-margin","No mínimo, quero que sobrem, de cada R$ 100",state.minimumMarginBps,"Este é o seu limite de segurança para promoções e negociações.")}
    </div>
    <div class="summary-strip"><span>Sua meta corresponde a</span><strong id="margin-summary">${pct(state.desiredMarginBps)}</strong></div>
    <div class="notice info"><span>i</span><div>Não existe uma margem universalmente correta. O Ever.Precifica usa a meta que você definiu.</div></div>
    ${navActions()}`;
  bindMoney("desired-margin",(v)=>state.desiredMarginBps=v,update);
  bindMoney("minimum-margin",(v)=>state.minimumMarginBps=v);
  function update(){document.getElementById("margin-summary").textContent=pct(state.desiredMarginBps);}
}

function renderStep7() {
  screen.innerHTML=`
    <span class="eyebrow">Diagnóstico opcional</span>
    <h2 class="screen-title">Você já vende este produto ou serviço por algum preço?</h2>
    <p class="screen-copy">Se informar, vamos comparar esse valor com seus custos e sua meta. Isso não significa que você precisa mudar o preço.</p>
    <div class="choice-grid">
      <button class="choice-card ${state.hasCurrentPrice===true?"selected":""}" data-current="yes"><strong>Sim</strong><p>Quero comparar meu preço atual ou testar um valor.</p></button>
      <button class="choice-card ${state.hasCurrentPrice===false?"selected":""}" data-current="no"><strong>Ainda não</strong><p>Quero apenas descobrir uma referência de preço.</p></button>
    </div>
    ${state.hasCurrentPrice===true?`<div class="section-card"><div class="form-grid">${moneyField("current-price","Qual preço você cobra hoje?",state.currentPriceCents,"Também pode ser um preço que você esteja pensando em praticar.")}</div></div>`:""}
    ${navActions({nextLabel:"Ver meu resultado"})}`;
  screen.querySelectorAll("[data-current]").forEach((button)=>button.addEventListener("click",()=>{state.hasCurrentPrice=button.dataset.current==="yes";saveState();renderStep7();}));
  bindMoney("current-price",(v)=>state.currentPriceCents=v);
}

function computeDirectCost() {
  return state.directMode === "guided" ? guidedDirectCost() : state.directCostCents;
}

function buildEngineInput() {
  const allocated = state.fixedCostMode === "guided" ? computeAllocatedFixedCost() : state.fixedCostMode === "manual" ? state.allocatedFixedCostCents : 0;
  return {
    directCostCents: computeDirectCost(),
    additionalCostCents: additionalTotal(),
    allocatedFixedCostCents: allocated,
    fixedFeeCents: state.fixedFeeCents,
    ratesBps: { ...state.ratesBps },
    desiredMarginBps: state.desiredMarginBps,
    minimumMarginBps: state.minimumMarginBps,
    currentPriceCents: state.hasCurrentPrice ? state.currentPriceCents : undefined,
  };
}

function statusCopy(status, context="price") {
  const prefix = context === "discount" ? "Com esse desconto, " : "";
  if(status==="LOSS") return prefix+"a venda não cobre todos os custos e taxas informados.";
  if(status==="BELOW_MINIMUM") return prefix+"sobra menos do que o mínimo que você definiu.";
  if(status==="BELOW_DESIRED") return prefix+"a venda dá lucro e fica acima do seu mínimo, mas ainda não alcança sua meta.";
  return prefix+"sua meta de lucro é atingida ou superada.";
}

function renderStep8() {
  let result;
  const input = buildEngineInput();
  try {
    result = calculatePricing(input);
  } catch (error) {
    const message = error instanceof PricingInputError
      ? "Alguns valores informados formam uma combinação impossível. Volte e revise custos, percentuais e a sua meta."
      : "Não foi possível calcular agora. Revise os valores e tente novamente.";
    screen.innerHTML=`
      <span class="eyebrow">Precisamos revisar a rota</span>
      <h2 class="screen-title">Ainda não conseguimos chegar a um preço.</h2>
      <p class="screen-copy">${message}</p>
      <div class="notice error"><span>!</span><div>${message}</div></div>
      ${navActions({next:false})}`;
    bindNavigation();
    return;
  }

  const selected = result.commercial;
  const limits = calculateDiscountLimits(input, selected.priceCents);
  const variable = selected.totalVariableChargesCents;
  const costBase = result.costBaseCents;
  const skippedFixed = state.fixedCostMode === "skipped";
  const noRates = totalRates() === 0;

  screen.innerHTML=`
    <span class="eyebrow">Seu resultado</span>
    <div class="result-hero">
      <small>Sua sugestão de preço</small>
      <strong class="price">${money(selected.priceCents)}</strong>
      <p>Este valor foi arredondado para uma referência comercial e mantém a meta que você definiu.</p>
      <div class="summary-strip"><span>Menor preço calculado para atingir sua meta</span><strong>${money(result.technical.priceCents)}</strong></div>
      ${result.psychological.priceCents!==selected.priceCents?`<div class="summary-strip"><span>Outra opção de preço</span><strong>${money(result.psychological.priceCents)}</strong></div>`:""}
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><small>Lucro por venda</small><strong>${money(selected.profitCents)}</strong></div>
      <div class="kpi-card"><small>Margem</small><strong>${pct(selected.marginBps)}</strong></div>
      <div class="kpi-card"><small>Menor preço sem prejuízo</small><strong>${money(result.breakEven.priceCents)}</strong></div>
    </div>

    <div class="section-card">
      <h3>Entenda para onde vai o dinheiro</h3>
      <div class="breakdown-list">
        <div class="breakdown-row"><span>Custos informados</span><strong>${money(costBase)}</strong></div>
        <div class="breakdown-row"><span>Impostos, taxas e comissões</span><strong>${money(variable)}</strong></div>
        <div class="breakdown-row"><span>Lucro estimado</span><strong>${money(selected.profitCents)}</strong></div>
      </div>
    </div>

    ${result.current?`<div class="section-card">
      <h3>Como seu preço atual se compara?</h3>
      <div class="breakdown-list">
        <div class="breakdown-row"><span>Preço informado</span><strong>${money(result.current.priceCents)}</strong></div>
        <div class="breakdown-row"><span>Sobra por venda</span><strong>${money(result.current.profitCents)}</strong></div>
        <div class="breakdown-row"><span>Margem atual</span><strong>${pct(result.current.marginBps)}</strong></div>
      </div>
      <div class="notice ${result.current.status==="AT_OR_ABOVE_DESIRED"?"success":result.current.status==="LOSS"?"error":"warn"}"><span>i</span><div>${escapeHTML(statusCopy(result.current.status))}</div></div>
      ${result.current.gapToTechnicalCents>0?`<p class="form-help">Para alcançar sua meta, o preço calculado é aproximadamente ${money(result.current.gapToTechnicalCents)} maior.</p>`:""}
    </div>`:""}

    <div class="section-card">
      <h3>Quanto posso dar de desconto?</h3>
      <div class="kpi-grid">
        <div class="kpi-card"><small>Mantendo sua meta</small><strong>${pct(limits.preserveDesiredMarginBps)}</strong></div>
        <div class="kpi-card"><small>Sem ficar abaixo do seu mínimo</small><strong>${pct(limits.maximumSafeDiscountBps)}</strong></div>
        <div class="kpi-card"><small>Preço de referência</small><strong>${money(selected.priceCents)}</strong></div>
      </div>
      <div class="form-grid" style="margin-top:18px">
        ${percentField("discount-input","Quer testar um desconto?",state.discountBps,"Veja imediatamente o efeito sobre preço, lucro e margem.")}
      </div>
      <div id="discount-result"></div>
    </div>

    ${skippedFixed?'<div class="notice warn"><span>!</span><div>Você optou por não incluir os custos mensais do negócio. O lucro mostrado pode parecer maior do que o resultado real da operação.</div></div>':""}
    ${noRates?'<div class="notice info"><span>i</span><div>Nenhum imposto, taxa percentual ou comissão foi considerado neste cálculo.</div></div>':""}

    <details>
      <summary>Ver detalhes do cálculo</summary>
      <div class="breakdown-list">
        <div class="breakdown-row"><span>Custo principal</span><strong>${money(input.directCostCents)}</strong></div>
        <div class="breakdown-row"><span>Outros gastos</span><strong>${money(input.additionalCostCents)}</strong></div>
        <div class="breakdown-row"><span>Custos mensais alocados</span><strong>${money(input.allocatedFixedCostCents)}</strong></div>
        <div class="breakdown-row"><span>Tarifa fixa</span><strong>${money(input.fixedFeeCents)}</strong></div>
        <div class="breakdown-row"><span>Total percentual</span><strong>${pct(result.totalVariableRateBps)}</strong></div>
        <div class="breakdown-row"><span>Markup (informação complementar)</span><strong>${(selected.markupX10000/10000).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}x</strong></div>
      </div>
    </details>

    <div class="screen-actions">
      <button type="button" class="secondary-button" data-action="back">← Alterar informações</button>
      <div class="right"><button type="button" class="primary-button" id="result-new">Começar nova simulação</button></div>
    </div>`;

  if (!resultViewTracked) {
    track("tool_result_view",{stage:"result"});
    track("precifica_calculation_completed",{stage:"result"});
    resultViewTracked=true;
  }

  bindPercent("discount-input",(v)=>{state.discountBps=Math.min(10000,v);saveState();updateDiscount();});
  document.getElementById("result-new").addEventListener("click",()=>resetDialog.showModal());
  updateDiscount();

  function updateDiscount(){
    const holder=document.getElementById("discount-result");
    if(!holder) return;
    if(!state.discountBps){holder.innerHTML="";return;}
    const sim=simulateDiscount(input,selected.priceCents,state.discountBps);
    if(!sim.evaluation){
      holder.innerHTML='<div class="notice error"><span>!</span><div>Com 100% de desconto, o preço fica zerado.</div></div>';
      return;
    }
    const e=sim.evaluation;
    holder.innerHTML=`
      <div class="summary-strip"><span>Preço depois do desconto</span><strong>${money(sim.discountedPriceCents)}</strong></div>
      <div class="breakdown-list">
        <div class="breakdown-row"><span>Lucro por venda</span><strong>${money(e.profitCents)}</strong></div>
        <div class="breakdown-row"><span>Margem</span><strong>${pct(e.marginBps)}</strong></div>
      </div>
      <div class="notice ${e.status==="AT_OR_ABOVE_DESIRED"?"success":e.status==="LOSS"?"error":"warn"}"><span>i</span><div>${escapeHTML(statusCopy(e.status,"discount"))}</div></div>`;
  }
}

function validateStep() {
  if (state.step === 1 && !state.itemType) return "Escolha Produto ou Serviço para continuar.";
  if (state.step === 2) {
    const direct=computeDirectCost();
    if (!direct || direct <= 0) return state.itemType==="product"?"Informe quanto custa uma unidade para continuar.":"Informe o custo de mão de obra deste serviço para continuar.";
  }
  if (state.step === 4) {
    if (!state.fixedCostMode) return "Escolha como deseja tratar os custos mensais.";
    if (state.fixedCostMode==="guided") {
      if (!state.monthlyFixedCostCents) return "Informe o total de custos mensais que deseja considerar.";
      if (state.itemType==="product" && !state.expectedMonthlyUnits) return "Informe pelo menos 1 unidade esperada por mês.";
      if (state.itemType==="service" && (!state.monthlyBillableMinutes || !state.serviceMinutes)) return "Informe as horas que podem ser vendidas e a duração deste serviço.";
    }
  }
  if (state.step === 5 && totalRates() >= 10000) return "Revise os percentuais: juntos, eles precisam ficar abaixo de 100%.";
  if (state.step === 6) {
    if (state.desiredMarginBps <= 0) return "Informe quanto você gostaria que sobrasse de cada R$ 100 vendidos.";
    if (state.desiredMarginBps >= 10000) return "Sua meta precisa ser menor que R$ 100 de cada R$ 100 vendidos.";
    if (state.minimumMarginBps > state.desiredMarginBps) return "O mínimo não pode ser maior que sua meta.";
    if (totalRates()+state.desiredMarginBps>=10000) return "Com os percentuais informados e a sua meta, não existe espaço suficiente no preço para cobrir tudo. Revise esses valores.";
  }
  if (state.step === 7) {
    if (state.hasCurrentPrice === null) return "Diga se você já possui um preço para compararmos.";
    if (state.hasCurrentPrice && state.currentPriceCents <= 0) return "Informe um preço maior que zero para fazer a comparação.";
  }
  return null;
}

function bindNavigation() {
  screen.querySelector('[data-action="back"]')?.addEventListener("click",()=>{if(state.step>1){state.step-=1;resultViewTracked=false;saveState();render();}});
  screen.querySelector('[data-action="next"]')?.addEventListener("click",()=>{
    const error=validateStep();
    if(error){showError(error);return;}
    if(state.step===6) track("precifica_calculation_started",{stage:"margin_complete"});
    if(state.step===7 && state.hasCurrentPrice) track("precifica_price_simulated",{stage:"current_price"});
    if(state.step<8){state.step+=1;saveState();render();}
  });
}

function render() {
  if (resumePending) { renderResume(); return; }
  setProgress();
  const renderers=[null,renderStep1,renderStep2,renderStep3,renderStep4,renderStep5,renderStep6,renderStep7,renderStep8];
  renderers[state.step]();
  bindNavigation();
}

document.getElementById("help-button").addEventListener("click",()=>helpDialog.showModal());
document.getElementById("new-simulation-button").addEventListener("click",()=>resetDialog.showModal());
document.getElementById("confirm-reset").addEventListener("click",(event)=>{
  event.preventDefault();
  clearState();
  resumePending=false;
  resetDialog.close();
  saveState();

  if (!accessValidated) {
    bootstrap();
    return;
  }

  track("tool_activation",{stage:"new_simulation"});
  render();
});

function renderAccessGate(accessState = {}) {
  stepLabel.textContent = "Acesso ao Ever.Precifica";
  progressRoute.innerHTML = "";

  const warning = accessState.activationError
    ? '<div class="notice warn"><span>!</span><div>Este link de ativação não é mais válido. Solicite um novo link abaixo.</div></div>'
    : accessState.networkError
      ? '<div class="notice warn"><span>!</span><div>Não conseguimos validar seu acesso agora. Você pode tentar novamente ou solicitar um novo link.</div></div>'
      : accessState.expired
        ? '<div class="notice info"><span>i</span><div>Seu acesso neste navegador precisa ser reativado.</div></div>'
        : "";

  screen.innerHTML = `
    <span class="eyebrow">Acesso protegido</span>
    <h2 class="screen-title">Entre pelo link que enviamos por e-mail.</h2>
    <p class="screen-copy">O Ever.Precifica não usa senha. Depois da compra, você recebe um link para liberar este navegador.</p>
    ${warning}
    <div class="section-card">
      <h3>Perdeu o link ou trocou de dispositivo?</h3>
      <p class="form-help">Informe o mesmo e-mail usado na compra. Se encontrarmos uma compra válida, enviaremos um novo link.</p>
      <label class="form-group" for="recovery-email" style="margin-top:14px">
        <span class="form-label">E-mail usado na compra</span>
        <span class="input-shell"><input id="recovery-email" type="email" autocomplete="email" placeholder="voce@empresa.com.br"></span>
      </label>
      <div id="recovery-message"></div>
      <div class="inline-actions">
        <button type="button" class="primary-button" id="recovery-button">Enviar novo link</button>
        <button type="button" class="secondary-button" id="retry-access-button">Tentar validar novamente</button>
      </div>
    </div>
    <div class="notice info"><span>◇</span><div>Seus custos, preços e margens continuam ficando somente neste navegador.</div></div>
  `;

  document.getElementById("recovery-button").addEventListener("click", async () => {
    const email = String(document.getElementById("recovery-email").value || "").trim();
    const holder = document.getElementById("recovery-message");

    if (!email || !email.includes("@")) {
      holder.innerHTML = '<div class="notice error"><span>!</span><div>Informe um e-mail válido para continuar.</div></div>';
      return;
    }

    const button = document.getElementById("recovery-button");
    button.disabled = true;
    button.textContent = "Enviando…";
    const result = await requestRecovery(email);
    button.disabled = false;
    button.textContent = "Enviar novo link";
    holder.innerHTML = `<div class="notice ${result.ok ? "success" : "error"}"><span>${result.ok ? "✓" : "!"}</span><div>${escapeHTML(result.message)}</div></div>`;
  });

  document.getElementById("retry-access-button").addEventListener("click", () => bootstrap());
}

async function bootstrap() {
  accessValidated = false;
  stepLabel.textContent = "Validando acesso…";
  progressRoute.innerHTML = "";
  screen.innerHTML = document.getElementById("spinner-template").innerHTML;

  const isQaPreview =
    location.hostname === "ever-tools-automation-staging.gabrielfelipegfrs.workers.dev" &&
    location.pathname.startsWith("/preview/precifica");

  if (isQaPreview) {
    accessValidated = true;
    render();
    return;
  }

  const access = await ensureAccess();
  if (!access.valid) {
    renderAccessGate(access);
    return;
  }

  accessValidated = true;
  track("tool_activation",{stage:"open"});
  render();
}

bootstrap();
