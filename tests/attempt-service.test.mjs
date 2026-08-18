import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import { createAttemptService } from "../src/features/assessment/services/attempt.service.ts";

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

  function makeCollection(collectionPath) {
    return {
      path: collectionPath,
      doc(docId) {
        const finalId = docId || `mock-id-${Math.random().toString(36).substring(2, 9)}`;
        const docPath = `${collectionPath}/${finalId}`;
        return makeDoc(docPath, finalId);
      },
      where(field, op, val) {
        assert.equal(op, "==");
        const filters = [[field, op, val]];
        let resultLimit = Number.POSITIVE_INFINITY;
        const query = {
          where(f, o, v) {
            assert.equal(o, "==");
            filters.push([f, o, v]);
            return query;
          },
          limit(value) {
            resultLimit = value;
            return query;
          },
          async get() {
            const docs = [];
            for (const [key, item] of store.entries()) {
              // Match if the key is under this collection path
              const parts = key.split("/");
              const id = parts.pop();
              const parentPath = parts.join("/");
              if (parentPath !== collectionPath) continue;

              let matches = true;
              for (const [f, , v] of filters) {
                if (item[f] !== v) {
                  matches = false;
                  break;
                }
              }
              if (matches) {
                docs.push({
                  id,
                  ref: makeDoc(key, id),
                  data() {
                    return customClone(item);
                  },
                });
                if (docs.length >= resultLimit) break;
              }
            }
            return {
              empty: docs.length === 0,
              docs,
            };
          },
        };
        return query;
      },
    };
  }

  function makeDoc(docPath, docId) {
    return {
      path: docPath,
      id: docId,
      collection(subCollectionName) {
        return makeCollection(`${docPath}/${subCollectionName}`);
      },
      async get() {
        const data = store.get(docPath);
        return {
          exists: !!data,
          id: docId,
          ref: this,
          data() {
            return data ? customClone(data) : undefined;
          },
        };
      },
      async set(data) {
        store.set(docPath, customClone(data));
      },
      async update(data) {
        const current = store.get(docPath) || {};
        store.set(docPath, { ...current, ...data });
      },
    };
  }

  return {
    store,
    collection(collectionName) {
      return makeCollection(collectionName);
    },
    async runTransaction(fn) {
      const pendingWrites = [];
      const transaction = {
        async get(ref) {
          return ref.get();
        },
        set(ref, data) {
          pendingWrites.push({ type: "set", path: ref.path, data: customClone(data) });
        },
        update(ref, data) {
          pendingWrites.push({ type: "update", path: ref.path, data: customClone(data) });
        },
      };
      const result = await fn(transaction);

      for (const write of pendingWrites) {
        if (write.type === "set") {
          store.set(write.path, write.data);
          continue;
        }

        const current = store.get(write.path) || {};
        store.set(write.path, { ...current, ...write.data });
      }

      return result;
    },
  };
}

const timestamp = Timestamp.now();

const sampleBlueprint = {
  schemaVersion: 1,
  id: "blueprint-eng-a1",
  programId: "general-english-cefr",
  frameworkVersion: "2020",
  levelId: "a1",
  title: "English A1 Mock Exam",
  sections: [
    {
      id: "reading-sec",
      title: "Reading Comprehension",
      order: 1,
      durationSeconds: 600,
      slots: [
        {
          skill: "reading",
          interactionTypes: ["single_choice"],
          difficultyRange: ["a1"],
          questionCount: 1,
          points: 10,
        },
      ],
    },
  ],
  durationSeconds: 600,
  scoringStrategy: "sum",
  scoringVersion: "1.0.0",
  status: "published",
};

const sampleFormVersion = {
  schemaVersion: 1,
  id: "form-version-1",
  blueprintId: "blueprint-eng-a1",
  blueprintVersion: 1,
  orderedQuestionVersionIds: ["qv-1"],
  publicSectionSnapshots: [
    {
      id: "reading-sec",
      title: "Reading Comprehension",
      order: 1,
      durationSeconds: 600,
      questions: [],
    },
  ],
  checksum: "a".repeat(64),
  status: "published",
  publishedAt: timestamp,
};

