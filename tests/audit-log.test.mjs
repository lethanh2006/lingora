/**
 * tests/audit-log.test.mjs
 * Kiểm tra Audit Log Service
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  writeAuditLog,
  writeAuditLogInTransaction,
  AUDIT_ACTIONS,
} from "../src/lib/audit-log.ts";

// ─── Mock Firestore ───────────────────────────────────────────────────────────

function makeDb() {
  const written = [];

  return {
    _written: written,
    collection(name) {
      return {
        doc(id) {
          const ref = { _name: name, _id: id ?? crypto.randomUUID() };
          return ref;
        },
        async add(data) {
          written.push({ collection: name, data });
          return { id: "generated-id" };
        },
      };
    },
  };
}

function makeTransaction() {
  const ops = [];
  const tx = {
    _ops: ops,
    create(ref, data) {
      ops.push({ type: "create", ref, data });
    },
  };
  return { tx, ops };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("writeAuditLog: stores a document in auditLogs collection", async () => {
  const db = makeDb();

  await writeAuditLog(db, {
    actorUid: "admin-001",
    action: AUDIT_ACTIONS.LESSON_APPROVE,
    entityType: "lesson",
    entityId: "lesson-eng-01",
    metadata: { fromStatus: "in_review", toStatus: "approved" },
  });

  assert.equal(db._written.length, 1);
  const record = db._written[0];
  assert.equal(record.collection, "auditLogs");
  assert.equal(record.data.actorUid, "admin-001");
  assert.equal(record.data.action, AUDIT_ACTIONS.LESSON_APPROVE);
  assert.equal(record.data.entityType, "lesson");
  assert.equal(record.data.entityId, "lesson-eng-01");
  assert.ok(record.data.createdAt instanceof Date);
});

test("writeAuditLog: sets revisionId when provided", async () => {
  const db = makeDb();

  await writeAuditLog(db, {
    actorUid: "admin-001",
    action: AUDIT_ACTIONS.LESSON_PUBLISH,
    entityType: "lesson",
    entityId: "lesson-ja-01",
    revisionId: "rev-999",
    metadata: { revisionNumber: 3 },
  });

  assert.equal(db._written[0].data.revisionId, "rev-999");
  assert.equal(db._written[0].data.metadata.revisionNumber, 3);
});

test("writeAuditLog: sets revisionId to null when not provided", async () => {
  const db = makeDb();

  await writeAuditLog(db, {
    actorUid: "uid-user",
    action: AUDIT_ACTIONS.ACCOUNT_DELETE,
    entityType: "user",
    entityId: "uid-user",
  });

  assert.equal(db._written[0].data.revisionId, null);
  assert.deepEqual(db._written[0].data.metadata, {});
});

test("writeAuditLog: does not throw even when db.add fails", async () => {
  const badDb = {
    collection() {
      return {
        async add() { throw new Error("Firestore write failed"); },
      };
    },
  };

  // Không được throw
  await assert.doesNotReject(() =>
    writeAuditLog(badDb, {
      actorUid: "uid",
      action: AUDIT_ACTIONS.EXAM_COMPILE,
      entityType: "exam",
      entityId: "blueprint-01",
    })
  );
});

test("writeAuditLogInTransaction: queues a create op on the transaction", () => {
  const db = makeDb();
  const { tx, ops } = makeTransaction();

  writeAuditLogInTransaction(tx, db, {
    actorUid: "admin-002",
    action: AUDIT_ACTIONS.LESSON_REJECT,
    entityType: "lesson",
    entityId: "lesson-zh-01",
    metadata: { comment: "Nội dung chưa đạt" },
  });

  assert.equal(ops.length, 1);
  assert.equal(ops[0].type, "create");
  assert.equal(ops[0].data.actorUid, "admin-002");
  assert.equal(ops[0].data.action, AUDIT_ACTIONS.LESSON_REJECT);
  assert.equal(ops[0].data.metadata.comment, "Nội dung chưa đạt");
});

test("AUDIT_ACTIONS constants are unique strings", () => {
  const values = Object.values(AUDIT_ACTIONS);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, "Mỗi AUDIT_ACTION phải là duy nhất");
});
