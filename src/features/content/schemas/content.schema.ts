import { z } from "zod";

export const CONTENT_SCHEMA_VERSION = 1 as const;

export const stableIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ID phải dùng kebab-case ổn định");

export const documentIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Document ID không hợp lệ");

export type FirestoreTimestampValue = {
  readonly seconds: number;
  readonly nanoseconds: number;
};

export const firestoreTimestampSchema = z.custom<FirestoreTimestampValue>(
  (value) => {
    if (value === null || typeof value !== "object") return false;
    const timestamp = value as Partial<FirestoreTimestampValue>;
    return (
      Number.isInteger(timestamp.seconds) &&
      Number.isInteger(timestamp.nanoseconds) &&
      (timestamp.nanoseconds ?? -1) >= 0 &&
      (timestamp.nanoseconds ?? 1_000_000_000) <= 999_999_999
    );
  },
  "Firestore Timestamp không hợp lệ",
);

export const contentStatusSchema = z.enum([
  "draft",
  "in_review",
  "approved",
  "published",
  "retired",
]);

const schemaVersionShape = {
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
};

const mutableDocumentShape = {
  ...schemaVersionShape,
  createdAt: firestoreTimestampSchema,
  updatedAt: firestoreTimestampSchema,
};

const shortTextSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().trim().min(1).max(2_000);
const orderedPositionSchema = z.number().int().nonnegative();

export const languageIdSchema = z.enum(["en", "ja", "zh"]);

export const languageSchema = z
  .object({
    ...mutableDocumentShape,
    id: languageIdSchema,
    nameVi: shortTextSchema,
    nativeName: shortTextSchema,
    locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Z][A-Za-z0-9]{1,7})*$/),
    writingSystems: z.array(stableIdSchema).min(1).max(8),
    direction: z.enum(["ltr", "rtl"]),
    enabled: z.boolean(),
    order: orderedPositionSchema,
  })
  .strict()
  .superRefine((language, context) => {
    if (new Set(language.writingSystems).size !== language.writingSystems.length) {
      context.addIssue({
        code: "custom",
        message: "writingSystems không được trùng nhau",
        path: ["writingSystems"],
      });
    }
  });

export const programSchema = z
  .object({
    ...mutableDocumentShape,
    id: stableIdSchema,
    languageId: languageIdSchema,
    code: stableIdSchema,
    type: z.enum(["general", "exam_prep", "placement"]),
    title: shortTextSchema,
    description: descriptionSchema,
    frameworkCode: stableIdSchema,
    frameworkVersion: z.string().trim().min(1).max(80),
    levelIds: z.array(stableIdSchema).min(1).max(32),
    currentPublishedRevisionId: documentIdSchema.nullable(),
    status: contentStatusSchema,
    order: orderedPositionSchema,
  })
  .strict()
  .superRefine((program, context) => {
    if (new Set(program.levelIds).size !== program.levelIds.length) {
      context.addIssue({
        code: "custom",
        message: "levelIds không được trùng nhau",
        path: ["levelIds"],
      });
    }
  });

export const courseSchema = z
  .object({
    ...mutableDocumentShape,
    id: stableIdSchema,
    programId: stableIdSchema,
    levelId: stableIdSchema,
    title: shortTextSchema,
    description: descriptionSchema,
    coverMediaId: documentIdSchema.nullable(),
    estimatedMinutes: z.number().int().positive().max(100_000),
    currentPublishedRevisionId: documentIdSchema.nullable(),
    status: contentStatusSchema,
    order: orderedPositionSchema,
  })
  .strict();

export const courseRevisionSchema = z
  .object({
    ...schemaVersionShape,
    id: documentIdSchema,
    courseId: stableIdSchema,
    revisionNumber: z.number().int().positive(),
    orderedUnitIds: z.array(stableIdSchema).min(1),
    lessonRevisionMap: z.record(stableIdSchema, documentIdSchema),
    releaseNotes: z.string().trim().max(2_000),
    publishedAt: firestoreTimestampSchema,
    publishedBy: documentIdSchema,
  })
  .strict()
  .superRefine((revision, context) => {
    if (new Set(revision.orderedUnitIds).size !== revision.orderedUnitIds.length) {
      context.addIssue({
        code: "custom",
        message: "orderedUnitIds không được trùng nhau",
        path: ["orderedUnitIds"],
      });
    }
  });

