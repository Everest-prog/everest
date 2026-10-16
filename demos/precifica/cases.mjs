// ET-0E-PRE-01 · deterministic, fictitious demonstration cases.
// These figures are pedagogical examples, not tax or pricing recommendations.
import {
  allocateProductFixedCostCents,
  allocateServiceFixedCostCents,
} from "../../ferramentas/precifica/engine.mjs";

export const DEMO_CASES = Object.freeze({
  product: {
    id: "product",
    kind: "Produto",
    segment: "Revenda em salão",
    name: "Óleo finalizador capilar",
    eyebrow: "CASO 01 · PRODUTO",
    scenario: "Um salão revende óleo finalizador capilar por R$ 59,90 e quer conferir se a venda sustenta sua meta de lucro.",
    question: "O preço de R$ 59,90 é suficiente? Até onde o salão poderia conceder desconto?",
    direct: { mode: "direct", purchaseCents: 3500, units: 1, serviceMinutes: 0 },
    extras: { primaryLabel: "Embalagem e frete por unidade", primaryCents: 500, secondaryCents: 0, fixedFeeCents: 0 },
    fixed: { monthlyCents: 60000, allocationBase: 100, allocationUnit: "unidades esperadas no mês" },
    ratesBps: { taxes: 600, payment: 300, commission: 0, other: 0 },
    desiredMarginBps: 2500,
    minimumMarginBps: 1500,
    currentPriceCents: 5990,
    input: {
      directCostCents: 3500,
      additionalCostCents: 500,
      allocatedFixedCostCents: allocateProductFixedCostCents(60000, 100),
      fixedFeeCents: 0,
      ratesBps: { taxes: 600, payment: 300, commission: 0, other: 0 },
      desiredMarginBps: 2500,
      minimumMarginBps: 1500,
      currentPriceCents: 5990,
    },
    takeaway: "Ao preço atual, a margem fica abaixo do mínimo que o próprio salão definiu.",
    lesson: "Um produto pode parecer lucrativo quando se considera apenas a compra, mas embalagem, custos mensais e taxas também consomem parte da venda.",
  },
  service: {
    id: "service",
    kind: "Serviço",
    segment: "Salão de beleza",
    name: "Escova com hidratação",
    eyebrow: "CASO 02 · SERVIÇO",
    scenario: "Uma profissional cobra R$ 95 por escova com hidratação e quer saber quanto sobra depois do trabalho, materiais, custos mensais e taxas.",
    question: "O atendimento a R$ 95 atinge a margem desejada? Quanto mudaria ao conceder desconto?",
    direct: { mode: "guided", hourlyCostCents: 3500, serviceMinutes: 60 },
    extras: { primaryLabel: "Materiais utilizados", primaryCents: 1200, secondaryCents: 0, fixedFeeCents: 0 },
    fixed: { monthlyCents: 240000, allocationBase: 120, allocationUnit: "horas faturáveis no mês" },
    ratesBps: { taxes: 600, payment: 300, commission: 0, other: 0 },
    desiredMarginBps: 3000,
    minimumMarginBps: 2000,
    currentPriceCents: 9500,
    input: {
      directCostCents: 3500,
      additionalCostCents: 1200,
      allocatedFixedCostCents: allocateServiceFixedCostCents(240000, 120 * 60, 60),
      fixedFeeCents: 0,
      ratesBps: { taxes: 600, payment: 300, commission: 0, other: 0 },
      desiredMarginBps: 3000,
      minimumMarginBps: 2000,
      currentPriceCents: 9500,
    },
    takeaway: "O preço atual supera a margem mínima, mas ainda não alcança a meta desejada.",
    lesson: "No serviço, o custo não é só o material: tempo de trabalho e capacidade real de atendimento também entram na conta.",
  },
});

export const DEMO_STEPS = Object.freeze([
  "Tipo", "Custo", "Outros gastos", "Custos mensais",
  "Taxas", "Meta", "Preço atual", "Resultado",
]);
