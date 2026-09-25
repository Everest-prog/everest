export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, environment: env.ENVIRONMENT || "unknown" });
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

async function handleResendWebhook(request, env) {
  const rawBody = await request.text();

  // TODO ET-0D: verify Resend signature before parsing/processing.
  // Store RESEND_WEBHOOK_SECRET as a Cloudflare Secret.
  if (!env.RESEND_WEBHOOK_SECRET) {
    return json({ error: "resend_webhook_not_configured" }, 503);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const eventId = payload?.data?.email_id || payload?.id || crypto.randomUUID();
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

  // IMPORTANT: Kiwify authenticity verification must be implemented
  // against the provider's current production specification before go-live.
  // Never trust an unverified payload in production.
  if (env.ENVIRONMENT === "production" && !env.KIWIFY_WEBHOOK_VERIFICATION_CONFIG) {
    return json({ error: "kiwify_webhook_not_configured" }, 503);
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

  const eventType = payload?.event || payload?.type || "unknown";

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
