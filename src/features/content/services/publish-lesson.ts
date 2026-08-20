import "server-only";

import { createHash } from "node:crypto";

import {
  activityDraftSchema,
  CONTENT_SCHEMA_VERSION,
  lessonDraftSchema,
  publishedLessonRevisionSchema,
  sourceAttributionSchema,
  type ActivityDraft,
  type LessonDraft,
  type PublishedLessonRevision,
  type PublicActivityDto,
  type SourceAttribution,
} from "../schemas/content.schema.ts";

export const PUBLISHED_LESSON_MAX_BYTES = 500 * 1024;

type PublishedVocabulary = PublishedLessonRevision["vocabulary"][number];
type MediaManifestEntry = PublishedLessonRevision["mediaManifest"][number];

export type PublishLessonInput = {
  revisionId: string;
  revisionNumber: number;
  publishedAt: PublishedLessonRevision["publishedAt"];
  publishedBy: string;
  lesson: LessonDraft;
  courseId: string;
  programId: string;
  languageId: PublishedLessonRevision["languageId"];
  activities: ActivityDraft[];
  vocabulary: PublishedVocabulary[];
  mediaManifest: MediaManifestEntry[];
  sourceAttributions: SourceAttribution[];
};

export type PublishValidationCode =
  | "activity_refs_mismatch"
  | "draft_has_validation_errors"
  | "draft_not_approved"
  | "missing_media"
  | "missing_source"
  | "missing_vocabulary"
  | "snapshot_too_large";

export class PublishValidationError extends Error {
  readonly code: PublishValidationCode;

  constructor(code: PublishValidationCode, message: string) {
    super(message);
    this.name = "PublishValidationError";
    this.code = code;
  }
}

function publicActivityBase(activity: ActivityDraft) {
  return {
    id: activity.id,
    instruction: activity.instruction,
    prompt: activity.prompt,
    skill: activity.skill,
    difficulty: activity.difficulty,
    estimatedSeconds: activity.estimatedSeconds,
    required: activity.required,
    sourceRefs: activity.sourceRefs,
  };
}

export function sanitizePublishedActivity(input: ActivityDraft): PublicActivityDto {
  const activity = activityDraftSchema.parse(input);
  const base = publicActivityBase(activity);

  switch (activity.type) {
    case "explanation":
      return { ...base, type: activity.type, body: activity.body };
    case "vocabulary_card":
      return { ...base, type: activity.type, entries: activity.entries };
    case "single_choice":
      return {
        ...base,
        type: activity.type,
        options: activity.options,
        scoringDefinition: activity.scoringDefinition,
      };
    case "gap_fill":
      return {
        ...base,
        type: activity.type,
        template: activity.template,
        gaps: activity.gaps,
        scoringDefinition: activity.scoringDefinition,
      };
    case "reorder_tokens":
      return {
        ...base,
        type: activity.type,
        tokens: activity.tokens,
        scoringDefinition: activity.scoringDefinition,
      };
    case "listening_choice":
      return {
        ...base,
        type: activity.type,
        audioMediaId: activity.audioMediaId,
        options: activity.options,
        scoringDefinition: activity.scoringDefinition,
      };
  }
}

function assertExactOrderedRefs(expected: string[], actual: string[]) {
  if (
    expected.length !== actual.length ||
    expected.some((reference, index) => reference !== actual[index])
  ) {
    throw new PublishValidationError(
      "activity_refs_mismatch",
      "Danh sách activity không khớp activityRefs của lesson",
    );
  }
}

function assertAllRefsResolved(
  expected: Iterable<string>,
  available: Set<string>,
  code: "missing_media" | "missing_source" | "missing_vocabulary",
  label: string,
) {
  const missing = [...new Set(expected)].filter((reference) => !available.has(reference));
  if (missing.length > 0) {
    throw new PublishValidationError(code, `${label} chưa được resolve: ${missing.join(", ")}`);
  }
}

function requiredMediaRefs(activities: PublicActivityDto[]) {
  const references: string[] = [];

  for (const activity of activities) {
    if (activity.type === "listening_choice") references.push(activity.audioMediaId);
    if (activity.type === "vocabulary_card") {
      for (const entry of activity.entries) references.push(...entry.mediaRefs);
    }
  }

  return references;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)]),
    );
  }
  return value;
}

function checksumFor(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

export function getPublishedLessonSizeBytes(revision: PublishedLessonRevision) {
  return Buffer.byteLength(JSON.stringify(canonicalize(revision)), "utf8");
}

export function verifyPublishedLessonChecksum(input: unknown) {
  const revision = publishedLessonRevisionSchema.parse(input);
  const { checksum, ...content } = revision;
  return checksum === checksumFor(content);
}

export function compilePublishedLesson(input: PublishLessonInput): PublishedLessonRevision {
  const lesson = lessonDraftSchema.parse(input.lesson);
  if (lesson.status !== "approved" && lesson.status !== "published") {
    throw new PublishValidationError(
      "draft_not_approved",
      "Chỉ lesson ở trạng thái approved mới được publish",
    );
  }
  if (lesson.validationReport.errors.length > 0) {
    throw new PublishValidationError(
      "draft_has_validation_errors",
      "Lesson còn lỗi validation nên chưa thể publish",
    );
  }

  const activities = input.activities.map(sanitizePublishedActivity);
  assertExactOrderedRefs(
    lesson.activityRefs,
    activities.map(({ id }) => id),
  );

  const vocabularyIds = new Set(input.vocabulary.map(({ lexemeId }) => lexemeId));
  assertAllRefsResolved(
    lesson.vocabularyRefs,
    vocabularyIds,
    "missing_vocabulary",
    "Vocabulary",
  );

  const sourceAttributions = input.sourceAttributions.map((source) =>
    sourceAttributionSchema.parse(source),
  );
  const sourceIds = new Set(sourceAttributions.map(({ id }) => id));
  assertAllRefsResolved(
    [lesson.sourceRefs, ...activities.map(({ sourceRefs }) => sourceRefs)].flat(),
    sourceIds,
    "missing_source",
    "Source",
  );

  const mediaIds = new Set(input.mediaManifest.map(({ id }) => id));
  assertAllRefsResolved(
    requiredMediaRefs(activities),
    mediaIds,
    "missing_media",
    "Media",
  );

  const content = {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    id: input.revisionId,
    lessonId: lesson.id,
    courseId: input.courseId,
    unitId: lesson.unitId,
    programId: input.programId,
    languageId: input.languageId,
    revisionNumber: input.revisionNumber,
    title: lesson.title,
    summary: lesson.summary,
    objectives: lesson.objectives,
    estimatedMinutes: lesson.estimatedMinutes,
    activities,
    vocabulary: input.vocabulary,
    mediaManifest: input.mediaManifest,
    sourceAttributions,
    publishedAt: input.publishedAt,
    publishedBy: input.publishedBy,
  };
  const revision = publishedLessonRevisionSchema.parse({
    ...content,
    checksum: checksumFor(content),
  });
  const sizeBytes = getPublishedLessonSizeBytes(revision);

  if (sizeBytes >= PUBLISHED_LESSON_MAX_BYTES) {
    throw new PublishValidationError(
      "snapshot_too_large",
      `Published lesson có kích thước ${sizeBytes} bytes, vượt budget ${PUBLISHED_LESSON_MAX_BYTES} bytes`,
    );
  }

  return revision;
}
