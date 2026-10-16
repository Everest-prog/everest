// ET-0E P0-1 isolated homologation: real Worker fetch handlers, disposable SQLite,
// signed synthetic Kiwify webhooks, intercepted Resend e-mail. Zero external calls.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";

const schema = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
const migration = await readFile(new URL("../migrations/0002_commercial_entitlements.sql", import.meta.url), "utf8");
const legacySchema = await readFile(new URL("./fixtures/schema_pre_p0.sql", import.meta.url), "utf8");

function createHarness(initialNow = "2026-10-16 12:00:00", oldSchema = false) {
  let now = initialNow;
  const db = new DatabaseSync(":memory:");
  db.exec(oldSchema ? legacySchema : schema);
  const DB = {
    prepare(sql) {
      const stmt = db.prepare(sql.replaceAll("datetime('now')", "datetime('" + now + "')"));
      return {
        bind(...params) {
          return {
            async first() { return stmt.get(...params) || null; },
            async all() { return { results: stmt.all(...params) }; },
            async run() { const result = stmt.run(...params); return { meta: { changes: result.changes } }; }
          };
        },
        async first() { return stmt.get() || null; },
        async all() { return { results: stmt.all() }; },
        async run() { const result = stmt.run(); return { meta: { changes: result.changes } }; }
      };
    }
  };
  const env = {
    DB, ENVIRONMENT:"homologation-isolated", SITE_URL:"https://qa.invalid",
    KIWIFY_WEBHOOK_TOKEN:"synthetic-qa-key-not-a-production-secret",
    KIWIFY_PRECIFICA_PRODUCT_ID:"qa-only-precifica-product",
    RESEND_API_KEY:"fake-api-key-never-sent",
    RESEND_FROM_EMAIL:"Ever.Est QA <noreply@example.invalid>",
    SUPPORT_EMAIL:"support@example.invalid"
  };
  const emails = [];
  const outbound = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url) !== "https://api.resend.com/emails") {
      throw new Error("external_egress_blocked");
    }
    const body = JSON.parse(options.body);
    if (!(body.to || []).every(address => String(address).endsWith("@example.invalid"))) {
      throw new Error("real_email_blocked");
    }
    emails.push(body);
    return new Response(JSON.stringify({ id: "synthetic-message-" + emails.length }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  };
  function clean() { globalThis.fetch = outbound; db.close(); }
  function setNow(next) { now = next; }
  async function post(path, body, headers = {}) {
    const request = new Request("https://qa.invalid" + path, {
      method:"POST",
      headers: { "content-type":"application/json", ...headers },
      body: JSON.stringify(body)
    });
    const response = await worker.fetch(request, env);
    return { status:response.status, body:await response.json() };
  }
  async function webhook(orderId, event, approvedAt = "2026-10-16T11:00:00Z", buyer = "buyer@example.invalid") {
    const payload = {
      webhook_event_type:event, order_id:orderId,
      Product:{ product_id:env.KIWIFY_PRECIFICA_PRODUCT_ID },
      Customer:{ email:buyer },
      Commissions:{ charge_amount:0, currency:"BRL" },
      approved_date:approvedAt,
      updated_at:approvedAt
    };
    const raw = JSON.stringify(payload);
    const signature = createHmac("sha1", env.KIWIFY_WEBHOOK_TOKEN).update(raw).digest("hex");
    const request = new Request("https://qa.invalid/webhooks/kiwify", {
      method:"POST",
      headers:{ "content-type":"application/json", "x-kiwify-signature":signature },
      body:raw
    });
    const response = await worker.fetch(request, env);
    return { status:response.status, body:await response.json() };
  }
  function getActivationToken(position=-1) {
    const text = emails.at(position)?.text || "";
    const link = text.match(/https:\/\/qa\.invalid\/ferramentas\/precifica\/\?activate=([^\s]+)/);
    assert.ok(link, "Synthetic Resend message must contain a QA-origin activation link");
    return link[1];
  }
  return { db, env, emails, clean, setNow, post, webhook, getActivationToken };
}

test("legacy schema migration is compatible with real SQLite and adds no fake entitlements", () => {
  const h=createHarness(undefined,true);
  try {
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM orders").get().n,0);
    h.db.exec(migration);
    const cols=h.db.prepare("PRAGMA table_info(access_sessions)").all().map(r=>r.name);
    assert.ok(cols.includes("account_id"));
    const tables=h.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);
    assert.ok(tables.includes("access_accounts") && tables.includes("access_grants"));
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM access_grants").get().n,0);
  } finally { h.clean(); }
});

