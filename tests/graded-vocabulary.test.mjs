import assert from "node:assert/strict";
import test from "node:test";

import {
  vocabularyTopicSchema,
  vocabularyWordSchema,
} from "../src/features/vocabulary/schemas/vocabulary.schema.ts";
import {
  createGradedVocabularySeed,
  gradedVocabularyTopics,
  seedGradedVocabulary,
} from "../src/features/vocabulary/seed/graded-vocabulary.ts";
import { timestamp } from "./fixtures/content.mjs";

const EXPECTED_FRAMEWORKS = {
  CEFR: { languageCode: "en", levels: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  JLPT: { languageCode: "ja", levels: ["N5", "N4", "N3", "N2", "N1"] },
  HSK: { languageCode: "zh", levels: ["1", "2", "3", "4", "5", "6", "7-9"] },
};

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} phải duy nhất`);
}

test("graded vocabulary contains exactly 18 topics and 360 words", () => {
  assert.equal(gradedVocabularyTopics.length, 18);

  for (const topic of gradedVocabularyTopics) {
    assert.equal(topic.words.length, 20, `${topic.id} phải có đúng 20 từ`);
  }

  assert.equal(
    gradedVocabularyTopics.reduce((total, topic) => total + topic.words.length, 0),
    360,
  );
});

test("graded vocabulary seed is schema-valid and uses unique IDs", () => {
  assertUnique(
    gradedVocabularyTopics.map((topic) => topic.id),
    "Topic ID",
  );

  const sourceWordPaths = gradedVocabularyTopics.flatMap((topic) =>
    topic.words.map((word) => `${topic.id}/${word.id}`),
  );
  assertUnique(sourceWordPaths, "Word ID trong mỗi topic");

  const documents = createGradedVocabularySeed(timestamp);
  assert.equal(documents.length, 378);
  assertUnique(
    documents.map(({ collection, id }) => `${collection}/${id}`),
    "Đường dẫn document seed",
  );

  for (const document of documents) {
    if (document.collection === "vocabularyTopics") {
      const result = vocabularyTopicSchema.safeParse(document.data);
      assert.equal(
        result.success,
        true,
        `${document.collection}/${document.id} sai schema: ${result.error?.message ?? ""}`,
      );
      continue;
    }

    assert.equal(document.collection, "vocabularyWords", `${document.id} sai collection`);
    const result = vocabularyWordSchema.safeParse(document.data);
    assert.equal(
      result.success,
      true,
      `${document.collection}/${document.id} sai schema: ${result.error?.message ?? ""}`,
    );
  }
});

test("graded vocabulary seed can run twice without creating duplicates", async () => {
  const paths = new Set();
  const store = {
    async createIfMissing(document) {
      const path = `${document.collection}/${document.id}`;
      if (paths.has(path)) return false;
      paths.add(path);
      return true;
    },
  };

  const first = await seedGradedVocabulary(store, timestamp);
  const second = await seedGradedVocabulary(store, timestamp);

  assert.equal(first.created.length, 378);
  assert.equal(first.skipped.length, 0);
  assert.equal(second.created.length, 0);
  assert.equal(second.skipped.length, 378);
  assert.equal(paths.size, 378);
});

test("graded vocabulary covers every CEFR, JLPT and HSK level", () => {
  for (const [framework, expectation] of Object.entries(EXPECTED_FRAMEWORKS)) {
    const topics = gradedVocabularyTopics.filter((topic) => topic.framework === framework);

    assert.deepEqual(
      topics.map((topic) => topic.level),
      expectation.levels,
      `${framework} thiếu hoặc sai thứ tự level`,
    );
    assert.ok(
      topics.every((topic) => topic.languageCode === expectation.languageCode),
      `${framework} phải dùng languageCode ${expectation.languageCode}`,
    );
  }
});

test("graded vocabulary follows IPA, kana and pinyin conventions", () => {
  for (const topic of gradedVocabularyTopics) {
    for (const word of topic.words) {
      const label = `${topic.id}/${word.id}`;

      if (topic.languageCode === "en") {
        assert.match(word.pronunciation, /^\/[^/\r\n]+\/$/u, `${label} phải dùng IPA /…/`);
        continue;
      }

      if (topic.languageCode === "ja") {
        assert.match(
          word.pronunciation,
          /[\p{Script=Hiragana}\p{Script=Katakana}]/u,
          `${label} phải có kana`,
        );
        assert.doesNotMatch(word.pronunciation, /\p{Script=Latin}/u, `${label} không được có Latin`);
        assert.doesNotMatch(word.pronunciation, /\p{Script=Han}/u, `${label} không được có chữ Hán`);
        continue;
      }

      assert.equal(topic.languageCode, "zh", `${label} dùng languageCode không hỗ trợ`);
      assert.match(word.pronunciation, /\p{Script=Latin}/u, `${label} phải có pinyin`);
      assert.doesNotMatch(word.pronunciation, /\p{Script=Han}/u, `${label} không được có chữ Hán`);
    }
  }
});

test("graded vocabulary has complete source metadata and a JLPT disclaimer", () => {
  for (const topic of gradedVocabularyTopics) {
    for (const field of ["sourceUrl", "sourceVersion", "sourceLicense"]) {
      assert.equal(typeof topic[field], "string", `${topic.id}.${field} phải là chuỗi`);
      assert.ok(topic[field].trim(), `${topic.id}.${field} không được rỗng`);
    }

    const sourceUrl = new URL(topic.sourceUrl);
    assert.ok(
      sourceUrl.protocol === "https:" || sourceUrl.protocol === "http:",
      `${topic.id}.sourceUrl phải là URL HTTP(S)`,
    );

    if (topic.framework === "JLPT") {
      assert.match(topic.description, /tham chiếu cộng đồng/iu, `${topic.id} thiếu ghi chú tham chiếu`);
      assert.match(
        topic.description,
        /không phải danh sách chính thức/iu,
        `${topic.id} thiếu disclaimer JLPT`,
      );
    }
  }
});
