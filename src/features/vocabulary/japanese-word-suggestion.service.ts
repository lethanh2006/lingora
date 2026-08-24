import "server-only";

import { z } from "zod";

import {
  wordSuggestionCandidateSchema,
  wordSuggestionCandidatesSchema,
  wordSuggestionDetailInputSchema,
  wordSuggestionDetailSchema,
  wordSuggestionSearchInputSchema,
  type WordSuggestionCandidate,
  type WordSuggestionDetail,
  type WordSuggestionDetailInput,
} from "./schemas/word-suggestion.schema.ts";

const JOTOBA_ORIGIN = "https://jotoba.de";
const JOTOBA_WORDS_URL = `${JOTOBA_ORIGIN}/api/search/words`;
const JOTOBA_SENTENCES_URL = `${JOTOBA_ORIGIN}/api/search/sentences`;
const MY_MEMORY_URL = "https://api.mymemory.translated.net/get";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_CANDIDATES = 6;
const MAX_GLOSS_LENGTH = 240;
const MAX_EXAMPLE_LENGTH = 500;

const nonEmptyUpstreamTextSchema = z.string().trim().min(1);

const jotobaReadingSchema = z
  .object({
    kana: nonEmptyUpstreamTextSchema,
    kanji: nonEmptyUpstreamTextSchema.nullish(),
  })
  .passthrough();

const jotobaSenseSchema = z
  .object({
    glosses: z.array(z.string()),
    language: z.string(),
  })
  .passthrough();

const jotobaWordSchema = z
  .object({
    reading: jotobaReadingSchema,
    senses: z.array(z.unknown()),
    audio: z.unknown().optional(),
  })
  .passthrough();

const jotobaWordsResponseSchema = z
  .object({
    words: z.array(z.unknown()),
  })
  .passthrough();

const jotobaSentenceSchema = z
  .object({
    content: nonEmptyUpstreamTextSchema,
    furigana: z.string().trim().optional(),
    translation: z.string().trim().optional(),
    language: z.string().optional(),
    eng: z.string().trim().optional(),
  })
  .passthrough();

const jotobaSentencesResponseSchema = z
  .object({
    sentences: z.array(z.unknown()),
  })
  .passthrough();

const myMemoryResponseSchema = z
  .object({
    responseStatus: z.union([z.number(), z.string()]),
    responseData: z
      .object({
        translatedText: nonEmptyUpstreamTextSchema,
      })
      .passthrough(),
  })
  .passthrough();

export type WordSuggestionFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type JapaneseWordSuggestionServiceOptions = {
  fetch?: WordSuggestionFetch;
  timeoutMs?: number;
};

export type WordSuggestionServiceErrorCode =
  | "upstream_request_failed"
  | "invalid_upstream_response"
  | "word_not_found";

export class WordSuggestionServiceError extends Error {
  readonly code: WordSuggestionServiceErrorCode;

  constructor(code: WordSuggestionServiceErrorCode, message: string) {
    super(message);
    this.name = "WordSuggestionServiceError";
    this.code = code;
  }
}

function limitText(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/gu, " ").slice(0, maxLength).trim();
}

function isJotobaAudioPath(pathname: string): boolean {
  return (
    /^\/resource\/audio\/(?:kanjialive|tofugu)\/\d+$/u.test(pathname) ||
    pathname.startsWith("/audio/") ||
    pathname.startsWith("/assets/audio/")
  );
}

