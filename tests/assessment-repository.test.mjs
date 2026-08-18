import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import { createAssessmentRepository } from "../src/features/assessment/assessment.repository.ts";

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
        where(field, operator, value) {
          assert.equal(operator, "==");
          return {
            limit(limitValue) {
              return {
                async get() {
                  const docs = [...store.entries()]
                    .filter(
                      ([path, data]) =>
                        path.startsWith(`${collectionName}/`) &&
                        path.split("/").length === 2 &&
                        data[field] === value,
                    )
                    .slice(0, limitValue)
                    .map(([path, data]) => ({
                      id: path.split("/")[1],
                      ref: { path },
                      data() {
                        return customClone(data);
                      },
                    }));
                  return { empty: docs.length === 0, docs };
                },
              };
            },
          };
        },
        doc(docId) {
          const finalId = docId || `mock-id-${Math.random().toString(36).substring(2, 9)}`;
          const path = `${collectionName}/${finalId}`;
          return {
            path,
            id: finalId,
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
                id: finalId,
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
    async runTransaction(fn) {
      const transaction = {
        async get(ref) {
          return ref.get();
        },
        set(ref, data) {
          ref.set(data);
        },
        update(ref, data) {
          ref.update(data);
        },
      };
      return fn(transaction);
    },
  };
  return db;
}

const timestamp = Timestamp.now();

const sampleQuestionInput = {
  programId: "general-english-cefr",
  frameworkVersion: "2020",
  levelId: "a1",
  sectionType: "reading",
  skill: "reading",
  interactionType: "single_choice",
  difficulty: "a1",
  topicIds: ["greetings"],
  objectiveIds: ["obj-1"],
  promptBlocks: [
    {
      type: "text",
      content: "Choose the correct greeting.",
    },
  ],
  options: [
    { id: "hello", text: "Hello" },
    { id: "bye", text: "Goodbye" },
  ],
  mediaRefs: [],
  scoringDefinition: {
    correctOptionId: "hello",
  },
  explanation: "Hello is the appropriate greeting.",
  sourceRefs: ["source-1"],
  authorUid: "author-1",
  reviewerUid: "reviewer-1",
  status: "approved",
};

const sampleBlueprintInput = {
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
          questionCount: 5,
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

test("assessment repository: getQuestion returns null when question does not exist", async () => {
  const db = createMockDb();
  const repo = createAssessmentRepository(db);
  const q = await repo.getQuestion("q-1");
  assert.equal(q, null);
});

test("assessment repository: createQuestion creates question and question version", async () => {
  const db = createMockDb();
  const repo = createAssessmentRepository(db);

  const { question, version } = await repo.createQuestion("q-1", sampleQuestionInput, timestamp);

  assert.equal(question.id, "q-1");
  assert.equal(question.latestVersionId, version.id);
  assert.equal(question.status, "approved");
  assert.equal(version.questionId, "q-1");
  assert.equal(version.version, 1);

  // Check store contents
  const storedQuestion = db.store.get(`questions/q-1`);
  assert.ok(storedQuestion);
  assert.equal(storedQuestion.latestVersionId, version.id);

  const storedVersion = db.store.get(`questionVersions/${version.id}`);
  assert.ok(storedVersion);
  assert.equal(storedVersion.version, 1);
});

test("assessment repository: createQuestion throws when question already exists", async () => {
  const db = createMockDb({
    "questions/q-1": {
      schemaVersion: 1,
      id: "q-1",
      latestVersionId: "v-1",
      status: "approved",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });
  const repo = createAssessmentRepository(db);

  await assert.rejects(async () => {
    await repo.createQuestion("q-1", sampleQuestionInput, timestamp);
  }, /Question already exists/);
});

test("assessment repository: updateQuestion increments version and updates question", async () => {
  const db = createMockDb({
    "questions/q-1": {
      schemaVersion: 1,
      id: "q-1",
      latestVersionId: "v-1",
      status: "approved",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    "questionVersions/v-1": {
      schemaVersion: 1,
      id: "v-1",
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
      promptBlocks: [
        {
          type: "text",
          content: "Choose the correct greeting.",
        },
      ],
      options: [
        { id: "hello", text: "Hello" },
        { id: "bye", text: "Goodbye" },
      ],
      mediaRefs: [],
      scoringDefinition: {
        correctOptionId: "hello",
      },
      explanation: "Hello is the appropriate greeting.",
      sourceRefs: ["source-1"],
      authorUid: "author-1",
      reviewerUid: "reviewer-1",
      status: "approved",
      version: 1,
      createdAt: timestamp,
    },
  });
  const repo = createAssessmentRepository(db);

  const updatedInput = {
    ...sampleQuestionInput,
    explanation: "Updated explanation.",
  };

  const { question, version } = await repo.updateQuestion("q-1", updatedInput, timestamp);

  assert.equal(question.latestVersionId, version.id);
  assert.equal(version.version, 2);
  assert.equal(version.explanation, "Updated explanation.");

  const storedQuestion = db.store.get(`questions/q-1`);
  assert.equal(storedQuestion.latestVersionId, version.id);

  const storedVersion = db.store.get(`questionVersions/${version.id}`);
  assert.equal(storedVersion.version, 2);
});

test("assessment repository: saveBlueprint and getBlueprint", async () => {
  const db = createMockDb();
  const repo = createAssessmentRepository(db);

  const saved = await repo.saveBlueprint("blueprint-1", sampleBlueprintInput);
  assert.equal(saved.id, "blueprint-1");

  const fetched = await repo.getBlueprint("blueprint-1");
  assert.ok(fetched);
  assert.equal(fetched.title, "English A1 Mock Exam");
});

test("assessment repository: listPublishedBlueprints excludes draft exams", async () => {
  const db = createMockDb({
    "examBlueprints/blueprint-published": {
      ...sampleBlueprintInput,
      schemaVersion: 1,
      id: "blueprint-published",
    },
    "examBlueprints/blueprint-draft": {
      ...sampleBlueprintInput,
      schemaVersion: 1,
      id: "blueprint-draft",
      status: "draft",
    },
  });
  const repo = createAssessmentRepository(db);

  const blueprints = await repo.listPublishedBlueprints();

  assert.deepEqual(blueprints.map(({ id }) => id), ["blueprint-published"]);
});

test("assessment repository: getPublishedBlueprint hides draft exams", async () => {
  const db = createMockDb({
    "examBlueprints/blueprint-published": {
      ...sampleBlueprintInput,
      schemaVersion: 1,
      id: "blueprint-published",
    },
    "examBlueprints/blueprint-draft": {
      ...sampleBlueprintInput,
      schemaVersion: 1,
      id: "blueprint-draft",
      status: "draft",
    },
  });
  const repo = createAssessmentRepository(db);

  const published = await repo.getPublishedBlueprint("blueprint-published");
  const draft = await repo.getPublishedBlueprint("blueprint-draft");

  assert.equal(published?.id, "blueprint-published");
  assert.equal(draft, null);
});
