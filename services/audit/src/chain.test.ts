import assert from "node:assert/strict";
import { test } from "node:test";
import { appendEntry, GENESIS_DIGEST, verifyChain } from "./chain.js";

test("a freshly built chain verifies as valid", () => {
  const e0 = appendEntry(GENESIS_DIGEST, 0, "trace-1");
  const e1 = appendEntry(e0.chainDigest, 1, "trace-2");
  const e2 = appendEntry(e1.chainDigest, 2, "trace-3");

  const result = verifyChain([e0, e1, e2]);
  assert.deepEqual(result, { valid: true });
});

test("tampering with an early entry's content is detected, even though later digests are internally self-consistent with each other", () => {
  const e0 = appendEntry(GENESIS_DIGEST, 0, "trace-1");
  const e1 = appendEntry(e0.chainDigest, 1, "trace-2");
  const e2 = appendEntry(e1.chainDigest, 2, "trace-3");

  const tampered = { ...e0, content: "trace-1-MODIFIED" }; // digests left as-is, as an attacker who only edits content would do
  const result = verifyChain([tampered, e1, e2]);
  assert.equal(result.valid, false);
  assert.equal(result.brokenAtIndex, 0);
});

test("swapping the order of two entries breaks the chain", () => {
  const e0 = appendEntry(GENESIS_DIGEST, 0, "trace-1");
  const e1 = appendEntry(e0.chainDigest, 1, "trace-2");

  const result = verifyChain([e1, e0]); // reversed
  assert.equal(result.valid, false);
});

test("an empty chain is trivially valid", () => {
  assert.deepEqual(verifyChain([]), { valid: true });
});
