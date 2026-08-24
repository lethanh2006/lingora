import assert from "node:assert/strict";
import test from "node:test";

import {
  CsvError,
  parseCsv,
  parseVocabularyTopicsCsv,
  parseVocabularyWordsCsv,
  serializeCsv,
  serializeVocabularyTopicsCsv,
  serializeVocabularyWordsCsv,
} from "../src/features/vocabulary/vocabulary-csv.ts";

test("CSV parser handles UTF-8 BOM, CRLF and Unicode", () => {
  const csv = "\uFEFFterm,meaning,example\r\nこんにちは,xin chào,こんにちは世界\r\n猫,con mèo,猫がいます\r\n";

  assert.deepEqual(parseCsv(csv), [
    ["term", "meaning", "example"],
    ["こんにちは", "xin chào", "こんにちは世界"],
    ["猫", "con mèo", "猫がいます"],
  ]);
});

test("CSV parser handles commas, escaped quotes and embedded newlines", () => {
  const csv = 'term,example\r\n"xin, chào","Dòng 1\r\nDòng ""hai"""\r\n';

  assert.deepEqual(parseCsv(csv), [
    ["term", "example"],
    ["xin, chào", 'Dòng 1\nDòng "hai"'],
  ]);
});

test("CSV parser reports the row and column of malformed quoting", () => {
  assert.throws(
    () => parseCsv('term,meaning\r\nabc"def,xin chào'),
    (error) => {
      assert.ok(error instanceof CsvError);
      assert.equal(error.row, 2);
      assert.equal(error.column, 4);
      assert.match(error.message, /dòng 2, cột 4/u);
      return true;
    },
  );

  assert.throws(
    () => parseCsv('term,meaning\r\n"abc,xin chào'),
    (error) => {
      assert.ok(error instanceof CsvError);
      assert.equal(error.row, 2);
      assert.match(error.message, /chưa được đóng/u);
      return true;
    },
  );
});

test("CSV serializer emits RFC 4180 CRLF records that round-trip", () => {
  const rows = [
    ["term", "example"],
    ["猫", 'Cô ấy nói: "xin chào", rồi đi.\nDòng 2'],
  ];

  const csv = serializeCsv(rows, { includeBom: true });

  assert.ok(csv.startsWith("\uFEFFterm,example\r\n"));
  assert.ok(csv.endsWith("\r\n"));
  assert.match(csv, /"Cô ấy nói: ""xin chào"", rồi đi\.\nDòng 2"/u);
  assert.deepEqual(parseCsv(csv), rows);
});

test("CSV serializer neutralizes spreadsheet formulas without changing numeric cells", () => {
  const csv = serializeCsv([
    ["value"],
    ["=1+1"],
    [" +SUM(A1:A2)"],
    ["-2+3"],
    ["@cmd"],
    [-7],
  ]);

  assert.deepEqual(parseCsv(csv), [
    ["value"],
    ["'=1+1"],
    ["' +SUM(A1:A2)"],
    ["'-2+3"],
    ["'@cmd"],
    ["-7"],
  ]);
});

test("generic CSV parsing leaves file-size and record-count policy to its caller", () => {
  const csv = ["value", ...Array.from({ length: 1_200 }, (_, index) => `hàng-${index}`)].join("\r\n");

  const rows = parseCsv(csv);

  assert.equal(rows.length, 1_201);
  assert.equal(rows.at(-1)?.[0], "hàng-1199");
});

test("topic CSV mapping applies input defaults and round-trips exported topics", () => {
  const minimalCsv = "\uFEFFtitle,languageCode,isVisible\r\nSơ cấp 日本語,ja,0\r\n";

  assert.deepEqual(parseVocabularyTopicsCsv(minimalCsv), [
    {
      title: "Sơ cấp 日本語",
      description: "",
      languageCode: "ja",
      icon: "📚",
      accent: "emerald",
      order: 0,
      isVisible: false,
    },
  ]);

  const topics = [
    {
      title: "Đồ ăn, thức uống",
      description: 'Học từ "cơ bản"\ncho nhà hàng',
      languageCode: "ja",
      icon: "🍜",
      accent: "amber",
      order: 3,
      isVisible: true,
    },
  ];
  const exported = serializeVocabularyTopicsCsv(topics);

  assert.ok(exported.startsWith("\uFEFF"));
  assert.deepEqual(parseVocabularyTopicsCsv(exported), topics);
});

test("word CSV mapping includes audioUrl and preserves multilingual quoted content", () => {
  const words = [
    {
      term: "おはよう",
      meaning: "chào, buổi sáng",
      pronunciation: "ohayō",
      example: '彼は言いました。\n「おはよう」',
      exampleMeaning: 'Anh ấy nói: "Chào buổi sáng".',
      imageUrl: "https://cdn.example.com/images/morning.png",
      audioUrl: "https://cdn.example.com/audio/ohayou.mp3",
      order: 2,
      isVisible: true,
    },
  ];

  const exported = serializeVocabularyWordsCsv(words);

  assert.deepEqual(parseVocabularyWordsCsv(exported), words);
});

test("word CSV mapping reports semantic errors with record and named column", () => {
  assert.throws(
    () => parseVocabularyWordsCsv("term,meaning,isVisible\r\n猫,con mèo,có\r\n"),
    (error) => {
      assert.ok(error instanceof CsvError);
      assert.equal(error.row, 2);
      assert.equal(error.column, 3);
      assert.equal(error.columnName, "isVisible");
      assert.match(error.message, /dòng 2, cột 3 \(isVisible\)/u);
      return true;
    },
  );

  assert.throws(
    () => parseVocabularyWordsCsv("term,meaning,audioUrl\r\n猫,con mèo,javascript:alert(1)\r\n"),
    (error) => {
      assert.ok(error instanceof CsvError);
      assert.equal(error.row, 2);
      assert.equal(error.column, 3);
      assert.equal(error.columnName, "audioUrl");
      assert.match(error.message, /HTTP hoặc HTTPS/u);
      return true;
    },
  );
});

test("vocabulary CSV mapping rejects missing, duplicate and unknown headers", () => {
  assert.throws(
    () => parseVocabularyWordsCsv("term,audioUrl\r\n猫,https://example.com/cat.mp3\r\n"),
    (error) => {
      assert.ok(error instanceof CsvError);
      assert.equal(error.row, 1);
      assert.equal(error.columnName, "meaning");
      assert.match(error.message, /Thiếu cột bắt buộc/u);
      return true;
    },
  );

  assert.throws(
    () => parseVocabularyTopicsCsv("title,title\r\nA,B\r\n"),
    (error) => {
      assert.ok(error instanceof CsvError);
      assert.equal(error.row, 1);
      assert.equal(error.column, 2);
      assert.match(error.message, /Cột bị lặp/u);
      return true;
    },
  );

  assert.throws(
    () => parseVocabularyTopicsCsv("title,unknown\r\nA,B\r\n"),
    (error) => {
      assert.ok(error instanceof CsvError);
      assert.equal(error.row, 1);
      assert.equal(error.column, 2);
      assert.match(error.message, /Cột không được hỗ trợ/u);
      return true;
    },
  );
});
