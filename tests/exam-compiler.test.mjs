import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import {
  createExamCompiler,
  sanitizeQuestionVersion,
  computeFormChecksum,
} from "../src/features/assessment/services/exam-compiler.ts";

function createMockDb(initialData = {}) {
  const store = new Map();
  for (const [key, val] of Object.entries(initialData)) {
    store.set(key, val);
  }

  const db = {
    collection(collectionName) {
      return {
        doc(docId) {
          const finalId = docId || `mock-id-${Math.random().toString(36).substring(2, 9)}`;
          const path = `${collectionName}/${finalId}`;
          return {
            path,
            id: finalId,
          };
        },
        where(field, op, val) {
          // A simple chainable mock where query
          const filters = [[field, op, val]];
          const query = {
            where(f, o, v) {
              filters.push([f, o, v]);
              return query;
            },
            async get() {
              // Find matching items in store
              const docs = [];
              for (const [key, item] of store.entries()) {
                if (!key.startsWith(`${collectionName}/`)) continue;
                let matches = true;
                for (const [f, o, v] of filters) {
                  if (item[f] !== v) {
                    matches = false;
                    break;
                  }
                }
                if (matches) {
                  docs.push({
                    id: key.split("/")[1],
                    data() {
                      return item;
                    },
                  });
                }
              }
              return { docs };
            },
          };
          return query;
        },
      };
    },
  };
  return db;
}

const timestamp = Timestamp.now();

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
};

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

test("exam-compiler: sanitizeQuestionVersion removes secrets and metadata", () => {
  const sanitized = sanitizeQuestionVersion(sampleQuestionVersion);

  assert.equal(sanitized.id, "qv-1");
  assert.equal(sanitized.questionId, "q-1");
  assert.equal(sanitized.interactionType, "single_choice");
  assert.deepEqual(sanitized.options, [
    { id: "hello", text: "Hello" },
    { id: "bye", text: "Goodbye" },
  ]);
  assert.equal(sanitized.scoringDefinition, undefined);
  assert.equal(sanitized.explanation, undefined);
  assert.equal(sanitized.sourceRefs, undefined);
  assert.equal(sanitized.authorUid, undefined);
});

test("exam-compiler: compileExamForm compiles a valid blueprint", async () => {
  const db = createMockDb({
    "questionVersions/qv-1": sampleQuestionVersion,
  });
  const compiler = createExamCompiler(db);

  const form = await compiler.compileExamForm(sampleBlueprint, 1);

  assert.equal(form.blueprintId, "blueprint-eng-a1");
  assert.equal(form.blueprintVersion, 1);
  assert.deepEqual(form.orderedQuestionVersionIds, ["qv-1"]);
  assert.equal(form.publicSectionSnapshots.length, 1);
  assert.equal(form.publicSectionSnapshots[0].id, "reading-sec");
  assert.equal(form.publicSectionSnapshots[0].questions.length, 1);
  assert.equal(form.publicSectionSnapshots[0].questions[0].id, "qv-1");

  // Check correct checksum calculation
  const expectedChecksum = computeFormChecksum({
    blueprintId: sampleBlueprint.id,
    blueprintVersion: 1,
    orderedQuestionVersionIds: ["qv-1"],
    publicSectionSnapshots: form.publicSectionSnapshots,
  });
  assert.equal(form.checksum, expectedChecksum);
});

test("exam-compiler: compileExamForm throws when candidates are insufficient", async () => {
  const db = createMockDb(); // No questions in DB
  const compiler = createExamCompiler(db);

  await assert.rejects(async () => {
    await compiler.compileExamForm(sampleBlueprint, 1);
  }, /Không đủ câu hỏi trong ngân hàng câu hỏi/);
});
