import assert from "node:assert/strict";
import test from "node:test";

import {
  activityDraftSchema,
  courseRevisionSchema,
  courseSchema,
  languageSchema,
  lessonDraftSchema,
  publishedLessonRevisionSchema,
  programSchema,
  publicActivitySchema,
  publicProgramDtoSchema,
  unitDraftSchema,
} from "../src/features/content/schemas/content.schema.ts";
import {
  activityFixtures,
  courseFixture,
  courseRevisionFixture,
  languageFixture,
  lessonDraftFixture,
  publishedLessonRevisionFixture,
  programFixture,
  unitDraftFixture,
} from "./fixtures/content.mjs";

test("domain schemas accept valid catalog fixtures", () => {
  const language = languageSchema.parse(languageFixture);
  assert.equal(language.id, "en");
  assert.equal(language.createdAt, languageFixture.createdAt);
  assert.equal(programSchema.parse(programFixture).languageId, "en");
  assert.equal(courseSchema.parse(courseFixture).levelId, "a1");
  assert.equal(courseRevisionSchema.parse(courseRevisionFixture).revisionNumber, 1);
  assert.equal(unitDraftSchema.parse(unitDraftFixture).courseId, courseFixture.id);
  assert.equal(lessonDraftSchema.parse(lessonDraftFixture).unitId, unitDraftFixture.id);
});

test("activity draft schema accepts every P0 activity type", () => {
  const parsed = activityFixtures.map((activity) => activityDraftSchema.parse(activity));

  assert.deepEqual(
    parsed.map(({ type }) => type),
    [
      "explanation",
      "vocabulary_card",
      "single_choice",
      "gap_fill",
      "reorder_tokens",
      "listening_choice",
    ],
  );
});

test("catalog schemas reject unsupported language and duplicate levels", () => {
  assert.equal(languageSchema.safeParse({ ...languageFixture, id: "fr" }).success, false);
  assert.equal(
    programSchema.safeParse({ ...programFixture, levelIds: ["a1", "a1"] }).success,
    false,
  );
  assert.equal(
    courseSchema.safeParse({ ...courseFixture, schemaVersion: 2 }).success,
    false,
  );
  assert.equal(
    lessonDraftSchema.safeParse({
      ...lessonDraftFixture,
      updatedAt: { seconds: 1_700_000_000, nanoseconds: 1_000_000_000 },
    }).success,
    false,
  );
});

test("choice scoring must reference an existing unique option", () => {
  const activity = activityFixtures.find(({ type }) => type === "single_choice");
  assert.ok(activity);

  assert.equal(
    activityDraftSchema.safeParse({
      ...activity,
      scoringDefinition: { ...activity.scoringDefinition, correctOptionId: "missing" },
    }).success,
    false,
  );

  assert.equal(
    activityDraftSchema.safeParse({
      ...activity,
      options: [activity.options[0], activity.options[0]],
    }).success,
    false,
  );
});

test("gap and token scoring cover their public inputs exactly once", () => {
  const gapFill = activityFixtures.find(({ type }) => type === "gap_fill");
  const reorder = activityFixtures.find(({ type }) => type === "reorder_tokens");
  assert.ok(gapFill);
  assert.ok(reorder);

  assert.equal(
    activityDraftSchema.safeParse({
      ...gapFill,
      scoringDefinition: { ...gapFill.scoringDefinition, answers: [] },
    }).success,
    false,
  );

  assert.equal(
    activityDraftSchema.safeParse({
      ...reorder,
      scoringDefinition: {
        ...reorder.scoringDefinition,
        correctTokenIds: ["hello", "hello"],
      },
    }).success,
    false,
  );
});

test("public DTO schemas reject persistence metadata and scoring secrets", () => {
  assert.equal(publicProgramDtoSchema.safeParse(programFixture).success, false);

  const privateChoice = activityFixtures.find(({ type }) => type === "single_choice");
  const privateListening = activityFixtures.find(({ type }) => type === "listening_choice");
  assert.ok(privateChoice);
  assert.ok(privateListening);

  assert.equal(publicActivitySchema.safeParse(privateChoice).success, false);
  assert.equal(publicActivitySchema.safeParse(privateListening).success, false);

  const publicChoice = structuredClone(privateChoice);
  const publicListening = structuredClone(privateListening);
  delete publicChoice.scoringDefinition;
  delete publicListening.scoringDefinition;
  delete publicListening.transcript;

  assert.equal(publicActivitySchema.safeParse(publicChoice).success, true);
  assert.equal(publicActivitySchema.safeParse(publicListening).success, true);
});

test("published lesson schema accepts a learner-safe immutable snapshot", () => {
  const parsed = publishedLessonRevisionSchema.parse(publishedLessonRevisionFixture);

  assert.equal(parsed.lessonId, lessonDraftFixture.id);
  assert.equal(parsed.activities.length, activityFixtures.length);
  assert.equal(parsed.sourceAttributions[0]?.id, "source-1");
});

test("published lesson schema rejects secrets, duplicate IDs, and invalid checksums", () => {
  const privateChoice = activityFixtures.find(({ type }) => type === "single_choice");
  assert.ok(privateChoice);

  assert.equal(
    publishedLessonRevisionSchema.safeParse({
      ...publishedLessonRevisionFixture,
      activities: [privateChoice],
    }).success,
    false,
  );
  assert.equal(
    publishedLessonRevisionSchema.safeParse({
      ...publishedLessonRevisionFixture,
      activities: [
        publishedLessonRevisionFixture.activities[0],
        publishedLessonRevisionFixture.activities[0],
      ],
    }).success,
    false,
  );
  assert.equal(
    publishedLessonRevisionSchema.safeParse({
      ...publishedLessonRevisionFixture,
      checksum: "not-a-sha256-checksum",
    }).success,
    false,
  );
});
