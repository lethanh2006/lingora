import assert from "node:assert/strict";
import test from "node:test";

import { normalizeText, normalizePinyin } from "../src/features/content/adapters/language-adapter.ts";

test("Language Adapter - English normalization", () => {
  // Case sensitive
  assert.equal(
    normalizeText("Hello World", "en", { caseSensitive: true }),
    "Hello World"
  );
  // Case insensitive (default)
  assert.equal(
    normalizeText("Hello World", "en", { caseSensitive: false }),
    "hello world"
  );
  // Spacing trim
  assert.equal(
    normalizeText("  multiple   spaces  ", "en"),
    "multiple spaces"
  );
});

test("Language Adapter - Japanese normalization", () => {
  // Full-width to half-width alphanumeric conversion
  assert.equal(
    normalizeText("テスト１２３", "ja"),
    "テスト123"
  );
  // Katakana to Hiragana conversion
  assert.equal(
    normalizeText("サクラ", "ja", { kanaEquivalence: true }),
    "さくら"
  );
  // Spacing ignore
  assert.equal(
    normalizeText("さく ら", "ja"),
    "さくら"
  );
});

test("Language Adapter - Chinese normalization", () => {
  // Traditional to Simplified conversion
  assert.equal(
    normalizeText("漢語", "zh", { traditionalEquivalence: true }),
    "汉语"
  );
  
  // Pinyin tone ignore
  assert.equal(
    normalizeText("hànyǔ", "zh", { tonePolicy: "ignore" }),
    "hanyu"
  );
  assert.equal(
    normalizeText("han4yu3", "zh", { tonePolicy: "ignore" }),
    "hanyu"
  );

  // Pinyin tone numbers
  assert.equal(
    normalizeText("hànyǔ", "zh", { tonePolicy: "numbers" }),
    "han4yu3"
  );
  assert.equal(
    normalizeText("han4 yu3", "zh", { tonePolicy: "numbers" }),
    "han4yu3"
  );
});