const activityBaseShape = {
  id: stableIdSchema,
  instruction: z.string().trim().min(1).max(500),
  prompt: z.string().trim().min(1).max(2_000),
  skill: stableIdSchema,
  difficulty: stableIdSchema,
  estimatedSeconds: z.number().int().positive().max(3_600),
  required: z.boolean(),
  sourceRefs: z.array(documentIdSchema).min(1).max(32),
};

const choiceOptionSchema = z
  .object({
    id: stableIdSchema,
    text: z.string().trim().min(1).max(500),
  })
  .strict();

const vocabularyEntrySchema = z
  .object({
    lexemeId: documentIdSchema,
    term: shortTextSchema,
    meaningVi: shortTextSchema,
    pronunciation: z.string().trim().min(1).max(200).nullable(),
    example: z.string().trim().min(1).max(1_000).nullable(),
    mediaRefs: z.array(documentIdSchema).max(8),
  })
  .strict();

const gapSchema = z
  .object({
    id: stableIdSchema,
    placeholder: z.string().trim().min(1).max(100),
  })
  .strict();

const gapAnswerSchema = z
  .object({
    gapId: stableIdSchema,
    acceptedAnswers: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
    caseSensitive: z.boolean(),
  })
  .strict();

const tokenSchema = z
  .object({
    id: stableIdSchema,
    text: z.string().trim().min(1).max(100),
  })
  .strict();

const explanationPublicSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("explanation"),
    body: z.string().trim().min(1).max(20_000),
  })
  .strict();

const vocabularyCardPublicSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("vocabulary_card"),
    entries: z.array(vocabularyEntrySchema).min(1).max(30),
  })
  .strict();

const singleChoicePublicSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("single_choice"),
    options: z.array(choiceOptionSchema).min(2).max(8),
  })
  .strict();

const gapFillPublicSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("gap_fill"),
    template: z.string().trim().min(1).max(2_000),
    gaps: z.array(gapSchema).min(1).max(20),
  })
  .strict();

const reorderTokensPublicSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("reorder_tokens"),
    tokens: z.array(tokenSchema).min(2).max(30),
  })
  .strict();

const listeningChoicePublicSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("listening_choice"),
    audioMediaId: documentIdSchema,
    options: z.array(choiceOptionSchema).min(2).max(8),
  })
  .strict();

function addDuplicateIdIssue(
  values: ReadonlyArray<{ id: string }>,
  path: string,
  context: z.core.$RefinementCtx,
) {
  if (new Set(values.map(({ id }) => id)).size !== values.length) {
    context.addIssue({
      code: "custom",
      message: `${path} không được có ID trùng nhau`,
      path: [path],
    });
  }
}

export const publicActivitySchema = z
  .discriminatedUnion("type", [
    explanationPublicSchema,
    vocabularyCardPublicSchema,
    singleChoicePublicSchema,
    gapFillPublicSchema,
    reorderTokensPublicSchema,
    listeningChoicePublicSchema,
  ])
  .superRefine((activity, context) => {
    if ("options" in activity) addDuplicateIdIssue(activity.options, "options", context);
    if ("gaps" in activity) addDuplicateIdIssue(activity.gaps, "gaps", context);
    if ("tokens" in activity) addDuplicateIdIssue(activity.tokens, "tokens", context);
  });

const exactChoiceScoringSchema = z
  .object({
    kind: z.literal("exact_single_choice"),
    correctOptionId: stableIdSchema,
  })
  .strict();

const singleChoiceDraftSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("single_choice"),
    options: z.array(choiceOptionSchema).min(2).max(8),
    scoringDefinition: exactChoiceScoringSchema,
  })
  .strict();

const gapFillDraftSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("gap_fill"),
    template: z.string().trim().min(1).max(2_000),
    gaps: z.array(gapSchema).min(1).max(20),
    scoringDefinition: z
      .object({
        kind: z.literal("accepted_gap_answers"),
        answers: z.array(gapAnswerSchema).min(1).max(20),
      })
      .strict(),
  })
  .strict();

const reorderTokensDraftSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("reorder_tokens"),
    tokens: z.array(tokenSchema).min(2).max(30),
    scoringDefinition: z
      .object({
        kind: z.literal("exact_token_sequence"),
        correctTokenIds: z.array(stableIdSchema).min(2).max(30),
      })
      .strict(),
  })
  .strict();

const listeningChoiceDraftSchema = z
  .object({
    ...activityBaseShape,
    type: z.literal("listening_choice"),
    audioMediaId: documentIdSchema,
    transcript: z.string().trim().min(1).max(10_000),
    options: z.array(choiceOptionSchema).min(2).max(8),
    scoringDefinition: exactChoiceScoringSchema,
  })
  .strict();

export const activityDraftSchema = z
  .discriminatedUnion("type", [
    explanationPublicSchema,
    vocabularyCardPublicSchema,
    singleChoiceDraftSchema,
    gapFillDraftSchema,
    reorderTokensDraftSchema,
    listeningChoiceDraftSchema,
  ])
  .superRefine((activity, context) => {
    if ("options" in activity) {
      addDuplicateIdIssue(activity.options, "options", context);

      if (!activity.options.some(({ id }) => id === activity.scoringDefinition.correctOptionId)) {
        context.addIssue({
          code: "custom",
          message: "correctOptionId phải tồn tại trong options",
          path: ["scoringDefinition", "correctOptionId"],
        });
      }
    }

    if (activity.type === "gap_fill") {
      addDuplicateIdIssue(activity.gaps, "gaps", context);
      const gapIds = new Set(activity.gaps.map(({ id }) => id));
      const answerIds = activity.scoringDefinition.answers.map(({ gapId }) => gapId);

      if (
        new Set(answerIds).size !== answerIds.length ||
        answerIds.length !== gapIds.size ||
        answerIds.some((id) => !gapIds.has(id))
      ) {
        context.addIssue({
          code: "custom",
          message: "Mỗi gap phải có đúng một scoring answer",
          path: ["scoringDefinition", "answers"],
        });
      }
    }

    if (activity.type === "reorder_tokens") {
      addDuplicateIdIssue(activity.tokens, "tokens", context);
      const tokenIds = activity.tokens.map(({ id }) => id);
      const answerIds = activity.scoringDefinition.correctTokenIds;

      if (
        new Set(answerIds).size !== answerIds.length ||
        answerIds.length !== tokenIds.length ||
        answerIds.some((id) => !tokenIds.includes(id))
      ) {
        context.addIssue({
          code: "custom",
          message: "correctTokenIds phải chứa mỗi token đúng một lần",
          path: ["scoringDefinition", "correctTokenIds"],
        });
      }
    }
  });

export const unitDraftSchema = z
  .object({
    ...mutableDocumentShape,
    id: stableIdSchema,
    courseId: stableIdSchema,
    title: shortTextSchema,
    description: descriptionSchema,
    order: orderedPositionSchema,
    status: contentStatusSchema,
  })
  .strict();

export const lessonDraftSchema = z
  .object({
    ...mutableDocumentShape,
    id: stableIdSchema,
    unitId: stableIdSchema,
    title: shortTextSchema,
    summary: descriptionSchema,
    objectives: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
    estimatedMinutes: z.number().int().positive().max(1_440),
    order: orderedPositionSchema,
    activityRefs: z.array(documentIdSchema).min(1).max(100),
    vocabularyRefs: z.array(documentIdSchema).max(200),
    sourceRefs: z.array(documentIdSchema).min(1).max(100),
    status: contentStatusSchema,
    validationReport: z
      .object({
        errors: z.array(z.string().trim().min(1).max(1_000)),
        warnings: z.array(z.string().trim().min(1).max(1_000)),
        validatedAt: firestoreTimestampSchema.nullable(),
      })
      .strict(),
  })
  .strict();

const publishedVocabularySchema = z
  .object({
    lexemeId: documentIdSchema,
    term: shortTextSchema,
    meaningVi: shortTextSchema,
    pronunciation: z.string().trim().min(1).max(200).nullable(),
    example: z.string().trim().min(1).max(1_000).nullable(),
    mediaRefs: z.array(documentIdSchema).max(8),
  })
  .strict();

