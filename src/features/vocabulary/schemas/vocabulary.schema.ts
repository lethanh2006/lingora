import { z } from "zod";

import {
  documentIdSchema,
  firestoreTimestampSchema,
  stableIdSchema,
} from "../../content/schemas/content.schema.ts";

export const VOCABULARY_SCHEMA_VERSION = 1 as const;

export const vocabularyLanguageSchema = z.enum(["en", "ja", "zh"]);
export const vocabularyAccentSchema = z.enum([
  "emerald",
  "blue",
  "violet",
  "amber",
  "rose",
  "cyan",
]);
export const practiceModeSchema = z.enum(["flashcards", "matching", "fill"]);

const timestampedShape = {
  schemaVersion: z.literal(VOCABULARY_SCHEMA_VERSION),
  createdAt: firestoreTimestampSchema,
  updatedAt: firestoreTimestampSchema,
};

export const vocabularyTopicSchema = z
  .object({
    ...timestampedShape,
    id: stableIdSchema,
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500),
    languageCode: vocabularyLanguageSchema,
    icon: z.string().trim().min(1).max(16),
    accent: vocabularyAccentSchema,
    order: z.number().int().nonnegative().max(10_000),
    isVisible: z.boolean(),
    wordCount: z.number().int().nonnegative().max(500),
  })
  .strict();

export const vocabularyWordSchema = z
  .object({
    ...timestampedShape,
    id: documentIdSchema,
    topicId: stableIdSchema,
    term: z.string().trim().min(1).max(120),
    meaning: z.string().trim().min(1).max(240),
    pronunciation: z.string().trim().max(160).nullable(),
    example: z.string().trim().max(500).nullable(),
    exampleMeaning: z.string().trim().max(500).nullable(),
    imageUrl: z.string().url().max(2_000).nullable(),
    order: z.number().int().nonnegative().max(10_000),
    isVisible: z.boolean(),
  })
  .strict();

export const vocabularyTopicInputSchema = z
  .object({
    title: z.string().trim().min(1, "Tên chủ đề không được để trống").max(120),
    description: z.string().trim().max(500).default(""),
    languageCode: vocabularyLanguageSchema.default("en"),
    icon: z.string().trim().min(1).max(16).default("📚"),
    accent: vocabularyAccentSchema.default("emerald"),
    order: z.number().int().nonnegative().max(10_000).default(0),
    isVisible: z.boolean().default(true),
  })
  .strict();

export const vocabularyWordInputSchema = z
  .object({
    term: z.string().trim().min(1, "Từ vựng không được để trống").max(120),
    meaning: z.string().trim().min(1, "Nghĩa tiếng Việt không được để trống").max(240),
    pronunciation: z.string().trim().max(160).default(""),
    example: z.string().trim().max(500).default(""),
    exampleMeaning: z.string().trim().max(500).default(""),
    imageUrl: z.union([z.literal(""), z.string().url().max(2_000)]).default(""),
    order: z.number().int().nonnegative().max(10_000).default(0),
    isVisible: z.boolean().default(true),
  })
  .strict();

export const topicProgressSchema = z
  .object({
    schemaVersion: z.literal(VOCABULARY_SCHEMA_VERSION),
    topicId: stableIdSchema,
    practicedModes: z.array(practiceModeSchema).max(3),
    sessionsCompleted: z.number().int().nonnegative(),
    correctAnswers: z.number().int().nonnegative(),
    totalAnswers: z.number().int().nonnegative(),
    masteredWordIds: z.array(documentIdSchema).max(500),
    bestScores: z
      .object({
        flashcards: z.number().int().min(0).max(100),
        matching: z.number().int().min(0).max(100),
        fill: z.number().int().min(0).max(100),
      })
      .strict(),
    totalStudySeconds: z.number().int().nonnegative(),
    firstPracticedAt: firestoreTimestampSchema,
    lastPracticedAt: firestoreTimestampSchema,
  })
  .strict();

export const practiceSessionInputSchema = z
  .object({
    topicId: stableIdSchema,
    mode: practiceModeSchema,
    correctAnswers: z.number().int().nonnegative().max(500),
    totalAnswers: z.number().int().positive().max(500),
    studiedWordIds: z.array(documentIdSchema).min(1).max(100),
    masteredWordIds: z.array(documentIdSchema).max(100),
    durationSeconds: z.number().int().min(1).max(7_200),
  })
  .strict()
  .superRefine((session, context) => {
    if (session.correctAnswers > session.totalAnswers) {
      context.addIssue({
        code: "custom",
        message: "Số câu đúng không thể lớn hơn tổng số câu",
        path: ["correctAnswers"],
      });
    }

    const studiedIds = new Set(session.studiedWordIds);
    if (studiedIds.size !== session.studiedWordIds.length) {
      context.addIssue({
        code: "custom",
        message: "Danh sách từ trong phiên không được trùng nhau",
        path: ["studiedWordIds"],
      });
    }
    for (const wordId of session.masteredWordIds) {
      if (!studiedIds.has(wordId)) {
        context.addIssue({
          code: "custom",
          message: "Từ đã thuộc phải nằm trong phiên luyện tập",
          path: ["masteredWordIds"],
        });
        break;
      }
    }
  });

export type VocabularyTopic = z.infer<typeof vocabularyTopicSchema>;
export type VocabularyWord = z.infer<typeof vocabularyWordSchema>;
export type VocabularyTopicInput = z.infer<typeof vocabularyTopicInputSchema>;
export type VocabularyWordInput = z.infer<typeof vocabularyWordInputSchema>;
export type PracticeMode = z.infer<typeof practiceModeSchema>;
export type TopicProgress = z.infer<typeof topicProgressSchema>;
export type PracticeSessionInput = z.infer<typeof practiceSessionInputSchema>;

export type VocabularyTopicDto = Omit<VocabularyTopic, "createdAt" | "updatedAt">;
export type VocabularyWordDto = Omit<VocabularyWord, "createdAt" | "updatedAt">;
export type TopicProgressDto = Omit<TopicProgress, "firstPracticedAt" | "lastPracticedAt">;
