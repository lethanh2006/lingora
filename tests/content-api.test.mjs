import assert from "node:assert/strict";
import test from "node:test";
import {
  courseSchema,
  unitDraftSchema,
  lessonDraftSchema,
} from "../src/features/content/schemas/content.schema.ts";

const timestamp = Object.freeze({ seconds: 1_700_000_000, nanoseconds: 0 });

test("course schema validates fields correctly", () => {
  const validCourse = {
    schemaVersion: 1,
    id: "en-basics",
    programId: "general-english-cefr",
    levelId: "a1",
    title: "English Basics",
    description: "Learn fundamental English structures and vocabulary.",
    coverMediaId: null,
    estimatedMinutes: 360,
    status: "draft",
    order: 0,
    currentPublishedRevisionId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const parsed = courseSchema.parse(validCourse);
  assert.equal(parsed.id, "en-basics");
  assert.equal(parsed.status, "draft");
});

test("unit schema validates fields correctly", () => {
  const validUnit = {
    schemaVersion: 1,
    id: "en-basics-u1",
    courseId: "en-basics",
    title: "Unit 1: Greetings",
    description: "Learn how to greet others.",
    order: 0,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const parsed = unitDraftSchema.parse(validUnit);
  assert.equal(parsed.id, "en-basics-u1");
});

test("lesson schema validates fields correctly", () => {
  const validLesson = {
    schemaVersion: 1,
    id: "en-basics-u1-l1",
    unitId: "en-basics-u1",
    title: "Lesson 1: Saying Hello",
    summary: "Introducing yourself and greeting people.",
    objectives: ["Say hello", "Understand basic greetings"],
    estimatedMinutes: 15,
    order: 0,
    activityRefs: ["act-1", "act-2"],
    vocabularyRefs: ["lex-1"],
    sourceRefs: ["src-1"],
    status: "draft",
    validationReport: {
      errors: [],
      warnings: [],
      validatedAt: null,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const parsed = lessonDraftSchema.parse(validLesson);
  assert.equal(parsed.id, "en-basics-u1-l1");
  assert.deepEqual(parsed.activityRefs, ["act-1", "act-2"]);
});
