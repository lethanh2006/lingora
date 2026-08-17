import { z } from "zod";
import {
  firestoreTimestampSchema,
  stableIdSchema,
  documentIdSchema,
  contentStatusSchema,
} from "../../content/schemas/content.schema.ts";

export const ASSESSMENT_SCHEMA_VERSION = 1 as const;

export const interactionTypeSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, "Interaction type không hợp lệ");

export const promptBlockSchema = z
  .object({
    type: z.enum(["text", "markdown", "html", "audio", "image"]),
    content: z.string().trim().min(1),
    mediaId: documentIdSchema.nullable().optional(),
  })
  .strict();

export const questionSchema = z
  .object({
    schemaVersion: z.literal(ASSESSMENT_SCHEMA_VERSION),
    id: stableIdSchema,
    latestVersionId: documentIdSchema,
    status: contentStatusSchema,
    createdAt: firestoreTimestampSchema,
    updatedAt: firestoreTimestampSchema,
  })
  .strict();

export const questionVersionSchema = z
  .object({
    schemaVersion: z.literal(ASSESSMENT_SCHEMA_VERSION),
    id: documentIdSchema,
    questionId: stableIdSchema,
    programId: stableIdSchema,
    frameworkVersion: z.string().trim().min(1).max(80),
    levelId: stableIdSchema,
    sectionType: stableIdSchema,
    skill: stableIdSchema,
    interactionType: interactionTypeSchema,
    difficulty: stableIdSchema,
    topicIds: z.array(stableIdSchema),
    objectiveIds: z.array(stableIdSchema),
    promptBlocks: z.array(promptBlockSchema).min(1),
    options: z.array(z.any()),
    mediaRefs: z.array(documentIdSchema),
    scoringDefinition: z.any(),
    explanation: z.string().trim().min(1).max(5000),
    sourceRefs: z.array(documentIdSchema),
    authorUid: documentIdSchema,
    reviewerUid: documentIdSchema.nullable(),
    status: contentStatusSchema,
    version: z.number().int().positive(),
    createdAt: firestoreTimestampSchema,
  })
  .strict();

export const blueprintSlotSchema = z
  .object({
    skill: stableIdSchema,
    interactionTypes: z.array(interactionTypeSchema).min(1),
    difficultyRange: z.array(stableIdSchema).min(1),
    topicConstraints: z.array(stableIdSchema).optional(),
    questionCount: z.number().int().positive(),
    points: z.number().positive(),
  })
  .strict();

export const blueprintSectionSchema = z
  .object({
    id: stableIdSchema,
    title: z.string().trim().min(1).max(200),
    order: z.number().int().nonnegative(),
    durationSeconds: z.number().int().positive(),
    slots: z.array(blueprintSlotSchema).min(1),
  })
  .strict();

export const examBlueprintSchema = z
  .object({
    schemaVersion: z.literal(ASSESSMENT_SCHEMA_VERSION),
    id: stableIdSchema,
    programId: stableIdSchema,
    frameworkVersion: z.string().trim().min(1).max(80),
    levelId: stableIdSchema,
    title: z.string().trim().min(1).max(200),
    sections: z.array(blueprintSectionSchema).min(1),
    durationSeconds: z.number().int().positive(),
    scoringStrategy: z.string().trim().min(1).max(50),
    scoringVersion: z.string().trim().min(1).max(50),
    status: contentStatusSchema,
  })
  .strict();

export const examFormVersionSchema = z
  .object({
    schemaVersion: z.literal(ASSESSMENT_SCHEMA_VERSION),
    id: documentIdSchema,
    blueprintId: stableIdSchema,
    blueprintVersion: z.number().int().positive(),
    orderedQuestionVersionIds: z.array(documentIdSchema).min(1),
    publicSectionSnapshots: z.array(z.any()).min(1),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    status: contentStatusSchema,
    publishedAt: firestoreTimestampSchema,
  })
  .strict();

export const attemptStateSchema = z.enum([
  "in_progress",
  "submitted",
  "expired",
  "graded",
  "invalidated",
]);

export const skillScoreSchema = z
  .object({
    skill: stableIdSchema,
    rawScore: z.number().nonnegative(),
    maxScore: z.number().positive(),
    percent: z.number().min(0).max(100),
  })
  .strict();

export const attemptSchema = z
  .object({
    schemaVersion: z.literal(ASSESSMENT_SCHEMA_VERSION),
    id: documentIdSchema,
    uid: documentIdSchema,
    examFormVersionId: documentIdSchema,
    blueprintId: stableIdSchema,
    programId: stableIdSchema,
    levelId: stableIdSchema,
    state: attemptStateSchema,
    startedAt: firestoreTimestampSchema,
    expiresAt: firestoreTimestampSchema,
    submittedAt: firestoreTimestampSchema.nullable(),
    gradedAt: firestoreTimestampSchema.nullable(),
    currentSectionId: stableIdSchema,
    scoringVersion: z.string().trim().min(1).max(50),
    totalRawScore: z.number().nullable(),
    totalPercent: z.number().min(0).max(100).nullable(),
    skillScores: z.record(stableIdSchema, skillScoreSchema).nullable(),
    questionVersionIds: z.array(documentIdSchema),
    createdAt: firestoreTimestampSchema,
    updatedAt: firestoreTimestampSchema,
  })
  .strict();

export const attemptSectionSchema = z
  .object({
    answers: z.record(documentIdSchema, z.any()),
    flaggedQuestionIds: z.array(documentIdSchema),
    lastSavedAt: firestoreTimestampSchema,
    clientRevision: z.number().int().nonnegative(),
    serverRevision: z.number().int().nonnegative(),
  })
  .strict();

export type Question = z.infer<typeof questionSchema>;
export type QuestionVersion = z.infer<typeof questionVersionSchema>;
export type ExamBlueprint = z.infer<typeof examBlueprintSchema>;
export type ExamFormVersion = z.infer<typeof examFormVersionSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type AttemptSection = z.infer<typeof attemptSectionSchema>;