/** Converts a supported Jotoba audio path to a canonical, playable HTTPS URL. */
export function normalizeJotobaAudioUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  try {
    const rawValue = value.trim();
    const isAbsolute = /^[a-z][a-z\d+.-]*:/iu.test(rawValue);
    let audioPath = rawValue;
    if (!isAbsolute && !rawValue.startsWith("/")) {
      if (rawValue.startsWith("audio/") || rawValue.startsWith("assets/audio/")) {
        audioPath = `/${rawValue}`;
      } else if (rawValue.startsWith("mp3/")) {
        audioPath = `/audio/${rawValue}`;
      } else if (!rawValue.includes("/")) {
        // The legacy search endpoint returns only the generated MP3 filename.
        audioPath = `/audio/mp3/${rawValue}`;
      }
    }

    const url = new URL(audioPath, JOTOBA_ORIGIN);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.hostname.toLowerCase() !== "jotoba.de") return null;
    if (url.username.length > 0 || url.password.length > 0) return null;
    if (!isJotobaAudioPath(url.pathname)) return null;

    url.protocol = "https:";
    url.port = "";
    url.hash = "";
    url.searchParams.set("download", "true");
    return url.toString();
  } catch {
    return null;
  }
}

function englishGloss(word: z.infer<typeof jotobaWordSchema>): string | null {
  for (const rawSense of word.senses) {
    const parsedSense = jotobaSenseSchema.safeParse(rawSense);
    if (!parsedSense.success || parsedSense.data.language.toLowerCase() !== "english") continue;

    const gloss = parsedSense.data.glosses.find((item) => item.trim().length > 0);
    if (gloss) return limitText(gloss, MAX_GLOSS_LENGTH);
  }
  return null;
}

function parseJotobaCandidates(payload: unknown): WordSuggestionCandidate[] {
  const parsedPayload = jotobaWordsResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new WordSuggestionServiceError(
      "invalid_upstream_response",
      "Jotoba trả về dữ liệu từ vựng không hợp lệ.",
    );
  }

  const candidates: WordSuggestionCandidate[] = [];
  const seen = new Set<string>();

  for (const rawWord of parsedPayload.data.words) {
    const parsedWord = jotobaWordSchema.safeParse(rawWord);
    if (!parsedWord.success) continue;

    const kana = parsedWord.data.reading.kana.trim();
    const term = parsedWord.data.reading.kanji?.trim() || kana;
    const glossEnglish = englishGloss(parsedWord.data);
    if (!glossEnglish) continue;

    const key = `${term}\u0000${kana}`;
    if (seen.has(key)) continue;

    const candidate = wordSuggestionCandidateSchema.safeParse({
      term,
      kana,
      glossEnglish,
      audioUrl: normalizeJotobaAudioUrl(parsedWord.data.audio),
    });
    if (!candidate.success) continue;

    seen.add(key);
    candidates.push(candidate.data);
  }

  return candidates;
}

type ParsedSentence = z.infer<typeof jotobaSentenceSchema> & {
  english: string;
};

function parseJotobaSentences(payload: unknown): ParsedSentence[] {
  const parsedPayload = jotobaSentencesResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new WordSuggestionServiceError(
      "invalid_upstream_response",
      "Jotoba trả về dữ liệu câu ví dụ không hợp lệ.",
    );
  }

  const sentences: ParsedSentence[] = [];
  for (const rawSentence of parsedPayload.data.sentences) {
    const parsedSentence = jotobaSentenceSchema.safeParse(rawSentence);
    if (!parsedSentence.success) continue;

    const language = parsedSentence.data.language?.toLowerCase();
    const english =
      language === "english"
        ? parsedSentence.data.translation
        : parsedSentence.data.eng || (language ? undefined : parsedSentence.data.translation);
    if (!english?.trim()) continue;

    sentences.push({
      ...parsedSentence.data,
      content: limitText(parsedSentence.data.content, MAX_EXAMPLE_LENGTH),
      english: limitText(english, MAX_EXAMPLE_LENGTH),
    });
  }
  return sentences;
}

function jotobaPayload(query: string) {
  return {
    query,
    language: "English",
    no_english: false,
  };
}

