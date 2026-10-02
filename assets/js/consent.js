(function () {
  "use strict";

  const STORAGE_KEY = "everest_analytics_consent";
  const GTM_ID = "GTM-TH5483TJ";
  const STYLE_ID = "everest-cookie-styles";

  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }

  // Conservative default: analytics and advertising storage denied.
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted"
  });

  function loadGtm() {
    if (document.querySelector('script[data-everest-gtm]')) return;

    // Basic consent mode: do not replay Ever.Est interactions that happened
    // before analytics consent was granted.
    for (let i = window.dataLayer.length - 1; i >= 0; i -= 1) {
      const entry = window.dataLayer[i];
      if (entry && typeof entry === "object" && entry.event_source === "everest_site") {
        window.dataLayer.splice(i, 1);
      }
    }

    // Mirror the official GTM bootstrap before loading gtm.js.
    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js"
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID);
    script.dataset.everestGtm = "true";
    document.head.appendChild(script);
  }

  function updateConsent(value) {
    const granted = value === "granted";
    window.everestAnalyticsConsent = granted;

    gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });

    window.dataLayer.push({
      event: "everest_consent_update",
      analytics_consent: granted ? "granted" : "denied"
    });

    try {
      localStorage.setItem(STORAGE_KEY, granted ? "granted" : "denied");
    } catch (_) {}

    if (granted) loadGtm();
  }

  function getStoredConsent() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === "granted" || value === "denied" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function ensureConsentStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #everest-cookie-banner {
        position: fixed;
        inset: auto 0 0 0;
        z-index: 99999;
        padding: 16px;
        background: rgba(15,23,42,.96);
        color: #fff;
        box-shadow: 0 -8px 24px rgba(15,23,42,.18);
      }
      .everest-cookie-card {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        gap: 20px;
        align-items: center;
        justify-content: space-between;
      }
      .everest-cookie-card strong { display: block; margin-bottom: 6px; }
      .everest-cookie-card p { margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.55; }
      .everest-cookie-card a { color: #fb923c; font-weight: 600; text-decoration: underline; }
      .everest-cookie-actions { display: flex; gap: 10px; flex-shrink: 0; }
      .everest-cookie-actions button {
        border: 1px solid #64748b;
        border-radius: 8px;
        padding: 10px 14px;
        font-weight: 700;
        cursor: pointer;
      }
      .everest-cookie-actions [data-cookie-deny] { background: transparent; color: #fff; }
      .everest-cookie-actions [data-cookie-accept] { background: #f97316; color: #fff; border-color: #f97316; }
      #everest-cookie-preferences {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 99998;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(15,23,42,.12);
      }
      @media (max-width: 760px) {
        .everest-cookie-card { flex-direction: column; align-items: stretch; }
        .everest-cookie-actions { width: 100%; }
        .everest-cookie-actions button { flex: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  function createBanner() {
    if (document.getElementById("everest-cookie-banner")) return;

    const banner = document.createElement("div");
    banner.id = "everest-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Preferências de cookies");
    banner.innerHTML = `
      <div class="everest-cookie-card">
        <div>
          <strong>Cookies e métricas</strong>
          <p>
            Usamos métricas para entender como o site é utilizado e melhorar as Ferramentas Ever.Est.
            Você pode aceitar ou recusar. Cookies analíticos só serão ativados após sua escolha.
            <a href="/privacidade.html">Saiba mais</a>.
          </p>
        </div>
        <div class="everest-cookie-actions">
          <button type="button" data-cookie-deny>Recusar</button>
          <button type="button" data-cookie-accept>Aceitar métricas</button>
        </div>
      </div>
    `;

    ensureConsentStyles();
    document.body.appendChild(banner);

    banner.querySelector("[data-cookie-accept]").addEventListener("click", function () {
      updateConsent("granted");
      banner.remove();
      showPreferencesButton();
    });

    banner.querySelector("[data-cookie-deny]").addEventListener("click", function () {
      const hadGtmLoaded = Boolean(document.querySelector('script[data-everest-gtm]'));
      updateConsent("denied");
      banner.remove();

      if (hadGtmLoaded) {
        window.location.reload();
        return;
      }

      showPreferencesButton();
    });
  }

  function showPreferencesButton() {
    ensureConsentStyles();
    if (document.getElementById("everest-cookie-preferences")) return;

    const button = document.createElement("button");
    button.id = "everest-cookie-preferences";
    button.type = "button";
    button.textContent = "Preferências de cookies";
    button.addEventListener("click", function () {
      button.remove();
      createBanner();
    });
    document.body.appendChild(button);
  }

  const initialConsent = getStoredConsent();

  // Returning opted-in visitors can load GTM immediately from the head.
  // First-time visitors still remain fully blocked until an explicit choice.
  if (initialConsent === "granted") {
    updateConsent("granted");
  } else if (initialConsent === "denied") {
    window.everestAnalyticsConsent = false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (initialConsent === "granted" || initialConsent === "denied") {
      showPreferencesButton();
      return;
    }

    createBanner();
  });
})();