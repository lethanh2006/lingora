import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import { createProgressService } from "../src/features/progress/progress.service.ts";

function customClone(val) {
  if (val === null || typeof val !== "object") return val;
  if (val.seconds !== undefined && val.nanoseconds !== undefined) {
    return { seconds: val.seconds, nanoseconds: val.nanoseconds };
  }
  if (val.constructor && val.constructor.name === "Timestamp") {
    return { seconds: val.seconds, nanoseconds: val.nanoseconds };
  }
  if (Array.isArray(val)) {
    return val.map(customClone);
  }
  const cloned = {};
  for (const [k, v] of Object.entries(val)) {
    cloned[k] = customClone(v);
  }
  return cloned;
}

function createMockDb(initialData = {}) {
  const store = new Map();
  for (const [key, val] of Object.entries(initialData)) {
    store.set(key, customClone(val));
  }

  const db = {
    store,
    collection(collectionName) {
      return {
        doc(docId) {
          const path = `${collectionName}/${docId}`;
          return {
            path,
            id: docId,
            collection(subCollectionName) {
              const subPathPrefix = `${path}/${subCollectionName}`;
              return {
                doc(subDocId) {
                  const subDocPath = `${subPathPrefix}/${subDocId}`;
                  return {
                    path: subDocPath,
                    id: subDocId,
                    async get() {
                      const data = store.get(subDocPath);
                      return {
                        exists: !!data,
                        id: subDocId,
                        ref: { path: subDocPath },
                        data() {
                          return data ? customClone(data) : undefined;
                        },
                      };
                    },
                    async set(data) {
                      store.set(subDocPath, customClone(data));
                    },
                    async update(data) {
                      const current = store.get(subDocPath) || {};
                      store.set(subDocPath, { ...current, ...data });
                    },
                  };
                },
              };
            },
            async get() {
              const data = store.get(path);
              return {
                exists: !!data,
                id: docId,
                ref: { path },
                data() {
                  return data ? customClone(data) : undefined;
                },
              };
            },
            async set(data) {
              store.set(path, customClone(data));
            },
            async update(data) {
              const current = store.get(path) || {};
              store.set(path, { ...current, ...data });
            },
          };
        },
      };
    },
  };
  return db;
}

test("progress service: getLessonProgress returns null when no progress exists", async () => {
  const db = createMockDb();
  const service = createProgressService(db);
  const progress = await service.getLessonProgress("user1", "lesson1");
  assert.equal(progress, null);
});

test("progress service: updateLessonProgress creates a new document", async () => {
  const db = createMockDb();
  const service = createProgressService(db);
  const now = Timestamp.now();

  const progress = await service.updateLessonProgress("user1", "lesson1", {
    lessonRevisionId: "lessonRev1",
    status: "in_progress",
    lastActivityId: "act1",
    boundedActivityState: {
      act1: {
        completed: true,
        score: 1,
        attempts: 1,
        lastResponse: "response1",
      },
    },
    completedRequiredCount: 1,
    requiredActivityCount: 2,
    timeSpentSeconds: 60,
  });

  assert.equal(progress.lessonId, "lesson1");
  assert.equal(progress.lessonRevisionId, "lessonRev1");
  assert.equal(progress.status, "in_progress");
  assert.equal(progress.completedRequiredCount, 1);
  assert.equal(progress.requiredActivityCount, 2);
  assert.equal(progress.timeSpentSeconds, 60);
  assert.equal(progress.boundedActivityState?.act1.completed, true);
  assert.equal(progress.boundedActivityState?.act1.attempts, 1);

  // Check the document was actually set in the store
  const docPath = "users/user1/lessonProgress/lesson1";
  const stored = db.store.get(docPath);
  assert.ok(stored);
  assert.equal(stored.lessonId, "lesson1");
});

test("progress service: updateLessonProgress updates existing document and merges activity state", async () => {
  const db = createMockDb({
    "users/user1/lessonProgress/lesson1": {
      schemaVersion: 1,
      lessonId: "lesson1",
      lessonRevisionId: "lessonRev1",
      status: "in_progress",
      masteryStatus: "not_assessed",
      completedRequiredCount: 1,
      requiredActivityCount: 2,
      lastActivityId: "act1",
      boundedActivityState: {
        act1: {
          completed: true,
          score: 1,
          attempts: 1,
          lastResponse: "response1",
          updatedAt: Timestamp.now(),
        },
      },
      checkpointScore: null,
      bestCheckpointScore: null,
      timeSpentSeconds: 60,
      startedAt: Timestamp.now(),
      completedAt: null,
      lastActivityAt: Timestamp.now(),
    },
  });

  const service = createProgressService(db);

  const progress = await service.updateLessonProgress("user1", "lesson1", {
    lessonRevisionId: "lessonRev1",
    status: "completed",
    lastActivityId: "act2",
    boundedActivityState: {
      act2: {
        completed: true,
        score: 1,
        attempts: 1,
        lastResponse: "response2",
      },
    },
    completedRequiredCount: 2,
    requiredActivityCount: 2,
    timeSpentSeconds: 40,
  });

  assert.equal(progress.status, "completed");
  assert.equal(progress.completedRequiredCount, 2);
  assert.equal(progress.timeSpentSeconds, 100); // 60 + 40
  assert.equal(progress.boundedActivityState?.act1.completed, true);
  assert.equal(progress.boundedActivityState?.act2.completed, true);
  assert.ok(progress.completedAt);
});
