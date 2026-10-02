import { Webhook } from "standardwebhooks";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return handleHealth(env);
    }

    if (request.method === "GET" && url.pathname === "/internal/test-resend") {
      return handleResendSendTest(env);
    }

    if (request.method === "GET" && url.pathname === "/internal/kiwify-status") {
      return handleKiwifyStatus(env);
    }

    if (request.method === "GET" && url.pathname === "/internal/analytics-preview") {
      return handleAnalyticsPreview(env);
    }

    if (request.method === "GET" && url.pathname === "/internal/preview-assets/consent.js") {
      return handlePreviewAsset(env, "consent");
    }

    if (request.method === "GET" && url.pathname === "/internal/preview-assets/analytics.js") {
      return handlePreviewAsset(env, "analytics");
    }

    if (request.method === "POST" && url.pathname === "/webhooks/resend") {
      return handleResendWebhook(request, env);
    }

    if (request.method === "POST" && url.pathname === "/webhooks/kiwify") {
      return handleKiwifyWebhook(request, env);
    }

    return json({ error: "not_found" }, 404);
  }
};

async function handleHealth(env) {
  if (!env.DB) {
    return json({
      ok: false,
      environment: env.ENVIRONMENT || "unknown",
      database: "missing_binding",
      resend_webhook_configured: Boolean(env.RESEND_WEBHOOK_SECRET),
      resend_api_configured: Boolean(env.RESEND_API_KEY)
    }, 503);
  }

  try {
    const probe = await env.DB.prepare("SELECT 1 AS ok").first();

    return json({
      ok: probe?.ok === 1,
      environment: env.ENVIRONMENT || "unknown",
      database: probe?.ok === 1 ? "connected" : "unexpected_response",
      resend_webhook_configured: Boolean(env.RESEND_WEBHOOK_SECRET),
      resend_api_configured: Boolean(env.RESEND_API_KEY),
      kiwify_webhook_configured: Boolean(env.KIWIFY_WEBHOOK_TOKEN)
    }, probe?.ok === 1 ? 200 : 503);
  } catch {
    return json({
      ok: false,
      environment: env.ENVIRONMENT || "unknown",
      database: "error",
      resend_webhook_configured: Boolean(env.RESEND_WEBHOOK_SECRET)
    }, 503);
  }
}


