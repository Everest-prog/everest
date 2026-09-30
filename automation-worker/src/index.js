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

  return json({
    ok: true,
    kiwify_events: Number(count?.total || 0),
    last_event: last || null
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

  const providerEventId =
    payload?.event_id ||
    payload?.id ||
    [payload?.order_id, payload?.event, payload?.updated_at].filter(Boolean).join(":");

  if (!providerEventId) {
    return json({ error: "missing_event_id" }, 422);
  }

  const rawStatus =
    payload?.webhook_event_type ||
    payload?.event ||
    payload?.type ||
    payload?.order_status ||
    "unknown";

  const eventType = normalizeKiwifyEvent(rawStatus);

  const inserted = await recordWebhookEvent(env, {
    provider: "kiwify",
    providerEventId: String(providerEventId),
    eventType,
    rawBody
  });

  if (!inserted) return json({ ok: true, duplicate: true });

  // Product/order mapping is intentionally postponed until the real Kiwify
  // payload has been captured in staging and validated against documentation.
  return json({ ok: true, staged: true });
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

  return result.meta.changes > 0;
}

function normalizeKiwifyEvent(value) {
  const status = String(value || "").trim().toLowerCase();

  const map = {
    paid: "purchase_approved",
    approved: "purchase_approved",
    refunded: "refund",
    refund: "refund",
    chargeback: "chargeback"
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