const mediaManifestEntrySchema = z
  .object({
    id: documentIdSchema,
    storagePath: z.string().trim().min(1).max(1_024),
    contentType: z.string().regex(/^(audio|image)\/[a-z0-9.+-]+$/),
    sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const sourceAttributionSchema = z
  .object({
    id: documentIdSchema,
    title: shortTextSchema,
    publisher: shortTextSchema,
    canonicalUrl: z.url(),
    licenseCode: shortTextSchema,
    licenseUrl: z.url(),
    attributionText: z.string().trim().min(1).max(2_000),
  })
  .strict();

export const publishedLessonRevisionSchema = z
  .object({
    ...schemaVersionShape,
    id: documentIdSchema,
    lessonId: stableIdSchema,
    courseId: stableIdSchema,
    unitId: stableIdSchema,
    programId: stableIdSchema,
    languageId: languageIdSchema,
    revisionNumber: z.number().int().positive(),
    title: shortTextSchema,
    summary: descriptionSchema,
    objectives: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
    estimatedMinutes: z.number().int().positive().max(1_440),
    activities: z.array(publicActivitySchema).min(1).max(100),
    vocabulary: z.array(publishedVocabularySchema).max(200),
    mediaManifest: z.array(mediaManifestEntrySchema).max(200),
    sourceAttributions: z.array(sourceAttributionSchema).min(1).max(100),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    publishedAt: firestoreTimestampSchema,
    publishedBy: documentIdSchema,
  })
  .strict()
  .superRefine((revision, context) => {
    addDuplicateIdIssue(revision.activities, "activities", context);
    addDuplicateIdIssue(revision.mediaManifest, "mediaManifest", context);
    addDuplicateIdIssue(revision.sourceAttributions, "sourceAttributions", context);

    if (
      new Set(revision.vocabulary.map(({ lexemeId }) => lexemeId)).size !==
      revision.vocabulary.length
    ) {
      context.addIssue({
        code: "custom",
        message: "vocabulary không được có lexemeId trùng nhau",
        path: ["vocabulary"],
      });
    }
  });

export const publicLanguageDtoSchema = z
  .object({
    ...schemaVersionShape,
    id: languageIdSchema,
    nameVi: shortTextSchema,
    nativeName: shortTextSchema,
    locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Z][A-Za-z0-9]{1,7})*$/),
    writingSystems: z.array(stableIdSchema).min(1).max(8),
    direction: z.enum(["ltr", "rtl"]),
    enabled: z.boolean(),
    order: orderedPositionSchema,
  })
  .strict();

export const publicProgramDtoSchema = z
  .object({
    ...schemaVersionShape,
    id: stableIdSchema,
    languageId: languageIdSchema,
    code: stableIdSchema,
    type: z.enum(["general", "exam_prep", "placement"]),
    title: shortTextSchema,
    description: descriptionSchema,
    frameworkCode: stableIdSchema,
    frameworkVersion: z.string().trim().min(1).max(80),
    levelIds: z.array(stableIdSchema).min(1).max(32),
    currentPublishedRevisionId: documentIdSchema.nullable(),
    status: contentStatusSchema,
    order: orderedPositionSchema,
  })
  .strict();

export const publicCourseDtoSchema = courseSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type Language = z.infer<typeof languageSchema>;
export type PublicLanguageDto = z.infer<typeof publicLanguageDtoSchema>;
export type Program = z.infer<typeof programSchema>;
export type PublicProgramDto = z.infer<typeof publicProgramDtoSchema>;
export type Course = z.infer<typeof courseSchema>;
export type PublicCourseDto = z.infer<typeof publicCourseDtoSchema>;
export type CourseRevision = z.infer<typeof courseRevisionSchema>;
export type UnitDraft = z.infer<typeof unitDraftSchema>;
export type LessonDraft = z.infer<typeof lessonDraftSchema>;
export type ActivityDraft = z.infer<typeof activityDraftSchema>;
export type PublicActivityDto = z.infer<typeof publicActivitySchema>;
export type SourceAttribution = z.infer<typeof sourceAttributionSchema>;
export type PublishedLessonRevision = z.infer<typeof publishedLessonRevisionSchema>;
