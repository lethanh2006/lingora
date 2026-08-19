/**
 * tests/data-retention.test.mjs
 * Kiểm tra Data Retention Cleanup Service
 */
import assert from "node:assert/strict";
import test from "node:test";
import { runDataRetentionCleanup } from "../src/lib/data-retention.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date("2026-08-19T04:00:00Z");
const PAST = (offsetMs) => new Date(NOW.getTime() - offsetMs);
const FUTURE = (offsetMs) => new Date(NOW.getTime() + offsetMs);

/**
 * Tạo mock Firestore với dữ liệu cho collection `idempotencyKeys` và `rateLimits`.
 * Hỗ trợ where("field", "<", date).limit(n).get() và batch.delete().
 */
function makeMockDb({ idempotencyDocs = [], rateLimitDocs = [] } = {}) {
  // Store docs as maps: id -> {ref, data}
  const stores = {
    idempotencyKeys: new Map(idempotencyDocs.map((d) => [d.id, { ...d }])),
    rateLimits: new Map(rateLimitDocs.map((d) => [d.id, { ...d }])),
  };

  const deletedIds = { idempotencyKeys: [], rateLimits: [] };

  return {
    _stores: stores,
    _deletedIds: deletedIds,

    collection(name) {
      const store = stores[name];
      const deleted = deletedIds[name];
      let _whereField = null;
      let _whereValue = null;
      let _limit = Infinity;

      const chain = {
        where(field, _op, value) {
          _whereField = field;
          _whereValue = value;
          return chain;
        },
        limit(n) {
          _limit = n;
          return chain;
        },
        async get() {
          const allDocs = [...store.values()];
          const filtered = allDocs.filter((doc) => {
            if (!_whereField) return true;
            const fieldVal = doc[_whereField];
            // Compare dates: fieldVal < _whereValue
            const fv = fieldVal instanceof Date ? fieldVal : new Date(fieldVal);
            const wv = _whereValue instanceof Date ? _whereValue : new Date(_whereValue);
            return fv < wv;
          });
          const limited = filtered.slice(0, _limit);
          return {
            empty: limited.length === 0,
            size: limited.length,
            docs: limited.map((doc) => ({
              ref: {
                id: doc.id,
                _collectionName: name,
              },
            })),
          };
        },
      };

      return chain;
    },

    batch() {
      const ops = [];
      return {
        delete(ref) {
          ops.push({ type: "delete", ref });
        },
        async commit() {
          for (const op of ops) {
            if (op.type === "delete") {
              const store = stores[op.ref._collectionName];
              const del = deletedIds[op.ref._collectionName];
              store.delete(op.ref.id);
              del.push(op.ref.id);
            }
          }
        },
      };
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("data retention: deletes expired idempotency keys", async () => {
  const db = makeMockDb({
    idempotencyDocs: [
      { id: "key-expired-1", expiresAt: PAST(2 * 3600 * 1000) },  // 2h ago → expired
      { id: "key-expired-2", expiresAt: PAST(1 * 3600 * 1000) },  // 1h ago → expired
      { id: "key-valid",     expiresAt: FUTURE(2 * 3600 * 1000) }, // 2h later → keep
    ],
  });

  const report = await runDataRetentionCleanup(db, NOW);

  assert.equal(report.idempotencyKeysDeleted, 2);
  assert.equal(db._deletedIds.idempotencyKeys.length, 2);
  assert.ok(db._deletedIds.idempotencyKeys.includes("key-expired-1"));
  assert.ok(db._deletedIds.idempotencyKeys.includes("key-expired-2"));
  assert.ok(!db._deletedIds.idempotencyKeys.includes("key-valid"));
});

test("data retention: deletes expired rate limit windows", async () => {
  const db = makeMockDb({
    rateLimitDocs: [
      { id: "rl-old-1", windowEnd: PAST(60 * 1000) },    // 1min ago → expired
      { id: "rl-old-2", windowEnd: PAST(120 * 1000) },   // 2min ago → expired
      { id: "rl-active", windowEnd: FUTURE(30 * 1000) },  // 30s later → keep
    ],
  });

  const report = await runDataRetentionCleanup(db, NOW);

  assert.equal(report.rateLimitsDeleted, 2);
  assert.ok(db._deletedIds.rateLimits.includes("rl-old-1"));
  assert.ok(db._deletedIds.rateLimits.includes("rl-old-2"));
  assert.ok(!db._deletedIds.rateLimits.includes("rl-active"));
});

test("data retention: returns zero counts when nothing is expired", async () => {
  const db = makeMockDb({
    idempotencyDocs: [
      { id: "key-future", expiresAt: FUTURE(3600 * 1000) },
    ],
    rateLimitDocs: [
      { id: "rl-future", windowEnd: FUTURE(60 * 1000) },
    ],
  });

  const report = await runDataRetentionCleanup(db, NOW);

  assert.equal(report.idempotencyKeysDeleted, 0);
  assert.equal(report.rateLimitsDeleted, 0);
});

test("data retention: returns zero counts when collections are empty", async () => {
  const db = makeMockDb();

  const report = await runDataRetentionCleanup(db, NOW);

  assert.equal(report.idempotencyKeysDeleted, 0);
  assert.equal(report.rateLimitsDeleted, 0);
  assert.ok(typeof report.durationMs === "number");
});

test("data retention: report includes durationMs as a non-negative number", async () => {
  const db = makeMockDb({
    idempotencyDocs: [{ id: "k1", expiresAt: PAST(1000) }],
  });

  const report = await runDataRetentionCleanup(db, NOW);

  assert.ok(report.durationMs >= 0);
  assert.equal(typeof report.durationMs, "number");
});