const sampleQuestionVersion = {
  schemaVersion: 1,
  id: "qv-1",
  questionId: "q-1",
  programId: "general-english-cefr",
  frameworkVersion: "2020",
  levelId: "a1",
  sectionType: "reading",
  skill: "reading",
  interactionType: "single_choice",
  difficulty: "a1",
  topicIds: ["greetings"],
  objectiveIds: ["obj-1"],
  promptBlocks: [{ type: "text", content: "Hi" }],
  options: [{ id: "hello", text: "Hello" }],
  mediaRefs: [],
  scoringDefinition: { correctOptionId: "hello" },
  explanation: "Correct answer is hello",
  sourceRefs: [],
  authorUid: "author-1",
  reviewerUid: null,
  status: "approved",
  version: 1,
  createdAt: timestamp,
};

test("attempt service: startAttempt creates a new attempt", async () => {
  const db = createMockDb();
  const service = createAttemptService(db);

  const { attempt, formVersion } = await service.startAttempt(
    "user-1",
    sampleBlueprint,
    sampleFormVersion,
  );

  assert.equal(attempt.uid, "user-1");
  assert.equal(attempt.state, "in_progress");
  assert.equal(attempt.blueprintId, "blueprint-eng-a1");
  assert.equal(formVersion.id, "form-version-1");

  // Check section was initialized
  const sectionSnap = db.store.get(`users/user-1/attempts/${attempt.id}/sections/reading-sec`);
  assert.ok(sectionSnap);
  assert.deepEqual(sectionSnap.answers, {});
  assert.equal(sectionSnap.serverRevision, 0);
});

