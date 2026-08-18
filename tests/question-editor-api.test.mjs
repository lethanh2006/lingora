import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";

// Simple test to ensure validator and schema matches for questions
import { questionSchema, questionVersionSchema } from "../src/features/assessment/schemas/assessment.schema.ts";

test("question schemas validate expected formats", () => {
  const now = Timestamp.now();
  const mockQuestion = {
    schemaVersion: 1,
    id: "en-grammar-test-1",
    latestVersionId: "qv-en-grammar-test-1-1",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  const parsedQ = questionSchema.parse(mockQuestion);
  assert.equal(parsedQ.id, "en-grammar-test-1");

  const mockVersion = {
    schemaVersion: 1,
    id: "qv-en-grammar-test-1-1",
    questionId: "en-grammar-test-1",
    programId: "general-english-cefr",
    frameworkVersion: "2020",
    levelId: "a1",
    sectionType: "grammar",
    skill: "grammar",
    interactionType: "single_choice",
    difficulty: "a1",
    topicIds: [],
    objectiveIds: [],
    promptBlocks: [
      {
        type: "text",
        content: "What is your name?",
      },
    ],
    options: [
      { id: "opt-1", text: "My name is John" },
    ],
    mediaRefs: [],
    scoringDefinition: { correctOptionId: "opt-1" },
    explanation: "Standard greeting explanation",
    sourceRefs: [],
    authorUid: "user-1",
    reviewerUid: null,
    status: "draft",
    version: 1,
    createdAt: now,
  };

  const parsedV = questionVersionSchema.parse(mockVersion);
  assert.equal(parsedV.version, 1);
  assert.equal(parsedV.interactionType, "single_choice");
});
