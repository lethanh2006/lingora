import assert from "node:assert/strict";
import test from "node:test";
import {
  discoverTopics,
  getContinueTopic,
  getPracticeWeek,
  normalizeSearch,
} from "../src/features/vocabulary/topic-discovery.ts";
import {
  buildPracticeDeck,
  shuffleWithSeed,
} from "../src/features/vocabulary/practice-deck.ts";
import { toTopicProgressDto } from "../src/features/vocabulary/vocabulary-progress.service.ts";
import { createStarterVocabularySeed } from "../src/features/vocabulary/seed/starter-vocabulary.ts";

const seed = createStarterVocabularySeed({ seconds: 1000, nanoseconds: 0 });
const topics = seed
  .filter((item) => item.collection === "vocabularyTopics")
  .map((item) => item.data);
const words = seed
  .filter(
    (item) =>
      item.collection === "vocabularyWords" &&
      item.data.topicId === topics[0].id,
  )
  .map((item) => item.data);
const baseOptions = {
  query: "",
  language: "all",
  filter: "all",
  sort: "recommended",
  savedIds: [],
};
const progress = (topicId, overrides = {}) => ({
  topicId,
  masteredWordIds: [],
  sessionsCompleted: 1,
  lastPracticedAtMs: 10,
  ...overrides,
});

test("Vietnamese search accepts accents, uppercase, Đ and surrounding whitespace", () => {
  assert.equal(normalizeSearch("  ĐỒ ĂN  "), "do an");
  assert.equal(
    discoverTopics(topics, [], {
      ...baseOptions,
      query: "CHAO HOI TIENG NHAT",
    })[0].languageCode,
    "ja",
  );
  assert.equal(
    discoverTopics(topics, [], {
      ...baseOptions,
      query: "giao tiep lich su",
      language: "ja",
    }).length,
    1,
  );
  assert.equal(
    discoverTopics(topics, [], { ...baseOptions, query: "zzzzzz" }).length,
    0,
  );
});

test("topic filters compose language, saved topics and actual completion", () => {
  const items = [
    progress(topics[0].id),
    progress(topics[1].id, {
      masteredWordIds: Array(8)
        .fill(0)
        .map((_, i) => `w${i}`),
    }),
  ];
  assert.deepEqual(
    discoverTopics(topics, items, { ...baseOptions, filter: "started" }).map(
      (item) => item.id,
    ),
    [topics[0].id],
  );
  assert.deepEqual(
    discoverTopics(topics, items, { ...baseOptions, filter: "completed" }).map(
      (item) => item.id,
    ),
    [topics[1].id],
  );
  assert.deepEqual(
    discoverTopics(topics, items, { ...baseOptions, filter: "new" }).map(
      (item) => item.id,
    ),
    [topics[2].id],
  );
  assert.equal(
    discoverTopics(topics, items, {
      ...baseOptions,
      filter: "saved",
      language: "ja",
      savedIds: [topics[0].id],
    }).length,
    0,
  );
  assert.equal(
    discoverTopics([{ ...topics[0], wordCount: 0 }], [], {
      ...baseOptions,
      filter: "completed",
    }).length,
    0,
  );
});

test("continue chooses the most recently practiced unfinished available topic", () => {
  const completed = progress(topics[1].id, {
    masteredWordIds: Array(8).fill("word"),
    lastPracticedAtMs: 100,
  });
  const unfinished = progress(topics[2].id, { lastPracticedAtMs: 50 });
  const items = [
    progress("hidden-topic", { lastPracticedAtMs: 200 }),
    completed,
    unfinished,
    progress(topics[0].id),
  ];
  assert.equal(getContinueTopic(topics, items).id, topics[2].id);
  assert.equal(getContinueTopic(topics, [completed]).id, topics[1].id);
  assert.equal(getContinueTopic(topics, []).id, topics[0].id);
  assert.equal(getContinueTopic([], items), undefined);
  assert.equal(
    getContinueTopic([{ ...topics[0], wordCount: 0 }], []),
    undefined,
  );
});

test("weekly activity uses Monday through Sunday across month/year boundaries", () => {
  const week = getPracticeWeek(
    ["2025-12-31", "2026-01-01", "2026-01-01"],
    "2026-01-01",
  );
  assert.equal(week[0].id, "2025-12-29");
  assert.equal(week[6].id, "2026-01-04");
  assert.equal(week.filter((day) => day.active).length, 2);
  assert.equal(week.find((day) => day.today).id, "2026-01-01");
  assert.equal(week.filter((day) => day.future).length, 3);
  assert.equal(getPracticeWeek([], "2026-01-04")[6].today, true);
});

test("progress DTO exposes serializable recency without leaking Firestore timestamps", () => {
  const dto = toTopicProgressDto({
    topicId: "topic",
    firstPracticedAt: { seconds: 1, nanoseconds: 0 },
    lastPracticedAt: { seconds: 10, nanoseconds: 123000000 },
  });
  assert.deepEqual(dto, { topicId: "topic", lastPracticedAtMs: 10123 });
});

test("practice prioritizes unmastered words, preserves source and respects mode sizes", () => {
  const before = structuredClone(words);
  const mastered = words.slice(0, 2).map((word) => word.id);
  const deck = buildPracticeDeck(words, "matching", 1, mastered);
  assert.equal(deck.length, 6);
  assert.ok(deck.every((word) => !mastered.includes(word.id)));
  assert.deepEqual(words, before);
  assert.equal(new Set(deck.map((word) => word.id)).size, 6);
  assert.deepEqual(buildPracticeDeck([], "flashcards", 1), []);
});

test("later practice rounds reach words beyond the original first page", () => {
  const longWords = Array.from({ length: 53 }, (_, i) => ({
    ...words[0],
    id: `word-${i}`,
  }));
  for (const mode of ["flashcards", "matching", "fill"]) {
    const seen = new Set();
    for (let round = 1; round <= 10; round++)
      buildPracticeDeck(longWords, mode, round).forEach((word) =>
        seen.add(word.id),
      );
    assert.equal(seen.size, 53, `${mode} must eventually cover all words`);
  }
  assert.deepEqual(
    shuffleWithSeed(words, "seed"),
    shuffleWithSeed(words, "seed"),
  );
  assert.notDeepEqual(
    shuffleWithSeed(words, "seed"),
    shuffleWithSeed(words, "new-seed"),
  );
});
