export function isSupportedKiwifyEvent(eventType) {
  return ["purchase_approved", "refund", "chargeback"].includes(eventType);
}

export function isKiwifyLogicalDuplicate(eventType, existingStatus) {
  const status = String(existingStatus || "").trim().toLowerCase();
  if (!status) return false;

  if (eventType === "purchase_approved") {
    // A replay must never reactivate an order that already reached
    // a terminal refund/chargeback state.
    return ["approved", "refunded", "chargeback"].includes(status);
  }

  if (eventType === "refund") {
    return ["refunded", "chargeback"].includes(status);
  }

  if (eventType === "chargeback") {
    return status === "chargeback";
  }

  return false;
}
