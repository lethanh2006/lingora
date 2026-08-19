import assert from "node:assert/strict";
import test from "node:test";

import {
  questionSchema,
  questionVersionSchema,
  examBlueprintSchema,
  examFormVersionSchema,
  attemptSchema,
  attemptSectionSchema,
} from "../src/features/assessment/schemas/assessment.schema.ts";
import { sanitizeQuestionVersion } from "../src/features/assessment/services/exam-compiler.ts";

const timestamp = Object.freeze({ seconds: 1_700_000_000, nanoseconds: 0 });

const questionFixture = {
  schemaVersion: 1,
  id: "q-eng-01",
  latestVersionId: "q-version-1",
  status: "published",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const questionVersionFixture = {
  schemaVersion: 1,
  id: "q-version-1",
  questionId: "q-eng-01",
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

const blueprintFixture = {
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

const examFormVersionFixture = {
  schemaVersion: 1,
  id: "form-version-1",
  blueprintId: "blueprint-eng-a1",
  blueprintVersion: 1,
  orderedQuestionVersionIds: ["q-version-1"],
  publicSectionSnapshots: [
    {
      id: "reading-sec",
      title: "Reading Comprehension",
    },
  ],
  checksum: "a".repeat(64),
  status: "published",
  publishedAt: timestamp,
};

const attemptFixture = {
  schemaVersion: 1,
  id: "attempt-1",
  uid: "user-1",
  examFormVersionId: "form-version-1",
  blueprintId: "blueprint-eng-a1",
  programId: "general-english-cefr",
  levelId: "a1",
  state: "in_progress",
  startedAt: timestamp,
  expiresAt: timestamp,
  submittedAt: null,
  gradedAt: null,
  currentSectionId: "reading-sec",
  scoringVersion: "1.0.0",
  totalRawScore: null,
  totalPercent: null,
  skillScores: null,
  questionVersionIds: ["q-version-1"],
  createdAt: timestamp,
  updatedAt: timestamp,
};

const attemptSectionFixture = {
  answers: {
    "q-version-1": { selectedOptionId: "hello" },
  },
  flaggedQuestionIds: [],
  lastSavedAt: timestamp,
  clientRevision: 1,
  serverRevision: 1,
};

test("question schemas validate valid fixtures", () => {
  assert.equal(questionSchema.parse(questionFixture).id, "q-eng-01");
  assert.equal(questionVersionSchema.parse(questionVersionFixture).version, 1);
});

test("blueprint and form schemas validate valid fixtures", () => {
  assert.equal(examBlueprintSchema.parse(blueprintFixture).id, "blueprint-eng-a1");
  assert.equal(examFormVersionSchema.parse(examFormVersionFixture).id, "form-version-1");
});

test("attempt schemas validate valid fixtures", () => {
  assert.equal(attemptSchema.parse(attemptFixture).state, "in_progress");
  assert.equal(attemptSectionSchema.parse(attemptSectionFixture).clientRevision, 1);
});

test("attempt schema rejects invalid states", () => {
  assert.equal(
    attemptSchema.safeParse({
      ...attemptFixture,
      state: "unknown-state",
    }).success,
    false,
  );
});

test("public question snapshots must not leak scoring secrets, explanations, or metadata", () => {
  const publicQuestion = sanitizeQuestionVersion(questionVersionFixture);

  assert.equal(publicQuestion.id, "q-version-1");
  assert.equal(publicQuestion.questionId, "q-eng-01");
  assert.ok(!("scoringDefinition" in publicQuestion));
  assert.ok(!("explanation" in publicQuestion));
  assert.ok(!("authorUid" in publicQuestion));
  assert.ok(!("reviewerUid" in publicQuestion));
});
