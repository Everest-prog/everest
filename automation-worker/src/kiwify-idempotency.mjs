export function isSupportedKiwifyEvent(eventType) {
  return ["purchase_approved", "refund", "chargeback"].includes(eventType);
}

export function decideKiwifyEvent(eventType, existingOrderStatus, existingWebhookStatus) {
  const orderStatus = String(existingOrderStatus || "").trim().toLowerCase();
  const webhookStatus = String(existingWebhookStatus || "").trim().toLowerCase();

  // Terminal business state always wins over an out-of-order/replayed approval.
  if (
    eventType === "purchase_approved" &&
    ["refunded", "chargeback"].includes(orderStatus)
  ) {
    return "duplicate";
  }

  if (eventType === "refund" && ["refunded", "chargeback"].includes(orderStatus)) {
    return "duplicate";
  }

  if (eventType === "chargeback" && orderStatus === "chargeback") {
    return "duplicate";
  }

  // A failed first attempt must be retryable. This is important when the
  // order row was persisted before a downstream side effect (e.g. email) failed.
  if (webhookStatus === "failed") {
    return "retry";
  }

  if (["processed", "ignored", "received"].includes(webhookStatus)) {
    return "duplicate";
  }

  // Legacy safety: an approved order created before logical event IDs were
  // introduced should not send onboarding again just because its old receipt
  // used a different delivery identifier.
  if (eventType === "purchase_approved" && orderStatus === "approved") {
    return "duplicate";
  }

  return "process";
}
