import { Webhook } from "standardwebhooks";
import {
  isSupportedKiwifyEvent,
  decideKiwifyEvent
} from "./kiwify-idempotency.mjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return handleHealth(env);
    }

    if (request.method === "OPTIONS" && url.pathname.startsWith("/access/")) {
      return handleAccessOptions(request, env);
    }

    if (request.method === "POST" && url.pathname === "/access/recover") {
      return handleAccessRecover(request, env);
    }

    if (request.method === "POST" && url.pathname === "/access/activate") {
      return handleAccessActivate(request, env);
    }

    if (request.method === "POST" && url.pathname === "/access/validate") {
      return handleAccessValidate(request, env);
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
      database: "missing_binding"
    }, 503);
  }

  try {
    const probe = await env.DB.prepare("SELECT 1 AS ok").first();

    return json({
      ok: probe?.ok === 1,
      environment: env.ENVIRONMENT || "unknown",
      database: probe?.ok === 1 ? "connected" : "unexpected_response"
    }, probe?.ok === 1 ? 200 : 503);
  } catch {
    return json({
      ok: false,
      environment: env.ENVIRONMENT || "unknown",
      database: "error"
    }, 503);
  }
}

async function handleAccessOptions(request, env) {
  return new Response(null, {
    status: 204,
    headers: accessCorsHeaders(request, env)
  });
}