const PREVIEW_CONSENT_JS = "(function () {\n  \"use strict\";\n\n  const STORAGE_KEY = \"everest_analytics_consent\";\n  const GTM_ID = \"GTM-TH5483TJ\";\n\n  window.dataLayer = window.dataLayer || [];\n\n  function gtag() {\n    window.dataLayer.push(arguments);\n  }\n\n  // Conservative default: analytics and advertising storage denied.\n  gtag(\"consent\", \"default\", {\n    analytics_storage: \"denied\",\n    ad_storage: \"denied\",\n    ad_user_data: \"denied\",\n    ad_personalization: \"denied\",\n    functionality_storage: \"granted\",\n    security_storage: \"granted\"\n  });\n\n  function loadGtm() {\n    if (document.querySelector('script[data-everest-gtm]')) return;\n\n    const script = document.createElement(\"script\");\n    script.async = true;\n    script.src = \"https://www.googletagmanager.com/gtm.js?id=\" + encodeURIComponent(GTM_ID);\n    script.dataset.everestGtm = \"true\";\n    document.head.appendChild(script);\n  }\n\n  function updateConsent(value) {\n    const granted = value === \"granted\";\n\n    gtag(\"consent\", \"update\", {\n      analytics_storage: granted ? \"granted\" : \"denied\",\n      ad_storage: \"denied\",\n      ad_user_data: \"denied\",\n      ad_personalization: \"denied\"\n    });\n\n    window.dataLayer.push({\n      event: \"everest_consent_update\",\n      analytics_consent: granted ? \"granted\" : \"denied\"\n    });\n\n    try {\n      localStorage.setItem(STORAGE_KEY, granted ? \"granted\" : \"denied\");\n    } catch (_) {}\n\n    if (granted) loadGtm();\n  }\n\n  function getStoredConsent() {\n    try {\n      const value = localStorage.getItem(STORAGE_KEY);\n      return value === \"granted\" || value === \"denied\" ? value : null;\n    } catch (_) {\n      return null;\n    }\n  }\n\n  function createBanner() {\n    if (document.getElementById(\"everest-cookie-banner\")) return;\n\n    const banner = document.createElement(\"div\");\n    banner.id = \"everest-cookie-banner\";\n    banner.setAttribute(\"role\", \"dialog\");\n    banner.setAttribute(\"aria-label\", \"Preferências de cookies\");\n    banner.innerHTML = `\n      <div class=\"everest-cookie-card\">\n        <div>\n          <strong>Cookies e métricas</strong>\n          <p>\n            Usamos métricas para entender como o site é utilizado e melhorar as Ferramentas Ever.Est.\n            Você pode aceitar ou recusar. Cookies analíticos só serão ativados após sua escolha.\n            <a href=\"/privacidade.html\">Saiba mais</a>.\n          </p>\n        </div>\n        <div class=\"everest-cookie-actions\">\n          <button type=\"button\" data-cookie-deny>Recusar</button>\n          <button type=\"button\" data-cookie-accept>Aceitar métricas</button>\n        </div>\n      </div>\n    `;\n\n    const style = document.createElement(\"style\");\n    style.textContent = `\n      #everest-cookie-banner {\n        position: fixed;\n        inset: auto 0 0 0;\n        z-index: 99999;\n        padding: 16px;\n        background: rgba(15,23,42,.96);\n        color: #fff;\n        box-shadow: 0 -8px 24px rgba(15,23,42,.18);\n      }\n      .everest-cookie-card {\n        max-width: 1100px;\n        margin: 0 auto;\n        display: flex;\n        gap: 20px;\n        align-items: center;\n        justify-content: space-between;\n      }\n      .everest-cookie-card strong { display: block; margin-bottom: 6px; }\n      .everest-cookie-card p { margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.55; }\n      .everest-cookie-card a { color: #fb923c; font-weight: 600; text-decoration: underline; }\n      .everest-cookie-actions { display: flex; gap: 10px; flex-shrink: 0; }\n      .everest-cookie-actions button {\n        border: 1px solid #64748b;\n        border-radius: 8px;\n        padding: 10px 14px;\n        font-weight: 700;\n        cursor: pointer;\n      }\n      .everest-cookie-actions [data-cookie-deny] { background: transparent; color: #fff; }\n      .everest-cookie-actions [data-cookie-accept] { background: #f97316; color: #fff; border-color: #f97316; }\n      #everest-cookie-preferences {\n        position: fixed;\n        right: 14px;\n        bottom: 14px;\n        z-index: 99998;\n        border: 1px solid #cbd5e1;\n        background: #fff;\n        color: #0f172a;\n        border-radius: 999px;\n        padding: 8px 12px;\n        font-size: 12px;\n        font-weight: 700;\n        cursor: pointer;\n        box-shadow: 0 4px 14px rgba(15,23,42,.12);\n      }\n      @media (max-width: 760px) {\n        .everest-cookie-card { flex-direction: column; align-items: stretch; }\n        .everest-cookie-actions { width: 100%; }\n        .everest-cookie-actions button { flex: 1; }\n      }\n    `;\n\n    document.head.appendChild(style);\n    document.body.appendChild(banner);\n\n    banner.querySelector(\"[data-cookie-accept]\").addEventListener(\"click\", function () {\n      updateConsent(\"granted\");\n      banner.remove();\n      showPreferencesButton();\n    });\n\n    banner.querySelector(\"[data-cookie-deny]\").addEventListener(\"click\", function () {\n      updateConsent(\"denied\");\n      banner.remove();\n      showPreferencesButton();\n    });\n  }\n\n  function showPreferencesButton() {\n    if (document.getElementById(\"everest-cookie-preferences\")) return;\n\n    const button = document.createElement(\"button\");\n    button.id = \"everest-cookie-preferences\";\n    button.type = \"button\";\n    button.textContent = \"Preferências de cookies\";\n    button.addEventListener(\"click\", function () {\n      button.remove();\n      createBanner();\n    });\n    document.body.appendChild(button);\n  }\n\n  document.addEventListener(\"DOMContentLoaded\", function () {\n    const stored = getStoredConsent();\n\n    if (stored === \"granted\") {\n      updateConsent(\"granted\");\n      showPreferencesButton();\n      return;\n    }\n\n    if (stored === \"denied\") {\n      updateConsent(\"denied\");\n      showPreferencesButton();\n      return;\n    }\n\n    createBanner();\n  });\n})();";
const PREVIEW_ANALYTICS_JS = "(function () {\n  \"use strict\";\n\n  const ATTRIBUTION_KEYS = [\n    \"utm_source\",\n    \"utm_medium\",\n    \"utm_campaign\",\n    \"utm_content\",\n    \"utm_term\",\n    \"gclid\",\n    \"fbclid\"\n  ];\n\n  window.dataLayer = window.dataLayer || [];\n\n  function readAttribution() {\n    const params = new URLSearchParams(window.location.search);\n    const current = {};\n\n    ATTRIBUTION_KEYS.forEach((key) => {\n      const value = params.get(key);\n      if (value) {\n        current[key] = value;\n        try {\n          sessionStorage.setItem(\"everest_\" + key, value);\n        } catch (_) {}\n      }\n    });\n\n    ATTRIBUTION_KEYS.forEach((key) => {\n      if (current[key]) return;\n      try {\n        const stored = sessionStorage.getItem(\"everest_\" + key);\n        if (stored) current[key] = stored;\n      } catch (_) {}\n    });\n\n    return current;\n  }\n\n  function cleanParams(params) {\n    const safe = {};\n    Object.entries(params || {}).forEach(([key, value]) => {\n      if (value === undefined || value === null || value === \"\") return;\n      safe[key] = value;\n    });\n    return safe;\n  }\n\n  window.everestTrack = function (eventName, params) {\n    if (!eventName) return;\n\n    window.dataLayer.push({\n      event: eventName,\n      event_source: \"everest_site\",\n      page_path: window.location.pathname,\n      page_title: document.title,\n      occurred_at: new Date().toISOString(),\n      ...readAttribution(),\n      ...cleanParams(params)\n    });\n  };\n\n  document.addEventListener(\"DOMContentLoaded\", function () {\n    window.everestTrack(\"everest_page_view\");\n\n    document.querySelectorAll(\"[data-track]\").forEach((element) => {\n      element.addEventListener(\"click\", function () {\n        window.everestTrack(element.dataset.track, {\n          item_name: element.dataset.trackItem,\n          destination: element.getAttribute(\"href\")\n        });\n      });\n    });\n\n    document.querySelectorAll(\"[data-track-form]\").forEach((form) => {\n      form.addEventListener(\"submit\", function () {\n        window.everestTrack(form.dataset.trackForm, {\n          form_name: form.getAttribute(\"name\") || form.id || \"form\"\n        });\n      });\n    });\n  });\n})();";

