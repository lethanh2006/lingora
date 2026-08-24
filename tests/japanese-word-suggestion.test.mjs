import assert from "node:assert/strict";
import test from "node:test";

import {
  createJapaneseWordSuggestionService,
  normalizeJotobaAudioUrl,
  WordSuggestionServiceError,
} from "../src/features/vocabulary/japanese-word-suggestion.service.ts";
import { wordSuggestionCandidateSchema } from "../src/features/vocabulary/schemas/word-suggestion.schema.ts";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function jotobaWord({
  term = "猫",
  kana = "ねこ",
  gloss = "cat",
  audio = "猫【ねこ】.mp3",
} = {}) {
  return {
    reading: { kanji: term, kana, furigana: `[${term}|${kana}]` },
    common: true,
    senses: [
      { glosses: [gloss], language: "English", pos: ["Noun"] },
      { glosses: ["Katze"], language: "German", pos: ["Noun"] },
    ],
    audio,
    ignoredByAdapter: true,
  };
}

test("search parses a valid Jotoba payload and returns at most six candidates", async () => {
  const calls = [];
  const fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return jsonResponse({
      words: Array.from({ length: 8 }, (_, index) =>
        jotobaWord({
          term: `猫${index}`,
          kana: `ねこ${index}`,
          gloss: `cat ${index}`,
          audio: null,
        }),
      ),
      kanji: [],
    });
  };
  const service = createJapaneseWordSuggestionService({ fetch });

  const result = await service.search("  猫  ");

  assert.equal(result.length, 6);
  assert.deepEqual(result[0], {
    term: "猫0",
    kana: "ねこ0",
    glossEnglish: "cat 0",
    audioUrl: null,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://jotoba.de/api/search/words");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.cache, "no-store");
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    query: "猫",
    language: "English",
    no_english: false,
  });
});

test("search supports kana-only readings and Tofugu audio from a real payload shape", async () => {
  const service = createJapaneseWordSuggestionService({
    fetch: async () =>
      jsonResponse({
        words: [
          jotobaWord({
            term: null,
            kana: "なま",
            gloss: "raw",
            audio: "/resource/audio/tofugu/1378450",
          }),
        ],
      }),
  });

  assert.deepEqual(await service.search("なま"), [
    {
      term: "なま",
      kana: "なま",
      glossEnglish: "raw",
      audioUrl: "https://jotoba.de/resource/audio/tofugu/1378450?download=true",
    },
  ]);
});

test("search reports malformed payloads and failed Jotoba responses", async () => {
  const malformedService = createJapaneseWordSuggestionService({
    fetch: async () => jsonResponse({ words: "not-an-array" }),
  });
  await assert.rejects(
    () => malformedService.search("猫"),
    (error) => {
      assert.ok(error instanceof WordSuggestionServiceError);
      assert.equal(error.code, "invalid_upstream_response");
      return true;
    },
  );

  const failedService = createJapaneseWordSuggestionService({
    fetch: async () => jsonResponse({ error: "busy" }, { status: 503 }),
  });
  await assert.rejects(
    () => failedService.search("猫"),
    (error) => {
      assert.ok(error instanceof WordSuggestionServiceError);
      assert.equal(error.code, "upstream_request_failed");
      return true;
    },
  );
});

test("request timeout remains active while the upstream response body is being read", async () => {
  const service = createJapaneseWordSuggestionService({
    timeoutMs: 5,
    fetch: async (_input, init) => ({
      ok: true,
      status: 200,
      json: () =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    }),
  });

  await assert.rejects(
    () => service.search("猫"),
    (error) => {
      assert.ok(error instanceof WordSuggestionServiceError);
      assert.equal(error.code, "upstream_request_failed");
      assert.match(error.message, /quá thời gian/u);
      return true;
    },
  );
});

test("audio normalization only accepts supported Jotoba paths over HTTPS", () => {
  assert.equal(
    normalizeJotobaAudioUrl("/resource/audio/kanjialive/1358280"),
    "https://jotoba.de/resource/audio/kanjialive/1358280?download=true",
  );
  assert.equal(
    normalizeJotobaAudioUrl("猫【ねこ】.mp3"),
    "https://jotoba.de/audio/mp3/%E7%8C%AB%E3%80%90%E3%81%AD%E3%81%93%E3%80%91.mp3?download=true",
  );
  assert.equal(
    normalizeJotobaAudioUrl("/audio/mp3/猫【ねこ】.mp3"),
    "https://jotoba.de/audio/mp3/%E7%8C%AB%E3%80%90%E3%81%AD%E3%81%93%E3%80%91.mp3?download=true",
  );
  assert.equal(
    normalizeJotobaAudioUrl(
      "http://jotoba.de/assets/audio/cat.ogg?source=test&download=false#preview",
    ),
    "https://jotoba.de/assets/audio/cat.ogg?source=test&download=true",
  );
  assert.equal(normalizeJotobaAudioUrl("https://evil.example/audio/cat.mp3"), null);
  assert.equal(normalizeJotobaAudioUrl("https://evil.example/resource/audio/cat.mp3"), null);
  assert.equal(normalizeJotobaAudioUrl("/resource/audio/unknown/1358280"), null);
  assert.equal(normalizeJotobaAudioUrl("/resource/audio/kanjialive/not-an-id"), null);
  assert.equal(normalizeJotobaAudioUrl("https://jotoba.de/about"), null);
  assert.equal(normalizeJotobaAudioUrl("javascript:alert(1)"), null);
});

