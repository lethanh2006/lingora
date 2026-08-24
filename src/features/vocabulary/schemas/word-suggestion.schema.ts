import { z } from "zod";

const suggestionTextSchema = z.string().trim().min(1);
const suggestionAudioUrlSchema = z
  .string()
  .url()
  .max(2_000)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "URL âm thanh phải dùng HTTPS.",
  })
  .nullable();

export const wordSuggestionSearchInputSchema = z
  .object({
    query: suggestionTextSchema.max(120),
  })
  .strict();

export const wordSuggestionDetailInputSchema = z
  .object({
    term: suggestionTextSchema.max(120),
    kana: suggestionTextSchema.max(160),
  })
  .strict();

export const wordSuggestionCandidateSchema = z
  .object({
    term: suggestionTextSchema.max(120),
    kana: suggestionTextSchema.max(160),
    glossEnglish: suggestionTextSchema.max(240),
    audioUrl: suggestionAudioUrlSchema,
  })
  .strict();

export const wordSuggestionCandidatesSchema = z.array(wordSuggestionCandidateSchema).max(6);

export const wordSuggestionExampleSchema = z
  .object({
    japanese: suggestionTextSchema.max(500),
    furigana: z.string().trim().max(1_000).nullable(),
    english: suggestionTextSchema.max(500),
    meaning: suggestionTextSchema.max(500).nullable(),
  })
  .strict();

export const wordSuggestionDetailSchema = z
  .object({
    term: suggestionTextSchema.max(120),
    kana: suggestionTextSchema.max(160),
    glossEnglish: suggestionTextSchema.max(240),
    meaning: suggestionTextSchema.max(240).nullable(),
    audioUrl: suggestionAudioUrlSchema,
    example: wordSuggestionExampleSchema.nullable(),
  })
  .strict();

export type WordSuggestionSearchInput = z.infer<typeof wordSuggestionSearchInputSchema>;
export type WordSuggestionDetailInput = z.infer<typeof wordSuggestionDetailInputSchema>;
export type WordSuggestionCandidate = z.infer<typeof wordSuggestionCandidateSchema>;
export type WordSuggestionExample = z.infer<typeof wordSuggestionExampleSchema>;
export type WordSuggestionDetail = z.infer<typeof wordSuggestionDetailSchema>;