test("attempt service: startAttempt returns active attempt if exists and not expired", async () => {
  const activeAttempt = {
    schemaVersion: 1,
    id: "attempt-active",
    uid: "user-1",
    examFormVersionId: "form-version-1",
    blueprintId: "blueprint-eng-a1",
    programId: "general-english-cefr",
    levelId: "a1",
    state: "in_progress",
    startedAt: timestamp,
    expiresAt: new Timestamp(timestamp.seconds + 600, 0),
    submittedAt: null,
    gradedAt: null,
    currentSectionId: "reading-sec",
    scoringVersion: "1.0.0",
    totalRawScore: null,
    totalPercent: null,
    skillScores: null,
    questionVersionIds: ["qv-1"],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = createMockDb({
    "users/user-1/attempts/attempt-active": activeAttempt,
    "examFormVersions/form-version-1": sampleFormVersion,
  });
  const service = createAttemptService(db);

  const { attempt, formVersion } = await service.startAttempt(
    "user-1",
    sampleBlueprint,
    {
      ...sampleFormVersion,
      id: "form-version-2",
      blueprintVersion: 2,
    },
  );

  assert.equal(attempt.id, "attempt-active");
  assert.equal(attempt.state, "in_progress");
  assert.equal(attempt.examFormVersionId, "form-version-1");
  assert.equal(formVersion.id, "form-version-1");
});

test("attempt service: startAttempt rejects an unrelated or unpublished form", async () => {
  const db = createMockDb();
  const service = createAttemptService(db);

  await assert.rejects(
    service.startAttempt("user-1", sampleBlueprint, {
      ...sampleFormVersion,
      blueprintId: "another-blueprint",
    }),
    /does not belong to the selected blueprint/,
  );
  await assert.rejects(
    service.startAttempt("user-1", sampleBlueprint, {
      ...sampleFormVersion,
      status: "draft",
    }),
    /is not published/,
  );
});

test("attempt service: saveSectionAnswers saves answers and detects stale revisions", async () => {
  const activeAttempt = {
    schemaVersion: 1,
    id: "attempt-active",
    uid: "user-1",
    examFormVersionId: "form-version-1",
    blueprintId: "blueprint-eng-a1",
    programId: "general-english-cefr",
    levelId: "a1",
    state: "in_progress",
    startedAt: timestamp,
    expiresAt: new Timestamp(timestamp.seconds + 600, 0),
    submittedAt: null,
    gradedAt: null,
    currentSectionId: "reading-sec",
    scoringVersion: "1.0.0",
    totalRawScore: null,
    totalPercent: null,
    skillScores: null,
    questionVersionIds: ["qv-1"],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = createMockDb({
    "users/user-1/attempts/attempt-active": activeAttempt,
    "users/user-1/attempts/attempt-active/sections/reading-sec": {
      answers: {},
      flaggedQuestionIds: [],
      lastSavedAt: timestamp,
      clientRevision: 0,
      serverRevision: 0,
    },
  });
  const service = createAttemptService(db);

  // Normal save
  const result = await service.saveSectionAnswers(
    "user-1",
    "attempt-active",
    "reading-sec",
    { "qv-1": { selectedOptionId: "hello" } },
    0
  );

  assert.equal(result.serverRevision, 1);
  assert.deepEqual(result.answers["qv-1"], { selectedOptionId: "hello" });

  // Stale revision save should fail
  await assert.rejects(async () => {
    await service.saveSectionAnswers(
      "user-1",
      "attempt-active",
      "reading-sec",
      { "qv-1": { selectedOptionId: "bye" } },
      0 // should be >= serverRevision (which is now 1)
    );
  }, /Version conflict: client revision is stale/);
});

test("attempt service: saveSectionAnswers rejects when expired", async () => {
  const expiredAttempt = {
    schemaVersion: 1,
    id: "attempt-expired",
    uid: "user-1",
    examFormVersionId: "form-version-1",
    blueprintId: "blueprint-eng-a1",
    programId: "general-english-cefr",
    levelId: "a1",
    state: "in_progress",
    startedAt: timestamp,
    expiresAt: new Timestamp(timestamp.seconds - 600, 0), // Expired 10 minutes ago
    submittedAt: null,
    gradedAt: null,
    currentSectionId: "reading-sec",
    scoringVersion: "1.0.0",
    totalRawScore: null,
    totalPercent: null,
    skillScores: null,
    questionVersionIds: ["qv-1"],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = createMockDb({
    "users/user-1/attempts/attempt-expired": expiredAttempt,
    "users/user-1/attempts/attempt-expired/sections/reading-sec": {
      answers: {},
      flaggedQuestionIds: [],
      lastSavedAt: timestamp,
      clientRevision: 0,
      serverRevision: 0,
    },
  });
  const service = createAttemptService(db);

  await assert.rejects(async () => {
    await service.saveSectionAnswers(
      "user-1",
      "attempt-expired",
      "reading-sec",
      { "qv-1": { selectedOptionId: "hello" } },
      0
    );
  }, /Attempt has expired and cannot accept further updates/);

  const stored = db.store.get("users/user-1/attempts/attempt-expired");
  assert.equal(stored.state, "expired");
  assert.notEqual(stored.submittedAt, null);

  const storedSection = db.store.get(
    "users/user-1/attempts/attempt-expired/sections/reading-sec"
  );
  assert.deepEqual(storedSection.answers, {});
  assert.equal(storedSection.serverRevision, 0);
});

test("attempt service: submitAndGradeAttempt calculates scores correctly", async () => {
  const activeAttempt = {
    schemaVersion: 1,
    id: "attempt-active",
    uid: "user-1",
    examFormVersionId: "form-version-1",
    blueprintId: "blueprint-eng-a1",
    programId: "general-english-cefr",
    levelId: "a1",
    state: "in_progress",
    startedAt: timestamp,
    expiresAt: new Timestamp(timestamp.seconds + 600, 0),
    submittedAt: null,
    gradedAt: null,
    currentSectionId: "reading-sec",
    scoringVersion: "1.0.0",
    totalRawScore: null,
    totalPercent: null,
    skillScores: null,
    questionVersionIds: ["qv-1"],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = createMockDb({
    "users/user-1/attempts/attempt-active": activeAttempt,
    "users/user-1/attempts/attempt-active/sections/reading-sec": {
      answers: {
        "qv-1": { selectedOptionId: "hello" }, // Correct answer
      },
      flaggedQuestionIds: [],
      lastSavedAt: timestamp,
      clientRevision: 1,
      serverRevision: 1,
    },
    "examBlueprints/blueprint-eng-a1": sampleBlueprint,
    "questionVersions/qv-1": sampleQuestionVersion,
  });
  const service = createAttemptService(db);

  const graded = await service.submitAndGradeAttempt("user-1", "attempt-active");

  assert.equal(graded.state, "graded");
  assert.equal(graded.totalRawScore, 10);
  assert.equal(graded.totalPercent, 100);
  assert.deepEqual(graded.skillScores.reading, {
    skill: "reading",
    rawScore: 10,
    maxScore: 10,
    percent: 100,
  });
});
