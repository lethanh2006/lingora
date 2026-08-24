import type { WordSuggestionDetail } from "./schemas/word-suggestion.schema.ts";

export type WordSuggestionFormValue = {
  term: string;
  meaning: string;
  pronunciation: string;
  example: string;
  exampleMeaning: string;
  audioUrl: string;
};

/** Applies provider data without clearing optional values that were entered manually. */
export function applyWordSuggestion<T extends WordSuggestionFormValue>(
  current: T,
  detail: WordSuggestionDetail,
): T {
  return {
    ...current,
    term: detail.term,
    meaning: detail.meaning ?? current.meaning,
    pronunciation: detail.kana,
    example: detail.example?.japanese ?? current.example,
    exampleMeaning: detail.example?.meaning ?? current.exampleMeaning,
    audioUrl: detail.audioUrl ?? current.audioUrl,
  };
}
