import { z } from "zod";
import {
  firestoreTimestampSchema,
  stableIdSchema,
  documentIdSchema,
  languageIdSchema,
} from "../../content/schemas/content.schema.ts";

export const REVIEW_ITEM_SCHEMA_VERSION = 1 as const;

export const reviewItemTargetTypeSchema = z.enum(["lexeme", "grammar", "question"]);

export const reviewItemStateSchema = z.enum([
  "new",
  "learning",
  "review",
  "mastered",
  "suspended",
]);

export const reviewItemSchema = z
  .object({
    schemaVersion: z.literal(REVIEW_ITEM_SCHEMA_VERSION),
    id: documentIdSchema,
    uid: documentIdSchema,
    programId: stableIdSchema,
    languageId: languageIdSchema,
    targetType: reviewItemTargetTypeSchema,
    targetId: stableIdSchema,
    state: reviewItemStateSchema,
    dueAt: firestoreTimestampSchema,
    intervalDays: z.number().nonnegative(),
    ease: z.number(),
    correctStreak: z.number().int().nonnegative(),
    lapseCount: z.number().int().nonnegative(),
    lastReviewedAt: firestoreTimestampSchema.nullable(),
    schedulerVersion: z.string().trim().min(1).max(50),
    createdAt: firestoreTimestampSchema,
    updatedAt: firestoreTimestampSchema,
  })
  .strict();

export type ReviewItem = z.infer<typeof reviewItemSchema>;
