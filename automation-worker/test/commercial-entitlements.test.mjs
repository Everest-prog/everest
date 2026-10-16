import test from "node:test";
import assert from "node:assert/strict";
import {
  addCalendarMonths,
  toSqlUtc,
  scheduleCommercialGrants,
  findCommercialAccess
} from "../src/commercial-entitlements.mjs";

const order = (id, time, status = "approved") => ({ id, approved_at: time, status });

test("12 calendar months, not fixed 365 days; UTC timezone normalization", () => {
  assert.equal(addCalendarMonths("2026-10-16 12:26:00"), "2027-10-16 12:26:00");
  assert.equal(addCalendarMonths("2027-03-01T15:45:00-03:00"), "2028-03-01 18:45:00");
  assert.equal(addCalendarMonths("2028-02-29T10:00:00Z"), "2029-02-28 10:00:00");
  assert.equal(toSqlUtc("2026-10-16T09:26:00-03:00"), "2026-10-16 12:26:00");
});

test("initial order creates one fixed term and is not extended by activation", () => {
  const schedule = scheduleCommercialGrants([order(1, "2026-10-16 12:26:00")]);
  assert.deepEqual(schedule, [{
    orderId: 1,
    approvedAt: "2026-10-16 12:26:00",
    startsAt: "2026-10-16 12:26:00",
    endsAt: "2027-10-16 12:26:00"
  }]);
  assert.deepEqual(findCommercialAccess(schedule, "2027-10-16 12:25:59"),
    { active: true, expiresAt: "2027-10-16 12:26:00" });
  assert.deepEqual(findCommercialAccess(schedule, "2027-10-16 12:26:00"),
    { active: false, expiresAt: null });
});

test("early renewal preserves paid time and extends full 12 months", () => {
  const result = scheduleCommercialGrants([
    order(2, "2027-10-01 12:26:00"),
    order(1, "2026-10-16 12:26:00")
  ]);
  assert.equal(result[0].orderId, 1);
  assert.equal(result[1].startsAt, "2027-10-16 12:26:00");
  assert.equal(result[1].endsAt, "2028-10-16 12:26:00");
  assert.deepEqual(findCommercialAccess(result, "2027-10-02 12:26:00"), {
    active: true, expiresAt: "2028-10-16 12:26:00"
  });
});

test("late renewal starts from its own approval; lapse stays expired", () => {
  const result = scheduleCommercialGrants([
    order(1, "2026-10-16 12:26:00"),
    order(2, "2027-11-03 12:26:00")
  ]);
  assert.equal(result[1].startsAt, "2027-11-03 12:26:00");
  assert.equal(result[1].endsAt, "2028-11-03 12:26:00");
  assert.equal(findCommercialAccess(result, "2027-10-20 12:26:00").active, false);
  assert.equal(findCommercialAccess(result, "2027-11-04 12:26:00").active, true);
});

test("refund removes only refunded term and recalculates surviving access", () => {
  const rows = [
    order(1, "2026-10-16 12:26:00"),
    order(2, "2027-10-01 12:26:00"),
  ];
  const before = scheduleCommercialGrants(rows);
  assert.equal(before[1].endsAt, "2028-10-16 12:26:00");
  rows[1].status = "refunded";
  const onlyOriginal = scheduleCommercialGrants(rows);
  assert.equal(onlyOriginal.length, 1);
  assert.equal(onlyOriginal[0].endsAt, "2027-10-16 12:26:00");
  rows[1].status = "approved";
  rows[0].status = "chargeback";
  const onlyRenewal = scheduleCommercialGrants(rows);
  assert.equal(onlyRenewal.length, 1);
  assert.equal(onlyRenewal[0].startsAt, "2027-10-01 12:26:00");
  assert.equal(onlyRenewal[0].endsAt, "2028-10-01 12:26:00");
  assert.equal(findCommercialAccess(onlyRenewal, "2027-10-02 12:26:00").active, true);
  rows[1].status = "refunded";
  assert.equal(findCommercialAccess(scheduleCommercialGrants(rows), "2027-10-02 12:26:00").active, false);
});

test("future-dated approval does not grant current access", () => {
  const schedule = scheduleCommercialGrants([order(1, "2030-01-01 00:00:00")]);
  assert.deepEqual(findCommercialAccess(schedule, "2029-12-31 23:59:59"), {
    active: false, expiresAt: null
  });
});

test("duplicated grants and invalid timestamps fail, not extend rights", () => {
  assert.throws(() => scheduleCommercialGrants([
    order(1, "2026-01-01 00:00:00"),
    order(1, "2026-01-02 00:00:00")
  ]), /duplicate order/);
  assert.throws(() => scheduleCommercialGrants([
    order(1, "nonsense")
  ]), /invalid approval/);
});
