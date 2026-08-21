/**
 * tests/idempotency.test.mjs
 * Kiểm tra bộ bảo vệ double-submit (Idempotency Guard)
 */
import assert from "node:assert/strict";
import test from "node:test";
import { checkIdempotency, markIdempotencyDone } from "../src/lib/idempotency.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(docs = {}) {
  const store = { ...docs };

  return {
    collection(name) {
      return {
        doc(id) {
          const fullKey = `${name}/${id}`;
          return {
            id,
            fullKey,
            async update(fields) {
              if (!store[fullKey]) store[fullKey] = {};
              store[fullKey] = { ...store[fullKey], ...fields };
            },
          };
        },
      };
    },
    async runTransaction(fn) {
      const tx = {
        async get(docRef) {
          const data = store[docRef.fullKey] ?? null;
          return {
            exists: !!data,
            data: () => data,
          };
        },
        set(docRef, value) {
          store[docRef.fullKey] = value;
        },
      };
      return fn(tx);
    },
    // expose store for assertions
    _store: store,
  };
}

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 48 * 60 * 60 * 1000); // 48h later
const PAST = new Date(NOW.getTime() - 1000); // 1s before NOW (expired)

// ─── Tests ────────────────────────────────────────────────────────────────────

test("idempotency: new key returns { type: 'new' } and stores a processing record", async () => {
  const db = makeDb();
  const result = await checkIdempotency(db, "key-001", "uid-1", "submit_attempt:attempt-1");
  assert.equal(result.type, "new");
});

test("idempotency: second call with same key while processing returns { type: 'conflict' }", async () => {
  const db = makeDb({
    "idempotencyKeys/key-002": {
      key: "key-002",
      uid: "uid-1",
      action: "submit_attempt:attempt-1",
      status: "processing",
      responseBody: null,
      createdAt: NOW,
      expiresAt: FUTURE,
    },
  });
  const result = await checkIdempotency(db, "key-002", "uid-1", "submit_attempt:attempt-1");
  assert.equal(result.type, "conflict");
});

test("idempotency: completed key returns { type: 'duplicate' } with saved responseBody", async () => {
  const savedBody = { ok: true, attempt: { id: "attempt-1", state: "graded" } };
  const db = makeDb({
    "idempotencyKeys/key-003": {
      key: "key-003",
      uid: "uid-1",
      action: "submit_attempt:attempt-1",
      status: "done",
      responseBody: savedBody,
      createdAt: NOW,
      expiresAt: FUTURE,
    },
  });
  const result = await checkIdempotency(db, "key-003", "uid-1", "submit_attempt:attempt-1");
  assert.equal(result.type, "duplicate");
  assert.deepEqual(result.responseBody, savedBody);
});

test("idempotency: expired key is treated as new (reset)", async () => {
  const db = makeDb({
    "idempotencyKeys/key-004": {
      key: "key-004",
      uid: "uid-1",
      action: "submit_attempt:attempt-1",
      status: "done",
      responseBody: { ok: true },
      createdAt: new Date(NOW.getTime() - 50 * 60 * 60 * 1000),
      expiresAt: PAST, // đã hết hạn
    },
  });
  const result = await checkIdempotency(db, "key-004", "uid-1", "submit_attempt:attempt-1");
  assert.equal(result.type, "new");
});

test("idempotency: key belonging to different user returns conflict", async () => {
  const db = makeDb({
    "idempotencyKeys/key-005": {
      key: "key-005",
      uid: "uid-other",
      action: "submit_attempt:attempt-1",
      status: "processing",
      responseBody: null,
      createdAt: NOW,
      expiresAt: FUTURE,
    },
  });
  const result = await checkIdempotency(db, "key-005", "uid-1", "submit_attempt:attempt-1");
  assert.equal(result.type, "conflict");
});

test("idempotency: markIdempotencyDone updates record to done with responseBody", async () => {
  const db = makeDb({
    "idempotencyKeys/key-006": {
      key: "key-006",
      uid: "uid-1",
      action: "submit",
      status: "processing",
      responseBody: null,
      createdAt: NOW,
      expiresAt: FUTURE,
    },
  });
  await markIdempotencyDone(db, "key-006", { ok: true, attempt: {} });
  assert.equal(db._store["idempotencyKeys/key-006"].status, "done");
  assert.deepEqual(db._store["idempotencyKeys/key-006"].responseBody, { ok: true, attempt: {} });
});
