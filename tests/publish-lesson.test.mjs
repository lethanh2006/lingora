import assert from "node:assert/strict";
import test from "node:test";

import {
  compilePublishedLesson,
  getPublishedLessonSizeBytes,
  PUBLISHED_LESSON_MAX_BYTES,
  PublishValidationError,
  verifyPublishedLessonChecksum,
} from "../src/features/content/services/publish-lesson.ts";
import {
  activityFixtures,
  lessonDraftFixture,
  publishedLessonRevisionFixture,
  sourceAttributionFixture,
  timestamp,
} from "./fixtures/content.mjs";

function approvedLesson(overrides = {}) {
  return {
    ...structuredClone(lessonDraftFixture),
    status: "approved",
    activityRefs: activityFixtures.map(({ id }) => id),
    ...overrides,
  };
}

function validInput(overrides = {}) {
  return {
    revisionId: "compiledRevision1",
    revisionNumber: 1,
    publishedAt: timestamp,
    publishedBy: "admin-user-1",
    lesson: approvedLesson(),
    courseId: "english-a1-foundations",
    programId: "general-english-cefr",
    languageId: "en",
    activities: structuredClone(activityFixtures),
    vocabulary: structuredClone(publishedLessonRevisionFixture.vocabulary),
    mediaManifest: structuredClone(publishedLessonRevisionFixture.mediaManifest),
    sourceAttributions: [structuredClone(sourceAttributionFixture)],
    ...overrides,
  };
}

function expectValidationCode(callback, expectedCode) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof PublishValidationError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

test("compiler creates a valid learner-safe snapshot with a stable checksum", () => {
  const revision = compilePublishedLesson(validInput());
  const serialized = JSON.stringify(revision);

  assert.equal(revision.activities.length, activityFixtures.length);
  assert.equal(serialized.includes("scoringDefinition"), false);
  assert.equal(serialized.includes("transcript"), false);
  assert.equal(verifyPublishedLessonChecksum(revision), true);
  assert.ok(getPublishedLessonSizeBytes(revision) < PUBLISHED_LESSON_MAX_BYTES);
  assert.equal(compilePublishedLesson(validInput()).checksum, revision.checksum);
});

test("compiled snapshots do not change when draft inputs are mutated later", () => {
  const input = validInput();
  const revision = compilePublishedLesson(input);

  input.lesson.title = "Đã sửa sau publish";
  input.activities[0].prompt = "Đã sửa sau publish";

  assert.equal(revision.title, lessonDraftFixture.title);
  assert.notEqual(revision.activities[0].prompt, input.activities[0].prompt);
});

test("compiler rejects drafts that are not approved or have mismatched activities", () => {
  expectValidationCode(
    () =>
      compilePublishedLesson(
        validInput({
          lesson: approvedLesson({
            validationReport: {
              errors: ["Thiếu nội dung"],
              warnings: [],
              validatedAt: timestamp,
            },
          }),
        }),
      ),
    "draft_has_validation_errors",
  );
  expectValidationCode(
    () => compilePublishedLesson(validInput({ lesson: lessonDraftFixture })),
    "draft_not_approved",
  );
  expectValidationCode(
    () =>
      compilePublishedLesson(
        validInput({ lesson: approvedLesson({ activityRefs: ["missing-activity"] }) }),
      ),
    "activity_refs_mismatch",
  );
});

test("compiler rejects unresolved vocabulary, sources, and media", () => {
  expectValidationCode(
    () => compilePublishedLesson(validInput({ vocabulary: [] })),
    "missing_vocabulary",
  );
  expectValidationCode(
    () => compilePublishedLesson(validInput({ sourceAttributions: [] })),
    "missing_source",
  );
  expectValidationCode(
    () => compilePublishedLesson(validInput({ mediaManifest: [] })),
    "missing_media",
  );
});

test("checksum verification detects changes to published content", () => {
  const revision = compilePublishedLesson(validInput());

  assert.equal(
    verifyPublishedLessonChecksum({ ...revision, title: "Nội dung đã bị thay đổi" }),
    false,
  );
});

test("compiler rejects a snapshot at or above the internal size budget", () => {
  const largeActivities = Array.from({ length: 30 }, (_, index) => ({
    ...structuredClone(activityFixtures[0]),
    id: `large-explanation-${index}`,
    body: "x".repeat(20_000),
  }));

  expectValidationCode(
    () =>
      compilePublishedLesson(
        validInput({
          lesson: approvedLesson({ activityRefs: largeActivities.map(({ id }) => id) }),
          activities: largeActivities,
          mediaManifest: [],
        }),
      ),
    "snapshot_too_large",
  );
});
