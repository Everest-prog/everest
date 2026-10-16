import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import {
  reconcileCommercialAccess,
  commercialAccessForAccount,
  activeAccountForEmail,
  accountForApprovedOrder,
  revokeSessionsIfNoCommercialAccess
} from "../src/commercial-access-db.mjs";

const schema = await readFile(new URL("../schema.sql", import.meta.url), "utf8");

function createD1(now) {
  const db = new DatabaseSync(":memory:");
  db.exec(schema);
  return {
    raw: db,
    prepare(sql) {
      // Freeze SQLite's current time for a reproducible offline integration test.
      const stable = sql.replaceAll("datetime('now')", "datetime('" + now + "')");
      const stmt = db.prepare(stable);
      return {
        bind(...values) {
          return {
            async first() { return stmt.get(...values) || null; },
            async all() { return { results: stmt.all(...values) }; },
            async run() { const result = stmt.run(...values); return { meta: { changes: result.changes } }; }
          };
        }
      };
    }
  };
}
function insert(db, id, status, approvedAt, emailHash = "test_email_hash") {
  db.raw.prepare(
    "INSERT INTO orders (id,provider,provider_order_id,product_code,status,email_hash,approved_at) " +
    "VALUES (?1,'kiwify',?2,'ever_precifica',?3,?4,?5)"
  ).run(id, "order-" + id, status, emailHash, approvedAt);
}

test("one approved purchase creates a 12-month DB grant", async () => {
  const DB = createD1("2026-11-02 12:00:00");
  insert(DB, 1, "approved", "2026-10-16 12:26:00");
  const env = { DB };
  const accountId = await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  const grant = DB.raw.prepare("SELECT starts_at, ends_at FROM access_grants WHERE order_id=1").get();
  assert.equal(grant.starts_at, "2026-10-16 12:26:00");
  assert.equal(grant.ends_at, "2027-10-16 12:26:00");
  assert.deepEqual(await commercialAccessForAccount(env, accountId), {
    active: true, expiresAt: "2027-10-16 12:26:00"
  });
  assert.ok(await accountForApprovedOrder(env, 1, "ever_precifica"));
});

test("early renewal extends a real DB entitlement without extending twice", async () => {
  const DB = createD1("2027-10-02 12:26:00");
  const env = { DB };
  insert(DB, 2, "approved", "2027-10-01 12:26:00");
  insert(DB, 1, "approved", "2026-10-16 12:26:00");
  const id = await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  const grants = DB.raw.prepare("SELECT order_id, starts_at, ends_at FROM access_grants ORDER BY order_id").all();
  assert.equal(grants.length, 2);
  assert.equal(grants[1].starts_at, "2027-10-16 12:26:00");
  assert.equal(grants[1].ends_at, "2028-10-16 12:26:00");
  assert.deepEqual(await commercialAccessForAccount(env, id), {
    active: true, expiresAt: "2028-10-16 12:26:00"
  });
  assert.ok(await activeAccountForEmail(env, "test_email_hash", "ever_precifica"));
});

test("refunding renewal removes only renewal and preserves first purchase", async () => {
  const DB = createD1("2027-10-02 12:26:00");
  const env = { DB };
  insert(DB, 1, "approved", "2026-10-16 12:26:00");
  insert(DB, 2, "approved", "2027-10-01 12:26:00");
  const id = await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  DB.raw.prepare("UPDATE orders SET status='refunded' WHERE id=2").run();
  await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  const refund = DB.raw.prepare("SELECT status,starts_at,ends_at FROM access_grants WHERE order_id=2").get();
  assert.equal(refund.status, "refunded");
  assert.equal(refund.starts_at, null);
  assert.equal(refund.ends_at, null);
  assert.deepEqual(await commercialAccessForAccount(env, id), {
    active: true, expiresAt: "2027-10-16 12:26:00"
  });
  assert.equal(await revokeSessionsIfNoCommercialAccess(env, id), false);
});

test("refunding original preserves a valid renewed term, not the refunded term", async () => {
  const DB = createD1("2027-10-02 12:26:00");
  const env = { DB };
  insert(DB, 1, "approved", "2026-10-16 12:26:00");
  insert(DB, 2, "approved", "2027-10-01 12:26:00");
  const id = await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  DB.raw.prepare("UPDATE orders SET status='refunded' WHERE id=1").run();
  await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  assert.deepEqual(await commercialAccessForAccount(env, id), {
    active: true, expiresAt: "2028-10-01 12:26:00"
  });
  assert.equal(await accountForApprovedOrder(env, 1, "ever_precifica"), null);
  assert.ok(await accountForApprovedOrder(env, 2, "ever_precifica"));
});

test("last refund revokes account sessions", async () => {
  const DB = createD1("2026-11-02 12:00:00");
  const env = { DB };
  insert(DB, 1, "approved", "2026-10-16 12:26:00");
  const id = await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  DB.raw.prepare(
    "INSERT INTO access_sessions (token_hash,order_id,account_id,product_code,expires_at) " +
    "VALUES ('fakehash',1,?1,'ever_precifica','2027-10-16 12:26:00')"
  ).run(id);
  DB.raw.prepare("UPDATE orders SET status='refunded' WHERE id=1").run();
  await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  assert.equal((await commercialAccessForAccount(env, id)).active, false);
  assert.equal(await revokeSessionsIfNoCommercialAccess(env, id), true);
  assert.ok(DB.raw.prepare("SELECT revoked_at FROM access_sessions WHERE account_id=?1").get(id).revoked_at);
});

test("future approved order is not yet an active right", async () => {
  const DB = createD1("2029-12-31 23:00:00");
  const env = { DB };
  insert(DB, 1, "approved", "2030-01-01 00:00:00");
  const id = await reconcileCommercialAccess(env, "test_email_hash", "ever_precifica");
  assert.equal((await commercialAccessForAccount(env, id)).active, false);
});
