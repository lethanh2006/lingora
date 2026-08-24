import assert from "node:assert/strict";
import test from "node:test";

import {
  VocabularyImportError,
  normalizeVocabularyImportKey,
  planTopicImport,
  planWordImport,
} from "../src/features/vocabulary/vocabulary-import.service.ts";

const topic = {
  id: "nhat-ban",
  title: "Nhật Bản",
  description: "",
  languageCode: "ja",
  icon: "🌸",
  accent: "rose",
  order: 0,
  isVisible: true,
  wordCount: 1,
};

const word = {
  id: "word-1",
  topicId: topic.id,
  term: "猫",
  meaning: "con mèo",
  pronunciation: "ねこ",
  example: null,
  exampleMeaning: null,
  audioUrl: null,
  imageUrl: null,
  order: 0,
  isVisible: true,
};

test("import key normalizes Unicode width, whitespace and casing", () => {
  assert.equal(normalizeVocabularyImportKey("  ＡＢＣ  "), "abc");
});

test("topic import updates matching titles and allocates stable IDs for new topics", () => {
  const plan = planTopicImport([topic], [
    { ...topic, title: "  Nhật Bản  ", description: "mới" },
    { ...topic, title: "Đồ ăn", description: "", order: 1 },
    { ...topic, title: "Đồ ăn!", description: "", order: 2 },
  ]);

  assert.deepEqual(plan.map(({ action, id }) => ({ action, id })), [
    { action: "update", id: "nhat-ban" },
    { action: "create", id: "do-an" },
    { action: "create", id: "do-an-2" },
  ]);
});

test("word import is idempotent by normalized term and pronunciation", () => {
  const plan = planWordImport([word], [
    {
      term: " 猫 ",
      meaning: "mèo",
      pronunciation: "ねこ",
      example: "",
      exampleMeaning: "",
      audioUrl: "",
      imageUrl: "",
      order: 2,
      isVisible: true,
    },
    {
      term: "犬",
      meaning: "con chó",
      pronunciation: "いぬ",
      example: "",
      exampleMeaning: "",
      audioUrl: "",
      imageUrl: "",
      order: 3,
      isVisible: true,
    },
  ]);

  assert.deepEqual(plan.map(({ action, existing }) => ({ action, id: existing?.id })), [
    { action: "update", id: "word-1" },
    { action: "create", id: undefined },
  ]);
});

test("word import rejects duplicate rows and ambiguous existing data", () => {
  const input = {
    term: "猫",
    meaning: "mèo",
    pronunciation: "ねこ",
    example: "",
    exampleMeaning: "",
    audioUrl: "",
    imageUrl: "",
    order: 0,
    isVisible: true,
  };

  assert.throws(
    () => planWordImport([], [input, { ...input, term: " 猫 " }]),
    VocabularyImportError,
  );
  assert.throws(
    () => planWordImport([word, { ...word, id: "word-2" }], [input]),
    /nhiều bản ghi/u,
  );
});
