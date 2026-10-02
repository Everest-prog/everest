(function () {
  "use strict";

  const ATTRIBUTION_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid"
  ];

  window.dataLayer = window.dataLayer || [];

  function readAttribution() {
    const params = new URLSearchParams(window.location.search);
    const current = {};

    ATTRIBUTION_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) {
        current[key] = value;
        try {
          sessionStorage.setItem("everest_" + key, value);
        } catch (_) {}
      }
    });

    ATTRIBUTION_KEYS.forEach((key) => {
      if (current[key]) return;
      try {
        const stored = sessionStorage.getItem("everest_" + key);
        if (stored) current[key] = stored;
      } catch (_) {}
    });

    return current;
  }

  function cleanParams(params) {
    const safe = {};
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      safe[key] = value;
    });
    return safe;
  }

  window.everestTrack = function (eventName, params) {
    if (!eventName) return;

    window.dataLayer.push({
      event: eventName,
      event_source: "everest_site",
      page_path: window.location.pathname,
      page_title: document.title,
      occurred_at: new Date().toISOString(),
      ...readAttribution(),
      ...cleanParams(params)
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.everestTrack("everest_page_view");

    document.querySelectorAll("[data-track]").forEach((element) => {
      element.addEventListener("click", function () {
        window.everestTrack(element.dataset.track, {
          item_name: element.dataset.trackItem,
          destination: element.getAttribute("href")
        });
      });
    });

    document.querySelectorAll("[data-track-form]").forEach((form) => {
      form.addEventListener("submit", function () {
        window.everestTrack(form.dataset.trackForm, {
          form_name: form.getAttribute("name") || form.id || "form"
        });
      });
    });
  });
})();