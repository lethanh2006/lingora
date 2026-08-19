import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "../src/lib/rate-limiter.ts";

function createMockFirestore() {
  const store = new Map();

  const firestore = {
    collection(name) {
      return {
        doc(docId) {
          const docPath = `${name}/${docId}`;
          return {
            path: docPath,
            id: docId,
          };
        },
      };
    },
    async runTransaction(callback) {
      const transaction = {
        async get(docRef) {
          const data = store.get(docRef.path);
          return {
            exists: data !== undefined,
            data() {
              return data;
            },
          };
        },
        set(docRef, data) {
          store.set(docRef.path, data);
        },
        update(docRef, data) {
          const existing = store.get(docRef.path) || {};
          store.set(docRef.path, { ...existing, ...data });
        },
      };
      return callback(transaction);
    },
    _store: store,
  };

  return firestore;
}

test("rate limiter returns success and decrements remaining counts within window", async () => {
  const db = createMockFirestore();
  const config = { maxRequests: 3, windowSeconds: 2 };

  // Request 1
  const r1 = await checkRateLimit("user-1", "login", config, db);
  assert.equal(r1.success, true);
  assert.equal(r1.remaining, 2);
  assert.equal(r1.limit, 3);
  assert.ok(r1.resetTime instanceof Date);

  // Request 2
  const r2 = await checkRateLimit("user-1", "login", config, db);
  assert.equal(r2.success, true);
  assert.equal(r2.remaining, 1);

  // Request 3
  const r3 = await checkRateLimit("user-1", "login", config, db);
  assert.equal(r3.success, true);
  assert.equal(r3.remaining, 0);

  // Request 4 should fail (too many requests)
  const r4 = await checkRateLimit("user-1", "login", config, db);
  assert.equal(r4.success, false);
  assert.equal(r4.remaining, 0);
});

test("rate limiter resets after window duration expires", async () => {
  const db = createMockFirestore();
  const config = { maxRequests: 2, windowSeconds: 1 };

  // First request
  const r1 = await checkRateLimit("user-2", "search", config, db);
  assert.equal(r1.success, true);
  assert.equal(r1.remaining, 1);

  // Expose resetTime and mock passage of time
  const docPath = `rateLimits/user-2_search`;
  const savedData = db._store.get(docPath);
  assert.ok(savedData);

  // Backdate windowEnd by 2 seconds so it's expired
  savedData.windowEnd = {
    toDate() {
      return new Date(Date.now() - 2000);
    },
  };
  db._store.set(docPath, savedData);

  // Next request should succeed and reset remaining count
  const r2 = await checkRateLimit("user-2", "search", config, db);
  assert.equal(r2.success, true);
  assert.equal(r2.remaining, 1);
});