function handlePreviewAsset(env, asset) {
  if (env.ENVIRONMENT !== "staging") {
    return json({ error: "not_found" }, 404);
  }

  const body = asset === "consent" ? PREVIEW_CONSENT_JS : PREVIEW_ANALYTICS_JS;
  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function handleAnalyticsPreview(env) {
  if (env.ENVIRONMENT !== "staging") {
    return json({ error: "not_found" }, 404);
  }

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ever.Est — Analytics Preview</title>
  <script src="/internal/preview-assets/consent.js" defer></script>
  <script src="/internal/preview-assets/analytics.js" defer></script>
  <style>
    body { font-family: Arial, sans-serif; max-width: 760px; margin: 48px auto; padding: 0 20px; color: #0f172a; }
    .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; }
    a.test { display: inline-block; margin-top: 16px; padding: 10px 14px; border-radius: 8px; background: #0f172a; color: #fff; text-decoration: none; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Ever.Est — Preview de Analytics</h1>
    <p>Ambiente técnico de staging para validar consentimento, GTM e GA4 antes da publicação.</p>
    <p>Após aceitar métricas, clique no botão abaixo para gerar <code>tools_hub_click</code>.</p>
    <a class="test" href="#preview-destination" data-track="tools_hub_click" data-track-item="preview_test">Gerar evento de teste</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

async function handleKiwifyStatus(env) {
  if (env.ENVIRONMENT !== "staging") {
    return json({ error: "not_found" }, 404);
  }

  const last = await env.DB.prepare(
    `SELECT provider_event_id, event_type, received_at, status, error_code
     FROM webhook_events
     WHERE provider = 'kiwify'
     ORDER BY id DESC
     LIMIT 1`
  ).first();

  const count = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM webhook_events WHERE provider = 'kiwify'`
  ).first();

  const lastOrder = await env.DB.prepare(
    `SELECT provider_order_id, product_code, status, gross_value, currency,
            approved_at, refunded_at, updated_at
     FROM orders
     WHERE provider = 'kiwify'
     ORDER BY id DESC
     LIMIT 1`
  ).first();

  return json({
    ok: true,
    kiwify_events: Number(count?.total || 0),
    last_event: last || null,
    last_order: lastOrder || null
  });
}

async function handleResendSendTest(env) {
  if (env.ENVIRONMENT !== "staging") {
    return json({ error: "not_found" }, 404);
  }

  if (!env.RESEND_API_KEY) {
    return json({ error: "resend_api_not_configured" }, 503);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json",
      "idempotency-key": "et0d-worker-resend-test-001"
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || "Ever.Est <noreply@mail.soueverest.com.br>",
      to: ["delivered@resend.dev"],
      subject: "ET-0D — Worker → Resend",
      text: "Teste técnico enviado pelo Cloudflare Worker de staging da Ever.Est."
    })
  });

  const result = await response.json().catch(() => ({}));

  return json({
    ok: response.ok,
    provider: "resend",
    status: response.status,
    email_id: result?.id || null
  }, response.ok ? 200 : 502);
}

async function handleResendWebhook(request, env) {
  const rawBody = await request.text();

  // TODO ET-0D: verify Resend signature before parsing/processing.
  // Store RESEND_WEBHOOK_SECRET as a Cloudflare Secret.
  if (!env.RESEND_WEBHOOK_SECRET) {
    return json({ error: "resend_webhook_not_configured" }, 503);
  }

  let payload;
  try {
    const verifier = new Webhook(env.RESEND_WEBHOOK_SECRET);
    payload = verifier.verify(rawBody, {
      "webhook-id": request.headers.get("svix-id") || "",
      "webhook-timestamp": request.headers.get("svix-timestamp") || "",
      "webhook-signature": request.headers.get("svix-signature") || ""
    });
  } catch {
    return json({ error: "invalid_resend_signature" }, 401);
  }

  const eventId =
    request.headers.get("svix-id") ||
    payload?.data?.email_id ||
    payload?.id ||
    crypto.randomUUID();
  const eventType = payload?.type || "unknown";

  const inserted = await recordWebhookEvent(env, {
    provider: "resend",
    providerEventId: String(eventId),
    eventType,
    rawBody
  });

  if (!inserted) return json({ ok: true, duplicate: true });

  await env.DB.prepare(
    `INSERT INTO email_events (provider_event_id, contact_ref, email_type, event_type, occurred_at, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
     ON CONFLICT(provider_event_id) DO NOTHING`
  ).bind(
    String(eventId),
    null,
    "transactional",
    eventType,
    payload?.created_at || new Date().toISOString()
  ).run();

  return json({ ok: true });
}

async function handleKiwifyWebhook(request, env) {
  const rawBody = await request.text();

  if (!env.KIWIFY_WEBHOOK_TOKEN) {
    return json({ error: "kiwify_webhook_not_configured" }, 503);
  }

  const url = new URL(request.url);
  const suppliedSignature =
    url.searchParams.get("signature") ||
    request.headers.get("x-kiwify-signature") ||
    request.headers.get("kiwify-signature");

  if (!suppliedSignature) {
    await recordKiwifyDiagnostic(env, rawBody, "missing_signature");
    return json({ error: "missing_kiwify_signature" }, 401);
  }

  const expectedSignature = await hmacSha1Hex(
    env.KIWIFY_WEBHOOK_TOKEN,
    rawBody
  );

  if (!safeEqualHex(expectedSignature, suppliedSignature)) {
    await recordKiwifyDiagnostic(env, rawBody, "invalid_signature");
    return json({ error: "invalid_kiwify_signature" }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const rawStatus =
    payload?.webhook_event_type ||
    payload?.event ||
    payload?.type ||
    payload?.order_status ||
    "unknown";

  const eventType = normalizeKiwifyEvent(rawStatus);

  const providerEventId =
    payload?.event_id ||
    payload?.id ||
    [
      payload?.order_id,
      rawStatus,
      payload?.updated_at || payload?.approved_date || payload?.created_at
    ].filter(Boolean).join(":");

  if (!providerEventId) {
    return json({ error: "missing_event_id" }, 422);
  }

  const inserted = await recordWebhookEvent(env, {
    provider: "kiwify",
    providerEventId: String(providerEventId),
    eventType,
    rawBody
  });

  if (!inserted) return json({ ok: true, duplicate: true });

  try {
    const result = await processKiwifyBusinessEvent(
      env,
      payload,
      eventType,
      String(providerEventId)
    );

    await markWebhookProcessed(
      env,
      "kiwify",
      String(providerEventId),
      result.status || "processed",
      result.errorCode || null
    );

    return json({
      ok: true,
      event_type: eventType,
      order_status: result.orderStatus || null,
      email_sent: Boolean(result.emailSent)
    });
  } catch {
    await markWebhookProcessed(
      env,
      "kiwify",
      String(providerEventId),
      "failed",
      "processing_error"
    );
    return json({ error: "kiwify_processing_failed" }, 500);
  }
}

async function processKiwifyBusinessEvent(env, payload, eventType, providerEventId) {
  const orderId = payload?.order_id ? String(payload.order_id) : null;
  const productCode = mapKiwifyProductCode(payload, env);

  if (!orderId) {
    return {
      status: "ignored",
      errorCode: "missing_order_id",
      orderStatus: null,
      emailSent: false
    };
  }

  if (!productCode) {
    return {
      status: "ignored",
      errorCode: "unknown_product",
      orderStatus: null,
      emailSent: false
    };
  }

  const rawEmail = String(
    payload?.Customer?.email ||
    payload?.customer?.email ||
    ""
  ).trim().toLowerCase();

  const emailHash = rawEmail ? await sha256("email:" + rawEmail) : null;
  const grossValue = parseIntegerCents(
    payload?.Commissions?.charge_amount ??
    payload?.commissions?.charge_amount
  );
  const currency = String(
    payload?.Commissions?.currency ||
    payload?.commissions?.currency ||
    "BRL"
  ).toUpperCase();

  if (eventType === "purchase_approved") {
    const approvedAt =
      payload?.approved_date ||
      payload?.updated_at ||
      payload?.created_at ||
      new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO orders
        (provider, provider_order_id, product_code, status, gross_value, currency,
         contact_ref, email_hash, approved_at, created_at, updated_at)
       VALUES ('kiwify', ?1, ?2, 'approved', ?3, ?4, ?5, ?5, ?6,
               datetime('now'), datetime('now'))
       ON CONFLICT(provider, provider_order_id) DO UPDATE SET
         product_code = excluded.product_code,
         status = 'approved',
         gross_value = COALESCE(excluded.gross_value, orders.gross_value),
         currency = excluded.currency,
         contact_ref = COALESCE(excluded.contact_ref, orders.contact_ref),
         email_hash = COALESCE(excluded.email_hash, orders.email_hash),
         approved_at = COALESCE(orders.approved_at, excluded.approved_at),
         updated_at = datetime('now')`
    ).bind(
      orderId,
      productCode,
      grossValue,
      currency,
      emailHash,
      approvedAt
    ).run();

    let emailSent = false;

    if (rawEmail && env.RESEND_API_KEY) {
      const firstName = String(
        payload?.Customer?.first_name ||
        payload?.customer?.first_name ||
        ""
      ).trim();

      const response = await sendTransactionalEmail(env, {
        to: rawEmail,
        subject: "Ever.Precifica — compra de teste confirmada",
        text:
          (firstName ? "Olá, " + firstName + "!\n\n" : "Olá!\n\n") +
          "Sua compra de teste do Ever.Precifica foi confirmada. " +
          "Este e-mail valida o fluxo técnico Kiwify → Ever.Est → Resend.\n\n" +
          "Nenhuma ação é necessária.",
        idempotencyKey: "kiwify:" + orderId + ":purchase-approved:v1"
      });

      if (!response.ok) {
        throw new Error("resend_send_failed");
      }

      emailSent = true;
    }

    return {
      status: "processed",
      errorCode: rawEmail ? null : "missing_customer_email",
      orderStatus: "approved",
      emailSent
    };
  }

  if (eventType === "refund" || eventType === "chargeback") {
    const nextStatus = eventType === "refund" ? "refunded" : "chargeback";
    const refundedAt =
      eventType === "refund"
        ? (payload?.updated_at || new Date().toISOString())
        : null;

    await env.DB.prepare(
      `INSERT INTO orders
        (provider, provider_order_id, product_code, status, gross_value, currency,
         contact_ref, email_hash, refunded_at, created_at, updated_at)
       VALUES ('kiwify', ?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7,
               datetime('now'), datetime('now'))
       ON CONFLICT(provider, provider_order_id) DO UPDATE SET
         status = excluded.status,
         gross_value = COALESCE(excluded.gross_value, orders.gross_value),
         currency = excluded.currency,
         contact_ref = COALESCE(excluded.contact_ref, orders.contact_ref),
         email_hash = COALESCE(excluded.email_hash, orders.email_hash),
         refunded_at = COALESCE(excluded.refunded_at, orders.refunded_at),
         updated_at = datetime('now')`
    ).bind(
      orderId,
      productCode,
      nextStatus,
      grossValue,
      currency,
      emailHash,
      refundedAt
    ).run();

    return {
      status: "processed",
      errorCode: null,
      orderStatus: nextStatus,
      emailSent: false
    };
  }

  return {
    status: "ignored",
    errorCode: "unsupported_event",
    orderStatus: null,
    emailSent: false
  };
}

function mapKiwifyProductCode(payload, env) {
  const productId = String(
    payload?.Product?.product_id ||
    payload?.product?.product_id ||
    ""
  ).trim();

  const productName = String(
    payload?.Product?.product_name ||
    payload?.product?.product_name ||
    ""
  ).trim();

  if (
    env.KIWIFY_E2E_PRODUCT_ID &&
    productId &&
    productId === String(env.KIWIFY_E2E_PRODUCT_ID)
  ) {
    return "ever_precifica_e2e";
  }

  if (
    env.ENVIRONMENT === "staging" &&
    productName === "Ever.Precifica — E2E interno"
  ) {
    return "ever_precifica_e2e";
  }

  return null;
}

function parseIntegerCents(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function sendTransactionalEmail(env, message) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json",
      "idempotency-key": message.idempotencyKey
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || "Ever.Est <noreply@mail.soueverest.com.br>",
      to: [message.to],
      subject: message.subject,
      text: message.text,
      reply_to: env.SUPPORT_EMAIL || "contato@soueverest.com.br"
    })
  });

  return response;
}

