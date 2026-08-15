import { z } from "zod";

import {
  firestoreTimestampSchema,
  stableIdSchema,
} from "../../content/schemas/content.schema.ts";

export const ENROLLMENT_SCHEMA_VERSION = 1 as const;

export const enrollmentStatusSchema = z.enum(["active", "paused", "completed"]);

export const enrollmentGoalTypeSchema = z.enum([
  "communication",
  "foundation",
  "exam_prep",
]);

export const createEnrollmentInputSchema = z
  .object({
    programId: stableIdSchema,
  })
  .strict();

export const enrollmentSchema = z
  .object({
    schemaVersion: z.literal(ENROLLMENT_SCHEMA_VERSION),
    programId: stableIdSchema,
    currentCourseId: stableIdSchema.nullable(),
    currentLessonId: stableIdSchema.nullable(),
    targetLevelId: stableIdSchema.nullable(),
    goalType: enrollmentGoalTypeSchema.nullable(),
    dailyGoalMinutes: z.number().int().min(5).max(240),
    status: enrollmentStatusSchema,
    enrolledAt: firestoreTimestampSchema,
    lastActivityAt: firestoreTimestampSchema,
  })
  .strict();

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentInputSchema>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
