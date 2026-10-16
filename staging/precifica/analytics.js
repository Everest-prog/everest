(function () {
  "use strict";

  const stagesByEvent = new Map([
    ["everest_page_view", new Set()],
    ["tool_activation", new Set(["open", "new_simulation"])],
    ["tool_result_view", new Set(["result"])],
    ["precifica_calculation_started", new Set(["margin_complete"])],
    ["precifica_calculation_completed", new Set(["result"])],
    ["precifica_price_simulated", new Set(["current_price"])],
    ["precifica_discount_simulated", new Set(["result"])],
  ]);
  const MAX_EVENTS = 100;
  window.dataLayer = window.dataLayer || [];
  window.__everestQaEvents = [];

  window.everestTrack = function (eventName, params) {
    if (window.everestAnalyticsConsent !== true || !stagesByEvent.has(eventName)) return;
    const stage = params && typeof params === "object" ? params.stage : undefined;
    const allowedStages = stagesByEvent.get(eventName);
    if (allowedStages.size && !allowedStages.has(stage)) return;
    const event = {
      event: eventName,
      event_source: "everest_site",
      item_name: "ever_precifica",
    };
    if (allowedStages.size) event.stage = stage;
    // Never inspect URL, attribution, storage, input controls, or arbitrary fields.
    // Freeze each allowed record so it cannot later acquire financial parameters.
    const record = Object.freeze(event);
    window.__everestQaEvents.push(record);
    if (window.__everestQaEvents.length > MAX_EVENTS) window.__everestQaEvents.shift();
    window.dataLayer.push(record);
    // Consent records are tiny; also bound the shared queue during prolonged QA.
    if (window.dataLayer.length > 120) window.dataLayer.splice(0, window.dataLayer.length - 120);
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.everestTrack("everest_page_view");
  });
})();
