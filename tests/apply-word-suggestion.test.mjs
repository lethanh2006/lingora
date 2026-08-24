import assert from "node:assert/strict";
import test from "node:test";

import { applyWordSuggestion } from "../src/features/vocabulary/apply-word-suggestion.ts";

const current = {
  term: "旧",
  meaning: "nghĩa cũ",
  pronunciation: "きゅう",
  example: "例文を残す。",
  exampleMeaning: "Giữ câu ví dụ.",
  audioUrl: "https://example.com/manual.mp3",
  imageUrl: "https://example.com/image.jpg",
  order: 7,
  isVisible: false,
};

test("applies all available suggestion fields and preserves unrelated form values", () => {
  const result = applyWordSuggestion(current, {
    term: "猫",
    kana: "ねこ",
    glossEnglish: "cat",
    meaning: "con mèo",
    audioUrl: "https://jotoba.de/resource/audio/kanjialive/1467640?download=true",
    example: {
      japanese: "猫が好きです。",
      furigana: "[猫|ねこ]が[好|す]きです。",
      english: "I like cats.",
      meaning: "Tôi thích mèo.",
    },
  });

  assert.deepEqual(result, {
    ...current,
    term: "猫",
    pronunciation: "ねこ",
    meaning: "con mèo",
    example: "猫が好きです。",
    exampleMeaning: "Tôi thích mèo.",
    audioUrl: "https://jotoba.de/resource/audio/kanjialive/1467640?download=true",
  });
});

test("does not erase manual optional fields when the provider has no example or audio", () => {
  const result = applyWordSuggestion(current, {
    term: "猫",
    kana: "ねこ",
    glossEnglish: "cat",
    meaning: null,
    audioUrl: null,
    example: null,
  });

  assert.equal(result.example, current.example);
  assert.equal(result.exampleMeaning, current.exampleMeaning);
  assert.equal(result.audioUrl, current.audioUrl);
  assert.equal(result.meaning, current.meaning);
  assert.equal(result.imageUrl, current.imageUrl);
  assert.equal(result.order, current.order);
  assert.equal(result.isVisible, current.isVisible);
});