test("suggestion DTO rejects non-HTTPS audio protocols", () => {
  const base = { term: "猫", kana: "ねこ", glossEnglish: "cat" };
  assert.equal(
    wordSuggestionCandidateSchema.safeParse({ ...base, audioUrl: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    wordSuggestionCandidateSchema.safeParse({ ...base, audioUrl: "data:audio/mpeg;base64,AA==" })
      .success,
    false,
  );
  assert.equal(
    wordSuggestionCandidateSchema.safeParse({ ...base, audioUrl: "http://jotoba.de/audio/a.mp3" })
      .success,
    false,
  );
});

test("detail leaves Vietnamese meanings empty when MyMemory translation fails", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/search/words") {
      return jsonResponse({ words: [jotobaWord()] });
    }
    if (url.pathname === "/api/search/sentences") {
      return jsonResponse({
        sentences: [
          {
            content: "猫が好きです。",
            furigana: "[猫|ねこ]が[好|す]きです。",
            translation: "I like cats.",
            language: "English",
          },
        ],
      });
    }
    if (url.hostname === "api.mymemory.translated.net") {
      return jsonResponse({ responseStatus: 429, responseData: { translatedText: "" } }, { status: 429 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const service = createJapaneseWordSuggestionService({ fetch });

  const detail = await service.getDetail({ term: "猫", kana: "ねこ" });

  assert.equal(detail.meaning, null);
  assert.equal(detail.example?.meaning, null);
  assert.equal(detail.example?.english, "I like cats.");
});

test("detail rejects a homograph when the selected kana no longer matches", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/search/words") {
      return jsonResponse({ words: [jotobaWord({ term: "生", kana: "せい" })] });
    }
    if (url.pathname === "/api/search/sentences") {
      return jsonResponse({ sentences: [] });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const service = createJapaneseWordSuggestionService({ fetch });

  await assert.rejects(
    () => service.getDetail({ term: "生", kana: "なま" }),
    (error) => {
      assert.ok(error instanceof WordSuggestionServiceError);
      assert.equal(error.code, "word_not_found");
      return true;
    },
  );
});

test("detail translates the gloss and an English example through MyMemory", async () => {
  const calls = [];
  const translations = new Map([
    ["cat", "con mèo"],
    ["I have a cat.", "Tôi có một con mèo."],
  ]);
  const fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, init });

    if (url.pathname === "/api/search/words") {
      return jsonResponse({ words: [jotobaWord()] });
    }
    if (url.pathname === "/api/search/sentences") {
      return jsonResponse({
        sentences: [
          {
            content: "猫を飼っています。",
            furigana: "[猫|ねこ]を[飼|か]っています。",
            translation: "I have a cat.",
            language: "English",
          },
        ],
      });
    }
    if (url.hostname === "api.mymemory.translated.net") {
      assert.equal(init.method, "GET");
      assert.equal(url.searchParams.get("langpair"), "en|vi");
      const source = url.searchParams.get("q");
      return jsonResponse({
        responseStatus: 200,
        responseData: { translatedText: translations.get(source) },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const service = createJapaneseWordSuggestionService({ fetch });

  const detail = await service.getDetail({ term: "猫", kana: "ねこ" });

  assert.deepEqual(detail, {
    term: "猫",
    kana: "ねこ",
    glossEnglish: "cat",
    meaning: "con mèo",
    audioUrl:
      "https://jotoba.de/audio/mp3/%E7%8C%AB%E3%80%90%E3%81%AD%E3%81%93%E3%80%91.mp3?download=true",
    example: {
      japanese: "猫を飼っています。",
      furigana: "[猫|ねこ]を[飼|か]っています。",
      english: "I have a cat.",
      meaning: "Tôi có một con mèo.",
    },
  });
  assert.equal(
    calls.filter(({ url }) => url.pathname === "/api/search/words").length,
    1,
  );
  assert.equal(
    calls.filter(({ url }) => url.pathname === "/api/search/sentences").length,
    1,
  );
  assert.equal(
    calls.filter(({ url }) => url.hostname === "api.mymemory.translated.net").length,
    2,
  );
});