export function createJapaneseWordSuggestionService(
  options: JapaneseWordSuggestionServiceOptions = {},
) {
  const fetcher: WordSuggestionFetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
    throw new TypeError("timeoutMs phải là số nguyên từ 1 đến 60000.");
  }

  async function requestJson(
    url: string | URL,
    init: RequestInit,
    upstreamName: "Jotoba" | "MyMemory",
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetcher(url, {
          ...init,
          cache: "no-store",
          signal: controller.signal,
        });
      } catch {
        throw new WordSuggestionServiceError(
          "upstream_request_failed",
          controller.signal.aborted
            ? `${upstreamName} phản hồi quá thời gian.`
            : `Không thể kết nối tới ${upstreamName}.`,
        );
      }

      if (!response.ok) {
        throw new WordSuggestionServiceError(
          "upstream_request_failed",
          `${upstreamName} phản hồi với trạng thái ${response.status}.`,
        );
      }

      try {
        return await response.json();
      } catch {
        throw new WordSuggestionServiceError(
          controller.signal.aborted
            ? "upstream_request_failed"
            : "invalid_upstream_response",
          controller.signal.aborted
            ? `${upstreamName} phản hồi quá thời gian.`
            : `${upstreamName} trả về JSON không hợp lệ.`,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchWords(query: string): Promise<WordSuggestionCandidate[]> {
    const payload = await requestJson(
      JOTOBA_WORDS_URL,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jotobaPayload(query)),
      },
      "Jotoba",
    );
    return parseJotobaCandidates(payload);
  }

  async function fetchSentences(query: string): Promise<ParsedSentence[]> {
    const payload = await requestJson(
      JOTOBA_SENTENCES_URL,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jotobaPayload(query)),
      },
      "Jotoba",
    );
    return parseJotobaSentences(payload);
  }

  async function translateToVietnamese(
    text: string,
    maxLength: number,
  ): Promise<string | null> {
    const source = limitText(text, maxLength);
    const url = new URL(MY_MEMORY_URL);
    url.searchParams.set("q", source);
    url.searchParams.set("langpair", "en|vi");

    try {
      const payload = await requestJson(
        url,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
        "MyMemory",
      );
      const parsed = myMemoryResponseSchema.safeParse(payload);
      if (!parsed.success || Number(parsed.data.responseStatus) !== 200) return null;
      return limitText(parsed.data.responseData.translatedText, maxLength) || null;
    } catch {
      return null;
    }
  }

  return {
    async search(query: string): Promise<WordSuggestionCandidate[]> {
      const { query: normalizedQuery } = wordSuggestionSearchInputSchema.parse({ query });
      const candidates = (await fetchWords(normalizedQuery)).slice(0, MAX_CANDIDATES);
      return wordSuggestionCandidatesSchema.parse(candidates);
    },

    async getDetail(input: WordSuggestionDetailInput): Promise<WordSuggestionDetail> {
      const selection = wordSuggestionDetailInputSchema.parse(input);
      const [candidates, sentences] = await Promise.all([
        fetchWords(selection.term),
        fetchSentences(selection.term).catch(() => []),
      ]);

      const candidate =
        candidates.find(
          (item) => item.term === selection.term && item.kana === selection.kana,
        );
      if (!candidate) {
        throw new WordSuggestionServiceError(
          "word_not_found",
          "Không còn tìm thấy từ đã chọn trên Jotoba.",
        );
      }

      const sentence =
        sentences.find(
          (item) =>
            item.content.includes(candidate.term) || item.content.includes(candidate.kana),
        ) ?? sentences[0];
      const [meaning, exampleMeaning] = await Promise.all([
        translateToVietnamese(candidate.glossEnglish, MAX_GLOSS_LENGTH),
        sentence
          ? translateToVietnamese(sentence.english, MAX_EXAMPLE_LENGTH)
          : Promise.resolve(null),
      ]);

      return wordSuggestionDetailSchema.parse({
        ...candidate,
        meaning,
        example: sentence
          ? {
              japanese: sentence.content,
              furigana: sentence.furigana?.trim() || null,
              english: sentence.english,
              meaning: exampleMeaning,
            }
          : null,
      });
    },
  };
}

export type JapaneseWordSuggestionService = ReturnType<
  typeof createJapaneseWordSuggestionService
>;

export const japaneseWordSuggestionService = createJapaneseWordSuggestionService();
