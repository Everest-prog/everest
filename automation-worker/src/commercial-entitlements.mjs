// Ever.Precifica · pure commercial entitlement calendar. No I/O or buyer data.
// Contract: one approved order grants 12 CALENDAR months. Early renewal
// extends the current expiry; later renewal begins at its own approval.
// Recomputing from non-refunded orders lets refunds remove only their term.

function parseInstant(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new RangeError("invalid approval instant");
    return new Date(value.getTime());
  }
  const raw = String(value ?? "").trim();
  if (!raw) throw new RangeError("missing approval instant");
  // SQLite's UTC timestamp representation contains no explicit timezone.
  const canonical = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? raw.replace(" ", "T") + "Z"
    : /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + "T00:00:00Z" : raw;
  const result = new Date(canonical);
  if (!Number.isFinite(result.getTime())) throw new RangeError("invalid approval instant");
  return result;
}

export function toSqlUtc(value) {
  return parseInstant(value).toISOString().slice(0, 19).replace("T", " ");
}

export function addCalendarMonths(value, months = 12) {
  if (!Number.isInteger(months) || months < 0) throw new RangeError("months must be a nonnegative integer");
  const date = parseInstant(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const anchor = new Date(Date.UTC(
    year, month + months, 1,
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()
  ));
  const maxDay = new Date(Date.UTC(
    anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0
  )).getUTCDate();
  anchor.setUTCDate(Math.min(day, maxDay));
  return toSqlUtc(anchor);
}

export function scheduleCommercialGrants(orders) {
  if (!Array.isArray(orders)) throw new TypeError("orders must be an array");
  const active = orders.filter((o) => o.status === "approved").map((o) => {
    if (!Number.isSafeInteger(Number(o.id)) || Number(o.id) <= 0) {
      throw new RangeError("invalid order identifier");
    }
    return { id: Number(o.id), approvedAt: toSqlUtc(o.approved_at) };
  });
  const seen = new Set();
  for (const order of active) {
    if (seen.has(order.id)) throw new RangeError("duplicate order identifier");
    seen.add(order.id);
  }
  active.sort((a,b) => a.approvedAt.localeCompare(b.approvedAt) || a.id - b.id);
  let previousEnd = null;
  return active.map(({ id, approvedAt }) => {
    const startsAt = previousEnd && previousEnd > approvedAt ? previousEnd : approvedAt;
    const endsAt = addCalendarMonths(startsAt, 12);
    previousEnd = endsAt;
    return { orderId: id, approvedAt, startsAt, endsAt };
  });
}

export function findCommercialAccess(grants, now = new Date()) {
  const instant = toSqlUtc(now);
  const active = grants.some(g =>
    g.startsAt <= instant && instant < g.endsAt
  );
  if (!active) return { active: false, expiresAt: null };
  const expiresAt = grants.filter(g => g.endsAt > instant)
    .reduce((max, g) => g.endsAt > max ? g.endsAt : max, "");
  return { active: true, expiresAt };
}
