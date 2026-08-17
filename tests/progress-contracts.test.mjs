import assert from "node:assert/strict";
import test from "node:test";

import {
  lessonProgressSchema,
  dailyStatsSchema,
} from "../src/features/progress/schemas/progress.schema.ts";

const timestamp = Object.freeze({ seconds: 1_700_000_000, nanoseconds: 0 });

const progressFixture = {
  schemaVersion: 1,
  lessonId: "hello-and-goodbye",
  lessonRevisionId: "lessonRevision1",
  status: "in_progress",
  masteryStatus: "not_assessed",
  completedRequiredCount: 2,
  requiredActivityCount: 5,
  lastActivityId: "choose-greeting",
  boundedActivityState: {
    "choose-greeting": {
      completed: true,
      score: 1,
      attempts: 1,
      lastResponse: { selectedOptionId: "hello" },
      updatedAt: timestamp,
    },
  },
  checkpointScore: null,
  bestCheckpointScore: null,
  timeSpentSeconds: 120,
  startedAt: timestamp,
  completedAt: null,
  lastActivityAt: timestamp,
};

const dailyStatsFixture = {
  schemaVersion: 1,
  studySeconds: 300,
  qualifiesForStreak: true,
  completedLessonCount: 1,
  updatedAt: timestamp,
};

test("lesson progress schema validates valid fixture", () => {
  const progress = lessonProgressSchema.parse(progressFixture);
  assert.equal(progress.lessonId, "hello-and-goodbye");
  assert.equal(progress.status, "in_progress");
});

test("lesson progress schema rejects invalid structures", () => {
  assert.equal(
    lessonProgressSchema.safeParse({
      ...progressFixture,
      status: "unknown_status",
    }).success,
    false,
  );

  assert.equal(
    lessonProgressSchema.safeParse({
      ...progressFixture,
      timeSpentSeconds: -10,
    }).success,
    false,
  );
});

test("daily stats schema validates valid fixture and rejects invalid", () => {
  const stats = dailyStatsSchema.parse(dailyStatsFixture);
  assert.equal(stats.studySeconds, 300);
  assert.equal(
    dailyStatsSchema.safeParse({
      ...dailyStatsFixture,
      studySeconds: -1,
    }).success,
    false,
  );
});
