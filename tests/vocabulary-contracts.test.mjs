import assert from "node:assert/strict";
import test from "node:test";

import {
  practiceSessionInputSchema,
  vocabularyTopicInputSchema,
  vocabularyWordInputSchema,
} from "../src/features/vocabulary/schemas/vocabulary.schema.ts";
import { createStarterVocabularySeed } from "../src/features/vocabulary/seed/starter-vocabulary.ts";
import { slugifyTopicTitle } from "../src/features/vocabulary/vocabulary-admin.service.ts";
import { getVocabularyLanguageCopy } from "../src/features/vocabulary/vocabulary-language.ts";
import { createVocabularyProgressService } from "../src/features/vocabulary/vocabulary-progress.service.ts";
import { calculatePracticeStreak } from "../src/features/vocabulary/vocabulary-stats.ts";
import { timestamp } from "./fixtures/content.mjs";

test("starter vocabulary contains visible topics and words", () => {
  const documents = createStarterVocabularySeed(timestamp);
  const topics = documents.filter(({ collection }) => collection === "vocabularyTopics");
  const words = documents.filter(({ collection }) => collection === "vocabularyWords");

  assert.equal(topics.length, 3);
  assert.equal(words.length, 24);
  assert.ok(topics.every(({ data }) => data.isVisible && data.wordCount === 8));
  assert.ok(words.every(({ data }) => data.isVisible && data.topicId));
  assert.equal(new Set(documents.map(({ collection, id }) => `${collection}/${id}`)).size, 27);
});

test("starter vocabulary stores IPA, kana and pinyin in the matching topics", () => {
  const documents = createStarterVocabularySeed(timestamp);
  const languageByTopic = new Map(
    documents
      .filter(({ collection }) => collection === "vocabularyTopics")
      .map(({ id, data }) => [id, data.languageCode]),
  );
  const pronunciations = documents
    .filter(({ collection }) => collection === "vocabularyWords")
    .map(({ data }) => ({ languageCode: languageByTopic.get(data.topicId), value: data.pronunciation }));

  assert.ok(pronunciations.filter(({ languageCode }) => languageCode === "en").every(({ value }) => /^\/.+\/$/u.test(value)));
  assert.ok(pronunciations.filter(({ languageCode }) => languageCode === "ja").every(({ value }) => !/[a-z]/iu.test(value) && /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value)));
  assert.ok(pronunciations.filter(({ languageCode }) => languageCode === "zh").every(({ value }) => /[a-z]/iu.test(value) && !value.includes("/")));
});

test("vocabulary fields use pronunciation conventions for each language", () => {
  assert.deepEqual(
    ["en", "ja", "zh"].map((languageCode) => {
      const copy = getVocabularyLanguageCopy(languageCode);
      return [copy.pronunciationLabel, copy.pronunciationPlaceholder];
    }),
    [
      ["IPA (Anh-Mỹ)", "Ví dụ: /həˈloʊ/"],
      ["Cách đọc (kana)", "Ví dụ: たべる"],
      ["Pinyin", "Ví dụ: nǐ hǎo"],
    ],
  );
});

test("admin topic and word inputs reject empty required content", () => {
  assert.equal(vocabularyTopicInputSchema.safeParse({ title: "" }).success, false);
  assert.equal(vocabularyWordInputSchema.safeParse({ term: "hello", meaning: "" }).success, false);
  assert.equal(
    vocabularyWordInputSchema.safeParse({ term: "hello", meaning: "xin chào" }).success,
    true,
  );
  assert.equal(
    vocabularyWordInputSchema.parse({ term: "hello", meaning: "xin chào" }).audioUrl,
    "",
  );
});

test("practice session only accepts mastered words from the studied set", () => {
  const base = {
    topicId: "chao-hoi-tieng-anh",
    mode: "flashcards",
    correctAnswers: 1,
    totalAnswers: 2,
    studiedWordIds: ["word-a", "word-b"],
    masteredWordIds: ["word-a"],
    durationSeconds: 30,
  };

  assert.equal(practiceSessionInputSchema.safeParse(base).success, true);
  assert.equal(
    practiceSessionInputSchema.safeParse({ ...base, masteredWordIds: ["word-c"] }).success,
    false,
  );
  assert.equal(
    practiceSessionInputSchema.safeParse({ ...base, correctAnswers: 3 }).success,
    false,
  );
});

test("topic title is converted to a stable Vietnamese-safe slug", () => {
  assert.equal(slugifyTopicTitle("Đồ ăn & Thức uống"), "do-an-thuc-uong");
  assert.equal(slugifyTopicTitle("  日本語  "), "chu-de");
});

test("practice streak starts from today or yesterday and ignores duplicates", () => {
  assert.equal(calculatePracticeStreak([], "2026-08-21"), 0);
  assert.equal(calculatePracticeStreak(["2026-08-21", "2026-08-20", "2026-08-20", "2026-08-19"], "2026-08-21"), 3);
  assert.equal(calculatePracticeStreak(["2026-08-20", "2026-08-19"], "2026-08-21"), 2);
  assert.equal(calculatePracticeStreak(["2026-08-18"], "2026-08-21"), 0);
});

test("dashboard practice days use the indexed date field and ignore empty days", async () => {
  const queryCalls = [];
  const documents = [
    { id: "2026-08-24", sessionsCompleted: 2 },
    { id: "2026-08-23", sessionsCompleted: 0 },
    { id: "2026-08-22", sessionsCompleted: 1 },
  ];
  const query = {
    orderBy(field, direction) {
      queryCalls.push(["orderBy", field, direction]);
      return query;
    },
    limit(value) {
      queryCalls.push(["limit", value]);
      return query;
    },
    async get() {
      return {
        docs: documents.map(({ id, ...data }) => ({ id, data: () => data })),
      };
    },
  };
  const db = {
    collection() {
      return {
        doc() {
          return { collection: () => query };
        },
      };
    },
  };

  const dates = await createVocabularyProgressService(db).listActivePracticeDateIds("user-1");

  assert.deepEqual(queryCalls, [["orderBy", "date", "desc"], ["limit", 90]]);
  assert.deepEqual(dates, ["2026-08-24", "2026-08-22"]);
});
