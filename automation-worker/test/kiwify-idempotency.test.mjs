import test from "node:test";
import assert from "node:assert/strict";

import {
  isSupportedKiwifyEvent,
  decideKiwifyEvent
} from "../src/kiwify-idempotency.mjs";

test("supported Kiwify business events", () => {
  assert.equal(isSupportedKiwifyEvent("purchase_approved"), true);
  assert.equal(isSupportedKiwifyEvent("refund"), true);
  assert.equal(isSupportedKiwifyEvent("chargeback"), true);
  assert.equal(isSupportedKiwifyEvent("unknown"), false);
});

test("processed purchase replay is duplicate", () => {
  assert.equal(decideKiwifyEvent("purchase_approved", "approved", "processed"), "duplicate");
});

test("purchase replay cannot reactivate a refunded order", () => {
  assert.equal(decideKiwifyEvent("purchase_approved", "refunded", "failed"), "duplicate");
  assert.equal(decideKiwifyEvent("purchase_approved", "refunded", null), "duplicate");
});

test("purchase replay cannot reactivate a chargeback order", () => {
  assert.equal(decideKiwifyEvent("purchase_approved", "chargeback", "failed"), "duplicate");
});

test("failed purchase processing can retry while order is still approved", () => {
  assert.equal(decideKiwifyEvent("purchase_approved", "approved", "failed"), "retry");
});

test("legacy approved order without logical receipt is duplicate", () => {
  assert.equal(decideKiwifyEvent("purchase_approved", "approved", null), "duplicate");
});

test("first purchase approval is processable", () => {
  assert.equal(decideKiwifyEvent("purchase_approved", null, null), "process");
});

test("refund replay stays duplicate in terminal states", () => {
  assert.equal(decideKiwifyEvent("refund", "refunded", "processed"), "duplicate");
  assert.equal(decideKiwifyEvent("refund", "chargeback", null), "duplicate");
});

test("first refund after approval is processable", () => {
  assert.equal(decideKiwifyEvent("refund", "approved", null), "process");
});

test("failed webhook receipt is retryable when business state is not terminal", () => {
  assert.equal(decideKiwifyEvent("refund", "approved", "failed"), "retry");
  assert.equal(decideKiwifyEvent("chargeback", "approved", "failed"), "retry");
});

test("received receipt is treated as concurrent duplicate", () => {
  assert.equal(decideKiwifyEvent("purchase_approved", null, "received"), "duplicate");
});