async function handleAccessRecover(request, env) {
  const generic = () => accessJson(
    request,
    env,
    { ok: true, message: "Se encontrarmos uma compra válida para este e-mail, você receberá um novo link de acesso." }
  );

  let body;
  try {
    body = await request.json();
  } catch {
    return generic();
  }

  const email = normalizeEmail(body?.email);
  if (!email) return generic();

  const emailHash = await sha256("email:" + email);
  const order = await env.DB.prepare(
    `SELECT id, product_code
     FROM orders
     WHERE provider = 'kiwify'
       AND email_hash = ?1
       AND status = 'approved'
       AND product_code IN ('ever_precifica', 'ever_precifica_e2e')
     ORDER BY COALESCE(approved_at, created_at) DESC
     LIMIT 1`
  ).bind(emailHash).first();

  if (!order || !env.RESEND_API_KEY) return generic();

  const recent = await env.DB.prepare(
    `SELECT id
     FROM access_activation_tokens
     WHERE email_hash = ?1
       AND product_code = ?2
       AND created_at >= datetime('now', '-5 minutes')
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(emailHash, order.product_code).first();

  if (recent) return generic();

  try {
    await sendAccessActivation(env, {
      orderId: order.id,
      productCode: order.product_code,
      email,
      emailHash,
      reason: "recovery"
    });
  } catch {
    // Keep recovery response generic to avoid leaking account existence.
  }

  return generic();
}

async function handleAccessActivate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return accessJson(request, env, { ok: false, error: "invalid_request" }, 400);
  }

  const token = String(body?.token || "").trim();
  if (!token || token.length < 20) {
    return accessJson(request, env, { ok: false, error: "invalid_or_expired" }, 401);
  }

  const tokenHash = await sha256("activation:" + token);
  const activation = await env.DB.prepare(
    `SELECT a.id, a.order_id, a.product_code
     FROM access_activation_tokens a
     JOIN orders o ON o.id = a.order_id
     WHERE a.token_hash = ?1
       AND a.used_at IS NULL
       AND a.revoked_at IS NULL
       AND a.expires_at > datetime('now')
       AND o.status = 'approved'
       AND o.product_code = a.product_code
     LIMIT 1`
  ).bind(tokenHash).first();

  if (!activation) {
    return accessJson(request, env, { ok: false, error: "invalid_or_expired" }, 401);
  }

  const used = await env.DB.prepare(
    `UPDATE access_activation_tokens
     SET used_at = datetime('now')
     WHERE id = ?1
       AND used_at IS NULL
       AND revoked_at IS NULL`
  ).bind(activation.id).run();

  if (!used?.meta?.changes) {
    return accessJson(request, env, { ok: false, error: "invalid_or_expired" }, 401);
  }

  const sessionToken = randomToken(32);
  const sessionHash = await sha256("session:" + sessionToken);

  await env.DB.prepare(
    `INSERT INTO access_sessions
      (token_hash, order_id, product_code, created_at, expires_at, last_seen_at)
     VALUES (?1, ?2, ?3, datetime('now'), datetime('now', '+365 days'), datetime('now'))`
  ).bind(sessionHash, activation.order_id, activation.product_code).run();

  return accessJson(request, env, {
    ok: true,
    access_token: sessionToken,
    product_code: activation.product_code
  });
}

async function handleAccessValidate(request, env) {
  let token = "";
  const authorization = request.headers.get("authorization") || "";

  if (/^Bearer\s+/i.test(authorization)) {
    token = authorization.replace(/^Bearer\s+/i, "").trim();
  } else {
    try {
      const body = await request.json();
      token = String(body?.access_token || "").trim();
    } catch {}
  }

  if (!token || token.length < 20) {
    return accessJson(request, env, { ok: false, valid: false }, 401);
  }

  const tokenHash = await sha256("session:" + token);
  const session = await env.DB.prepare(
    `SELECT s.id, s.product_code
     FROM access_sessions s
     JOIN orders o ON o.id = s.order_id
     WHERE s.token_hash = ?1
       AND s.revoked_at IS NULL
       AND s.expires_at > datetime('now')
       AND o.status = 'approved'
       AND o.product_code = s.product_code
     LIMIT 1`
  ).bind(tokenHash).first();

  if (!session) {
    return accessJson(request, env, { ok: false, valid: false }, 401);
  }

  await env.DB.prepare(
    `UPDATE access_sessions
     SET last_seen_at = datetime('now')
     WHERE id = ?1`
  ).bind(session.id).run();

  return accessJson(request, env, {
    ok: true,
    valid: true,
    product_code: session.product_code
  });
}

async function sendAccessActivation(env, details) {
  await env.DB.prepare(
    `UPDATE access_activation_tokens
     SET revoked_at = datetime('now')
     WHERE order_id = ?1
       AND product_code = ?2
       AND used_at IS NULL
       AND revoked_at IS NULL`
  ).bind(details.orderId, details.productCode).run();

  const rawToken = randomToken(32);
  const tokenHash = await sha256("activation:" + rawToken);

  await env.DB.prepare(
    `INSERT INTO access_activation_tokens
      (token_hash, order_id, email_hash, product_code, created_at, expires_at)
     VALUES (?1, ?2, ?3, ?4, datetime('now'), datetime('now', '+30 minutes'))`
  ).bind(
    tokenHash,
    details.orderId,
    details.emailHash,
    details.productCode
  ).run();

  const siteUrl = String(env.SITE_URL || "https://soueverest.com.br").replace(/\/$/, "");
  const activationUrl =
    siteUrl +
    "/ferramentas/precifica/?activate=" +
    encodeURIComponent(rawToken);

  const response = await sendTransactionalEmail(env, {
    to: details.email,
    subject: "Ever.Precifica — seu acesso está pronto",
    text:
      "Olá!\n\n" +
      "Seu acesso ao Ever.Precifica está pronto. Use o link abaixo para ativar este navegador:\n\n" +
      activationUrl +
      "\n\n" +
      "O link é de uso único e expira em 30 minutos. Se precisar depois, você poderá solicitar um novo link pela opção Recuperar meu acesso.\n\n" +
      "Ever.Est — Clareza para decidir. Estrutura para crescer.",
    idempotencyKey:
      "precifica-access:" +
      details.orderId +
      ":" +
      details.reason +
      ":" +
      tokenHash.slice(0, 16)
  });

  if (!response.ok) {
    await env.DB.prepare(
      `UPDATE access_activation_tokens
       SET revoked_at = datetime('now')
       WHERE token_hash = ?1`
    ).bind(tokenHash).run();
    throw new Error("access_email_send_failed");
  }

  return activationUrl;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.length > 320 || !email.includes("@")) return null;
  return email;
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function accessCorsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const configured = String(env.SITE_URL || "https://soueverest.com.br");
  let allowedOrigin = "";

  try {
    const expected = new URL(configured).origin;
    if (origin === expected) allowedOrigin = origin;
  } catch {}

  if (
    env.ENVIRONMENT === "staging" &&
    ["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:8788"].includes(origin)
  ) {
    allowedOrigin = origin;
  }

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "vary": "Origin"
  };

  if (allowedOrigin) headers["access-control-allow-origin"] = allowedOrigin;
  return headers;
}

function accessJson(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: accessCorsHeaders(request, env)
  });
}

async function handleResendWebhook(request, env) {
  const rawBody = await request.text();

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
  const providerEventId = String(eventId);

  const existing = await getWebhookEventState(env, "resend", providerEventId);

  if (existing?.status === "processed" || existing?.status === "received") {
    return json({ ok: true, duplicate: true });
  }

  if (existing?.status === "failed") {
    await resetWebhookEventForRetry(env, "resend", providerEventId);
  } else {
    const inserted = await recordWebhookEvent(env, {
      provider: "resend",
      providerEventId,
      eventType,
      rawBody
    });

    if (!inserted) return json({ ok: true, duplicate: true });
  }

  try {
    await env.DB.prepare(
      `INSERT INTO email_events (provider_event_id, contact_ref, email_type, event_type, occurred_at, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
       ON CONFLICT(provider_event_id) DO NOTHING`
    ).bind(
      providerEventId,
      null,
      "transactional",
      eventType,
      payload?.created_at || new Date().toISOString()
    ).run();

    await markWebhookProcessed(
      env,
      "resend",
      providerEventId,
      "processed",
      null
    );

    return json({ ok: true });
  } catch {
    await markWebhookProcessed(
      env,
      "resend",
      providerEventId,
      "failed",
      "processing_error"
    );
    return json({ error: "resend_processing_failed" }, 500);
  }
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
  const orderId = payload?.order_id ? String(payload.order_id) : null;

  const providerEventId =
    orderId && isSupportedKiwifyEvent(eventType)
      ? orderId + ":" + eventType
      : (
          payload?.event_id ||
          payload?.id ||
          [
            payload?.order_id,
            rawStatus,
            payload?.updated_at || payload?.approved_date || payload?.created_at
          ].filter(Boolean).join(":")
        );

  if (!providerEventId) {
    return json({ error: "missing_event_id" }, 422);
  }

  const [existingOrder, existingWebhook] = await Promise.all([
    orderId
      ? env.DB.prepare(
          `SELECT status
           FROM orders
           WHERE provider = 'kiwify' AND provider_order_id = ?1
           LIMIT 1`
        ).bind(orderId).first()
      : Promise.resolve(null),
    getWebhookEventState(env, "kiwify", String(providerEventId))
  ]);

  const decision = decideKiwifyEvent(
    eventType,
    existingOrder?.status,
    existingWebhook?.status
  );

  if (decision === "duplicate") {
    return json({
      ok: true,
      duplicate: true,
      event_type: eventType,
      order_status: existingOrder?.status || null
    });
  }

  if (decision === "retry") {
    await resetWebhookEventForRetry(env, "kiwify", String(providerEventId));
  } else {
    const inserted = await recordWebhookEvent(env, {
      provider: "kiwify",
      providerEventId: String(providerEventId),
      eventType,
      rawBody
    });

    // Protect against a concurrent delivery that inserted the same logical
    // event after our read but before this insert.
    if (!inserted) {
      return json({
        ok: true,
        duplicate: true,
        event_type: eventType,
        order_status: existingOrder?.status || null
      });
    }
  }

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

async function getWebhookEventState(env, provider, providerEventId) {
  return env.DB.prepare(
    `SELECT status, error_code
     FROM webhook_events
     WHERE provider = ?1 AND provider_event_id = ?2
     LIMIT 1`
  ).bind(provider, providerEventId).first();
}

async function resetWebhookEventForRetry(env, provider, providerEventId) {
  await env.DB.prepare(
    `UPDATE webhook_events
     SET status = 'received',
         error_code = NULL,
         received_at = datetime('now'),
         processed_at = NULL
     WHERE provider = ?1 AND provider_event_id = ?2`
  ).bind(provider, providerEventId).run();
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
