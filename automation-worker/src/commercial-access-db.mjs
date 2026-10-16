import { scheduleCommercialGrants } from "./commercial-entitlements.mjs";

// D1 integration; only hashed buyer identifier/order metadata, never sim data.
export async function reconcileCommercialAccess(env, emailHash, productCode) {
  if (!emailHash || !productCode) return null;
  await env.DB.prepare(
    "INSERT INTO access_accounts (email_hash, product_code) VALUES (?1, ?2) ON CONFLICT(product_code, email_hash) DO NOTHING"
  ).bind(emailHash, productCode).run();
  const account = await env.DB.prepare(
    "SELECT id FROM access_accounts WHERE email_hash = ?1 AND product_code = ?2 LIMIT 1"
  ).bind(emailHash, productCode).first();
  if (!account?.id) throw new Error("commercial_account_missing");

  const result = await env.DB.prepare(
    "SELECT id, status, approved_at FROM orders " +
    "WHERE provider = 'kiwify' AND email_hash = ?1 AND product_code = ?2 " +
    "AND status IN ('approved','refunded','chargeback')"
  ).bind(emailHash, productCode).all();
  const orders = result?.results || [];
  const scheduled = scheduleCommercialGrants(orders);
  const byOrder = new Map(scheduled.map(row => [row.orderId, row]));
  for (const order of orders) {
    const grant = byOrder.get(Number(order.id));
    if (grant) {
      await env.DB.prepare(
        "INSERT INTO access_grants " +
        "(account_id, order_id, product_code, approved_at, starts_at, ends_at, status) " +
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'approved') " +
        "ON CONFLICT(order_id) DO UPDATE SET " +
        "account_id=excluded.account_id, product_code=excluded.product_code, " +
        "approved_at=excluded.approved_at, starts_at=excluded.starts_at, " +
        "ends_at=excluded.ends_at, status='approved', updated_at=datetime('now')"
      ).bind(account.id, order.id, productCode, grant.approvedAt,
        grant.startsAt, grant.endsAt).run();
    } else if (["refunded", "chargeback"].includes(order.status)) {
      // Keep historical record, but it must no longer grant access.
      await env.DB.prepare(
        "UPDATE access_grants SET status=?1, starts_at=NULL, ends_at=NULL, " +
        "updated_at=datetime('now') WHERE order_id=?2 AND account_id=?3"
      ).bind(order.status, order.id, account.id).run();
    }
  }
  return Number(account.id);
}

export async function commercialAccessForAccount(env, accountId) {
  if (!accountId) return { active: false, expiresAt: null };
  const row = await env.DB.prepare(
    "SELECT MAX(CASE WHEN starts_at <= datetime('now') AND ends_at > datetime('now') " +
    "THEN 1 ELSE 0 END) AS has_current_grant, MAX(ends_at) AS expires_at " +
    "FROM access_grants WHERE account_id = ?1 AND status = 'approved' " +
    "AND ends_at > datetime('now')"
  ).bind(accountId).first();
  if (!row || !Number(row.has_current_grant)) {
    return { active: false, expiresAt: null };
  }
  return { active: true, expiresAt: row.expires_at };
}

export async function activeAccountForEmail(env, emailHash, productCode) {
  const row = await env.DB.prepare(
    "SELECT id FROM access_accounts WHERE email_hash=?1 AND product_code=?2 LIMIT 1"
  ).bind(emailHash, productCode).first();
  if (!row?.id) return null;
  const right = await commercialAccessForAccount(env, row.id);
  return right.active ? { id: Number(row.id), expiresAt: right.expiresAt } : null;
}

export async function accountForApprovedOrder(env, orderId, productCode) {
  const row = await env.DB.prepare(
    "SELECT g.account_id FROM access_grants g JOIN orders o ON o.id=g.order_id " +
    "WHERE g.order_id=?1 AND g.product_code=?2 " +
    "AND g.status='approved' AND o.status='approved' LIMIT 1"
  ).bind(orderId, productCode).first();
  if (!row?.account_id) return null;
  const state = await commercialAccessForAccount(env, row.account_id);
  return state.active ? { id: Number(row.account_id), expiresAt: state.expiresAt } : null;
}

export async function revokeSessionsIfNoCommercialAccess(env, accountId) {
  if (!accountId) return false;
  const state = await commercialAccessForAccount(env, accountId);
  if (state.active) return false;
  await env.DB.prepare(
    "UPDATE access_sessions SET revoked_at=COALESCE(revoked_at,datetime('now')) " +
    "WHERE account_id=?1 AND revoked_at IS NULL"
  ).bind(accountId).run();
  return true;
}

// Called only by explicit reviewed migration/QA code, never at startup.
export async function backfillOneReviewedAccount(env, emailHash, productCode) {
  return reconcileCommercialAccess(env, emailHash, productCode);
}
