import { z } from "zod";
import {
  firestoreTimestampSchema,
  stableIdSchema,
  documentIdSchema,
} from "../../content/schemas/content.schema.ts";

export const LESSON_PROGRESS_SCHEMA_VERSION = 1 as const;
export const DAILY_STATS_SCHEMA_VERSION = 1 as const;

export const lessonProgressStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const masteryStatusSchema = z.enum([
  "not_assessed",
  "needs_review",
  "mastered",
]);

export const activityProgressStateSchema = z
  .object({
    completed: z.boolean(),
    score: z.number().nullable().optional(),
    attempts: z.number().int().nonnegative().optional(),
    lastResponse: z.any().optional(),
    updatedAt: firestoreTimestampSchema.optional(),
  })
  .strict();

export const lessonProgressSchema = z
  .object({
    schemaVersion: z.literal(LESSON_PROGRESS_SCHEMA_VERSION),
    lessonId: stableIdSchema,
    lessonRevisionId: documentIdSchema,
    status: lessonProgressStatusSchema,
    masteryStatus: masteryStatusSchema,
    completedRequiredCount: z.number().int().nonnegative(),
    requiredActivityCount: z.number().int().nonnegative(),
    lastActivityId: stableIdSchema.nullable(),
    boundedActivityState: z.record(stableIdSchema, activityProgressStateSchema).optional(),
    checkpointScore: z.number().nullable(),
    bestCheckpointScore: z.number().nullable(),
    timeSpentSeconds: z.number().int().nonnegative(),
    startedAt: firestoreTimestampSchema,
    completedAt: firestoreTimestampSchema.nullable(),
    lastActivityAt: firestoreTimestampSchema,
  })
  .strict();

export const dailyStatsSchema = z
  .object({
    schemaVersion: z.literal(DAILY_STATS_SCHEMA_VERSION),
    studySeconds: z.number().int().nonnegative(),
    qualifiesForStreak: z.boolean(),
    completedLessonCount: z.number().int().nonnegative(),
    updatedAt: firestoreTimestampSchema,
  })
  .strict();

export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export type ActivityProgressState = z.infer<typeof activityProgressStateSchema>;
export type DailyStats = z.infer<typeof dailyStatsSchema>;