async function markWebhookProcessed(env, provider, providerEventId, status, errorCode) {
  await env.DB.prepare(
    `UPDATE webhook_events
     SET status = ?1,
         error_code = ?2,
         processed_at = datetime('now')
     WHERE provider = ?3 AND provider_event_id = ?4`
  ).bind(
    status,
    errorCode,
    provider,
    providerEventId
  ).run();
}

async function recordKiwifyDiagnostic(env, rawBody, reason) {
  const payloadHash = await sha256(rawBody);
  let eventType = "unknown";

  try {
    const parsed = JSON.parse(rawBody);
    eventType = parsed?.event || parsed?.type || parsed?.order_status || "unknown";
  } catch {}

  await env.DB.prepare(
    `INSERT INTO webhook_events
      (provider, provider_event_id, event_type, payload_hash, received_at, status, error_code)
     VALUES ('kiwify', ?1, ?2, ?3, datetime('now'), 'rejected', ?4)
     ON CONFLICT(provider, provider_event_id) DO UPDATE SET
       received_at = datetime('now'),
       status = 'rejected',
       error_code = excluded.error_code`
  ).bind(
    "diagnostic:" + payloadHash,
    String(eventType),
    payloadHash,
    reason
  ).run();
}

async function recordWebhookEvent(env, event) {
  const payloadHash = await sha256(event.rawBody);

  const result = await env.DB.prepare(
    `INSERT INTO webhook_events
      (provider, provider_event_id, event_type, payload_hash, received_at, status)
     VALUES (?1, ?2, ?3, ?4, datetime('now'), 'received')
     ON CONFLICT(provider, provider_event_id) DO NOTHING`
  ).bind(
    event.provider,
    event.providerEventId,
    event.eventType,
    payloadHash
  ).run();

  const inserted = result.meta.changes > 0;

  if (!inserted && event.eventType && event.eventType !== "unknown") {
    await env.DB.prepare(
      `UPDATE webhook_events
       SET event_type = CASE
         WHEN event_type = 'unknown' THEN ?1
         ELSE event_type
       END
       WHERE provider = ?2 AND provider_event_id = ?3`
    ).bind(
      event.eventType,
      event.provider,
      event.providerEventId
    ).run();
  }

  return inserted;
}

function normalizeKiwifyEvent(value) {
  const status = String(value || "").trim().toLowerCase();

  const map = {
    paid: "purchase_approved",
    approved: "purchase_approved",
    order_approved: "purchase_approved",
    refunded: "refund",
    refund: "refund",
    order_refunded: "refund",
    order_refund: "refund",
    chargeback: "chargeback",
    chargedback: "chargeback"
  };

  return map[status] || status || "unknown";
}

async function hmacSha1Hex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqualHex(expected, supplied) {
  const a = String(expected || "").trim().toLowerCase();
  const b = String(supplied || "").trim().toLowerCase();

  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
