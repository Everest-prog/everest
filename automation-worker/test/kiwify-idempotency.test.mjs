import test from "node:test";
import assert from "node:assert/strict";

import {
  isSupportedKiwifyEvent,
  isKiwifyLogicalDuplicate
} from "../src/kiwify-idempotency.mjs";

test("supported Kiwify business events", () => {
  assert.equal(isSupportedKiwifyEvent("purchase_approved"), true);
  assert.equal(isSupportedKiwifyEvent("refund"), true);
  assert.equal(isSupportedKiwifyEvent("chargeback"), true);
  assert.equal(isSupportedKiwifyEvent("unknown"), false);
});

test("purchase replay is duplicate when order is already approved", () => {
  assert.equal(isKiwifyLogicalDuplicate("purchase_approved", "approved"), true);
});

test("purchase replay cannot reactivate a refunded order", () => {
  assert.equal(isKiwifyLogicalDuplicate("purchase_approved", "refunded"), true);
});

test("purchase replay cannot reactivate a chargeback order", () => {
  assert.equal(isKiwifyLogicalDuplicate("purchase_approved", "chargeback"), true);
});

test("first purchase approval is not treated as duplicate", () => {
  assert.equal(isKiwifyLogicalDuplicate("purchase_approved", null), false);
});

test("refund replay stays duplicate in terminal states", () => {
  assert.equal(isKiwifyLogicalDuplicate("refund", "refunded"), true);
  assert.equal(isKiwifyLogicalDuplicate("refund", "chargeback"), true);
});

test("first refund after approval is processable", () => {
  assert.equal(isKiwifyLogicalDuplicate("refund", "approved"), false);
});

test("chargeback replay is duplicate only after chargeback", () => {
  assert.equal(isKiwifyLogicalDuplicate("chargeback", "chargeback"), true);
  assert.equal(isKiwifyLogicalDuplicate("chargeback", "approved"), false);
});