test("purchase → Resend QA email → real activation → validation → early renewal → partial refund → chargeback", async () => {
  const h=createHarness();
  try {
    const approved=await h.webhook("qa-order-001", "purchase_approved");
    assert.equal(approved.status,200);
    assert.equal(approved.body.order_status,"approved");
    assert.equal(approved.body.email_sent,true);
    assert.equal(h.emails.length,1);
    let grant=h.db.prepare("SELECT starts_at,ends_at FROM access_grants WHERE status='approved'").get();
    assert.equal(grant.ends_at,"2027-10-16 11:00:00");
    const firstToken=h.getActivationToken();
    const activate=await h.post("/access/activate", {token:firstToken});
    assert.equal(activate.status,200);
    assert.equal(activate.body.commercial_expires_at,"2027-10-16 11:00:00");
    const credential=activate.body.access_token;
    assert.ok(credential.length>20);
    assert.equal((await h.post("/access/activate", {token:firstToken})).status,401);
    const validity=await h.post("/access/validate", {}, { authorization:"Bearer "+credential });
    assert.equal(validity.status,200);
    assert.equal(validity.body.valid,true);
    assert.equal(validity.body.commercial_expires_at,"2027-10-16 11:00:00");

    // Same logical event must not renew twice or send duplicate activation.
    const replay=await h.webhook("qa-order-001", "purchase_approved");
    assert.equal(replay.body.duplicate,true);
    assert.equal(h.emails.length,1);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM access_grants").get().n,1);

    // Simulate a voluntary second order before the contractual expiry.
    h.setNow("2027-10-01 12:00:00");
    const renewal=await h.webhook("qa-order-002", "purchase_approved", "2027-10-01T11:00:00Z");
    assert.equal(renewal.status,200);
    assert.equal(h.emails.length,2);
    const active=await h.post("/access/validate", {}, {authorization:"Bearer "+credential});
    assert.equal(active.status,200);
    assert.equal(active.body.commercial_expires_at,"2028-10-16 11:00:00");

    // Refund ONLY renewal; the original contractual period survives.
    const refund=await h.webhook("qa-order-002","refund", "2027-10-01T11:00:00Z");
    assert.equal(refund.status,200);
    assert.equal(refund.body.order_status,"refunded");
    const afterRefund=await h.post("/access/validate",{}, {authorization:"Bearer "+credential});
    assert.equal(afterRefund.status,200);
    assert.equal(afterRefund.body.commercial_expires_at,"2027-10-16 11:00:00");
    assert.equal(h.db.prepare("SELECT status FROM access_grants WHERE order_id=2").get().status,"refunded");

    // Replayed approval must not resurrect the refunded entitlement.
    assert.equal((await h.webhook("qa-order-002","purchase_approved","2027-10-01T11:00:00Z")).body.duplicate,true);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM access_grants WHERE status='approved'").get().n,1);

    // Refund/chargeback of last supporting term revokes current session.
    const chargeback=await h.webhook("qa-order-001","chargeback");
    assert.equal(chargeback.status,200);
    assert.equal((await h.post("/access/validate",{}, {authorization:"Bearer "+credential})).status,401);
    assert.ok(h.db.prepare("SELECT revoked_at FROM access_sessions WHERE token_hash IS NOT NULL").get().revoked_at);
    const oldSent=h.emails.length;
    const recover=await h.post("/access/recover",{email:"buyer@example.invalid"});
    assert.equal(recover.status,200);
    assert.equal(h.emails.length,oldSent);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM access_grants WHERE status='approved'").get().n,0);
  } finally { h.clean(); }
});

test("expiry is enforced on real validation route even while technical session lives", async () => {
  const h=createHarness();
  try {
    await h.webhook("qa-expiration-001","purchase_approved");
    const activation=await h.post("/access/activate",{token:h.getActivationToken()});
    assert.equal(activation.status,200);
    h.setNow("2027-10-16 11:00:00");
    const expired=await h.post("/access/validate",{}, {authorization:"Bearer "+activation.body.access_token});
    assert.equal(expired.status,401);
    assert.equal(expired.body.reason,"commercial_expired");
    const recover=await h.post("/access/recover",{email:"buyer@example.invalid"});
    assert.equal(recover.status,200);
    assert.equal(h.emails.length,1);
  } finally { h.clean(); }
});

test("webhook invalid HMAC is rejected and cannot grant access", async () => {
  const h=createHarness();
  try {
    const result=await h.post("/webhooks/kiwify",{
      webhook_event_type:"purchase_approved", order_id:"forged-event",
      Product:{product_id:h.env.KIWIFY_PRECIFICA_PRODUCT_ID},
      Customer:{email:"buyer@example.invalid"}
    },{"x-kiwify-signature":"0000000000000000000000000000000000000000"});
    assert.equal(result.status,401);
    assert.equal(h.db.prepare("SELECT count(*) AS n FROM orders").get().n,0);
    assert.equal(h.emails.length,0);
  } finally { h.clean(); }
});

test("recovery remains indistinguishable for unknown buyer",async()=>{
  const h=createHarness();
  try {
    const result=await h.post("/access/recover",{email:"missing@example.invalid"});
    assert.equal(result.status,200);
    assert.match(result.body.message,/Se encontrarmos uma compra válida/);
    assert.equal(h.emails.length,0);
  } finally {h.clean();}
});
