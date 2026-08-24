import assert from "node:assert/strict";
import test from "node:test";

import {
  createWordSuggestionRouteHandlers,
} from "../src/app/api/admin/topics/[topicId]/word-suggestions/handler.ts";
import {
  WordSuggestionServiceError,
} from "../src/features/vocabulary/japanese-word-suggestion.service.ts";

const suggestion = {
  term: "猫",
  kana: "ねこ",
  glossEnglish: "cat",
  audioUrl: "https://jotoba.de/audio/mp3/cat.mp3?download=true",
};

const detail = {
  ...suggestion,
  meaning: "con mèo",
  example: {
    japanese: "猫が好きです。",
    furigana: "[猫|ねこ]が[好|す]きです。",
    english: "I like cats.",
    meaning: "Tôi thích mèo.",
  },
};

function routeContext(topicId = "tieng-nhat") {
  return { params: Promise.resolve({ topicId }) };
}

function getRequest(query = "猫") {
  const url = new URL("https://lingora.test/api/admin/topics/tieng-nhat/word-suggestions");
  if (query !== null) url.searchParams.set("q", query);
  return new Request(url);
}

function postRequest(body, origin = "https://lingora.test") {
  return new Request(
    "https://lingora.test/api/admin/topics/tieng-nhat/word-suggestions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );
}

function createDependencies(overrides = {}) {
  const calls = {
    auth: 0,
    topics: [],
    searches: [],
    details: [],
    logs: [],
  };
  const dependencies = {
    async getCurrentUser() {
      calls.auth += 1;
      return { role: "admin" };
    },
    async getTopic(topicId) {
      calls.topics.push(topicId);
      return { languageCode: "ja" };
    },
    service: {
      async search(query) {
        calls.searches.push(query);
        return [suggestion];
      },
      async getDetail(input) {
        calls.details.push(input);
        return detail;
      },
    },
    logError(message, error) {
      calls.logs.push({ message, error });
    },
    ...overrides,
  };
  return { calls, dependencies };
}

test("GET returns trimmed suggestions for an existing Japanese topic", async () => {
  const { calls, dependencies } = createDependencies();
  const { GET } = createWordSuggestionRouteHandlers(dependencies);

  const response = await GET(getRequest("  猫  "), routeContext());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { suggestions: [suggestion] });
  assert.deepEqual(calls.topics, ["tieng-nhat"]);
  assert.deepEqual(calls.searches, ["猫"]);
});

test("POST returns detail and forwards only the validated selection", async () => {
  const { calls, dependencies } = createDependencies();
  const { POST } = createWordSuggestionRouteHandlers(dependencies);

  const response = await POST(
    postRequest({ term: "  猫 ", kana: " ねこ " }),
    routeContext(),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { detail });
  assert.deepEqual(calls.details, [{ term: "猫", kana: "ねこ" }]);
});

test("handlers reject non-admin requests before reading topics or calling providers", async () => {
  const { calls, dependencies } = createDependencies({
    getCurrentUser: async () => {
      calls.auth += 1;
      return { role: "user" };
    },
  });
  const { GET } = createWordSuggestionRouteHandlers(dependencies);

  const response = await GET(getRequest(), routeContext());

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { error: "Forbidden", code: "forbidden" });
  assert.equal(calls.auth, 1);
  assert.deepEqual(calls.topics, []);
  assert.deepEqual(calls.searches, []);
});

test("POST rejects a cross-origin request before authentication", async () => {
  const { calls, dependencies } = createDependencies();
  const { POST } = createWordSuggestionRouteHandlers(dependencies);

  const response = await POST(
    postRequest({ term: "猫", kana: "ねこ" }, "https://evil.example"),
    routeContext(),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: "Invalid origin",
    code: "invalid_origin",
  });
  assert.equal(calls.auth, 0);
});

test("handlers reject missing and non-Japanese topics", async (t) => {
  await t.test("missing topic", async () => {
    const { calls, dependencies } = createDependencies({
      getTopic: async (topicId) => {
        calls.topics.push(topicId);
        return null;
      },
    });
    const { GET } = createWordSuggestionRouteHandlers(dependencies);

    const response = await GET(getRequest(), routeContext());

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: "Không tìm thấy chủ đề.",
      code: "topic_not_found",
    });
    assert.deepEqual(calls.searches, []);
  });

  await t.test("unsupported topic language", async () => {
    const { calls, dependencies } = createDependencies({
      getTopic: async (topicId) => {
        calls.topics.push(topicId);
        return { languageCode: "en" };
      },
    });
    const { POST } = createWordSuggestionRouteHandlers(dependencies);

    const response = await POST(
      postRequest({ term: "cat", kana: "cat" }),
      routeContext("tieng-anh"),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Chức năng gợi ý chỉ hỗ trợ chủ đề tiếng Nhật.",
      code: "unsupported_language",
    });
    assert.deepEqual(calls.details, []);
  });
});

test("handlers return 400 for invalid route, query, JSON, and selection input", async (t) => {
  await t.test("invalid topic id", async () => {
    const { dependencies } = createDependencies();
    const { GET } = createWordSuggestionRouteHandlers(dependencies);
    const response = await GET(getRequest(), routeContext("INVALID TOPIC"));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_topic_id");
  });

  await t.test("missing query", async () => {
    const { calls, dependencies } = createDependencies();
    const { GET } = createWordSuggestionRouteHandlers(dependencies);
    const response = await GET(getRequest(null), routeContext());
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_query");
    assert.deepEqual(calls.topics, []);
  });

  await t.test("malformed JSON", async () => {
    const { calls, dependencies } = createDependencies();
    const { POST } = createWordSuggestionRouteHandlers(dependencies);
    const response = await POST(postRequest("{"), routeContext());
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_selection");
    assert.deepEqual(calls.topics, []);
  });

  await t.test("unknown detail field", async () => {
    const { calls, dependencies } = createDependencies();
    const { POST } = createWordSuggestionRouteHandlers(dependencies);
    const response = await POST(
      postRequest({ term: "猫", kana: "ねこ", audioUrl: "https://evil.example/a.mp3" }),
      routeContext(),
    );
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_selection");
    assert.deepEqual(calls.details, []);
  });
});

test("provider failures use explicit 502 errors and missing selected words use 404", async (t) => {
  await t.test("Jotoba unavailable", async () => {
    const { calls, dependencies } = createDependencies();
    dependencies.service.search = async () => {
      throw new WordSuggestionServiceError(
        "upstream_request_failed",
        "Không thể kết nối tới Jotoba.",
      );
    };
    const { GET } = createWordSuggestionRouteHandlers(dependencies);

    const response = await GET(getRequest(), routeContext());

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "Không thể kết nối tới Jotoba.",
      code: "upstream_request_failed",
    });
    assert.equal(calls.logs.length, 1);
  });

  await t.test("selected word disappeared", async () => {
    const { calls, dependencies } = createDependencies();
    dependencies.service.getDetail = async () => {
      throw new WordSuggestionServiceError(
        "word_not_found",
        "Không còn tìm thấy từ đã chọn trên Jotoba.",
      );
    };
    const { POST } = createWordSuggestionRouteHandlers(dependencies);

    const response = await POST(
      postRequest({ term: "猫", kana: "ねこ" }),
      routeContext(),
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: "Không còn tìm thấy từ đã chọn trên Jotoba.",
      code: "word_not_found",
    });
    assert.equal(calls.logs.length, 0);
  });
});
