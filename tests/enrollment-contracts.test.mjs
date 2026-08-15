import assert from "node:assert/strict";
import test from "node:test";

import { Timestamp } from "firebase-admin/firestore";

import {
  createEnrollmentInputSchema,
  enrollmentSchema,
} from "../src/features/enrollment/schemas/enrollment.schema.ts";

test("create enrollment input only accepts a stable program ID", () => {
  assert.deepEqual(createEnrollmentInputSchema.parse({ programId: "general-english-cefr" }), {
    programId: "general-english-cefr",
  });
  assert.equal(
    createEnrollmentInputSchema.safeParse({
      programId: "general-english-cefr",
      userId: "another-user",
    }).success,
    false,
  );
  assert.equal(createEnrollmentInputSchema.safeParse({ programId: "../admin" }).success, false);
});

test("enrollment contract validates bounded learner state", () => {
  const timestamp = Timestamp.fromMillis(1_700_000_000_000);
  const enrollment = enrollmentSchema.parse({
    schemaVersion: 1,
    programId: "general-english-cefr",
    currentCourseId: null,
    currentLessonId: null,
    targetLevelId: null,
    goalType: null,
    dailyGoalMinutes: 15,
    status: "active",
    enrolledAt: timestamp,
    lastActivityAt: timestamp,
  });

  assert.equal(enrollment.status, "active");
  assert.equal(
    enrollmentSchema.safeParse({ ...enrollment, dailyGoalMinutes: 10_000 }).success,
    false,
  );
});
