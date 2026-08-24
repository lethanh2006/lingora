"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CompositionEvent,
  type KeyboardEvent,
} from "react";
import { LoaderCircle, Sparkles, Volume2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  wordSuggestionCandidatesSchema,
  wordSuggestionDetailSchema,
  type WordSuggestionCandidate,
  type WordSuggestionDetail,
} from "@/features/vocabulary/schemas/word-suggestion.schema";

const SEARCH_DELAY_MS = 350;

type SearchState =
  | { query: string; status: "idle" | "dismissed" | "applied" }
  | { query: string; status: "loading" }
  | { query: string; status: "success"; suggestions: WordSuggestionCandidate[] }
  | { query: string; status: "empty" }
  | { query: string; status: "error"; message: string };

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : fallback;
}

export function JapaneseWordSuggestionField({
  topicId,
  value,
  disabled = false,
  onValueChange,
  onApply,
}: {
  topicId: string;
  value: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onApply: (detail: WordSuggestionDetail) => void;
}) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchSequenceRef = useRef(0);
  const detailSequenceRef = useRef(0);
  const skipQueryRef = useRef<string | null>(null);
  const dismissedQueryRef = useRef<string | null>(null);
  const normalizedQuery = value.trim();
  const [isComposing, setIsComposing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchState, setSearchState] = useState<SearchState>({
    query: "",
    status: "idle",
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled || isComposing || normalizedQuery.length === 0) return;
    if (skipQueryRef.current === normalizedQuery) {
      skipQueryRef.current = null;
      return;
    }
    skipQueryRef.current = null;
    if (dismissedQueryRef.current === normalizedQuery) return;

    const sequence = searchSequenceRef.current + 1;
    searchSequenceRef.current = sequence;
    const controller = new AbortController();
    searchControllerRef.current?.abort();
    searchControllerRef.current = controller;

    const timer = window.setTimeout(() => {
      setActiveIndex(-1);
      setSearchState({ query: normalizedQuery, status: "loading" });

      void (async () => {
        try {
          const response = await fetch(
            `/api/admin/topics/${encodeURIComponent(topicId)}/word-suggestions?q=${encodeURIComponent(normalizedQuery)}`,
            { cache: "no-store", signal: controller.signal },
          );
          if (!response.ok) {
            throw new Error(await responseError(response, "Không thể tìm gợi ý tiếng Nhật"));
          }

          const body = (await response.json()) as { suggestions?: unknown };
          const suggestions = wordSuggestionCandidatesSchema.parse(body.suggestions);
          if (controller.signal.aborted || searchSequenceRef.current !== sequence) return;

          setSearchState(
            suggestions.length > 0
              ? { query: normalizedQuery, status: "success", suggestions }
              : { query: normalizedQuery, status: "empty" },
          );
        } catch (reason) {
          if (controller.signal.aborted || searchSequenceRef.current !== sequence) return;
          setSearchState({
            query: normalizedQuery,
            status: "error",
            message: reason instanceof Error ? reason.message : "Không thể tìm gợi ý tiếng Nhật",
          });
        }
      })();
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, isComposing, normalizedQuery, retryKey, topicId]);

  const currentState =
    searchState.query === normalizedQuery
      ? searchState
      : ({ query: normalizedQuery, status: "idle" } satisfies SearchState);
  const suggestions = currentState.status === "success" ? currentState.suggestions : [];
  const hasSuggestions = suggestions.length > 0;
  const activeOptionId =
    hasSuggestions && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  function handleValueChange(nextValue: string) {
    detailSequenceRef.current += 1;
    dismissedQueryRef.current = null;
    setActiveIndex(-1);
    setSelectedKey(null);
    setSelectionError(null);
    onValueChange(nextValue);
  }

  function handleCompositionStart() {
    searchControllerRef.current?.abort();
    setIsComposing(true);
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    setIsComposing(false);
    handleValueChange(event.currentTarget.value);
  }

  async function selectSuggestion(candidate: WordSuggestionCandidate) {
    const key = `${candidate.term}\u0000${candidate.kana}`;
    const sequence = detailSequenceRef.current + 1;
    detailSequenceRef.current = sequence;
    searchControllerRef.current?.abort();
    setSelectedKey(key);
    setSelectionError(null);

    try {
      const response = await fetch(
        `/api/admin/topics/${encodeURIComponent(topicId)}/word-suggestions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: candidate.term, kana: candidate.kana }),
        },
      );
      if (!response.ok) {
        throw new Error(await responseError(response, "Không thể lấy chi tiết từ đã chọn"));
      }

      const body = (await response.json()) as { detail?: unknown };
      const detail = wordSuggestionDetailSchema.parse(body.detail);
      if (detailSequenceRef.current !== sequence) return;

      skipQueryRef.current = detail.term.trim();
      dismissedQueryRef.current = detail.term.trim();
      setActiveIndex(-1);
      setSearchState({ query: detail.term.trim(), status: "applied" });
      onApply(detail);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } catch (reason) {
      if (detailSequenceRef.current !== sequence) return;
      setSelectionError(
        reason instanceof Error ? reason.message : "Không thể lấy chi tiết từ đã chọn",
      );
    } finally {
      if (detailSequenceRef.current === sequence) setSelectedKey(null);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!hasSuggestions) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      dismissedQueryRef.current = normalizedQuery;
      setActiveIndex(-1);
      setSearchState({ query: normalizedQuery, status: "dismissed" });
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="word-term" className="text-sm font-medium">
        Từ / cụm từ tiếng Nhật *
      </label>
      <Input
        ref={inputRef}
        id="word-term"
        value={value}
        onChange={(event) => handleValueChange(event.target.value)}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        placeholder="Nhập kanji, kana hoặc romaji để nhận gợi ý"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={hasSuggestions}
        aria-controls={hasSuggestions ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-busy={currentState.status === "loading"}
        disabled={disabled}
        required
      />

      <div className="rounded-xl border border-dashed bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" />
          Gợi ý tự động
        </div>

        {normalizedQuery.length === 0 && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Gõ một từ để tìm cách đọc, nghĩa, câu ví dụ và âm thanh.
          </p>
        )}
        {currentState.status === "loading" && (
          <p role="status" className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin" /> Đang tìm trên Jotoba…
          </p>
        )}
        {currentState.status === "empty" && (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            Chưa tìm thấy gợi ý phù hợp.
          </p>
        )}
        {currentState.status === "error" && (
          <div role="alert" className="mt-2 flex items-center justify-between gap-2 text-xs text-destructive">
            <span>{currentState.message}</span>
            <button
              type="button"
              className="shrink-0 font-semibold underline underline-offset-2"
              onClick={() => setRetryKey((current) => current + 1)}
            >
              Thử lại
            </button>
          </div>
        )}
        {currentState.status === "applied" && (
          <p role="status" className="mt-2 text-xs text-emerald-700">
            Đã tự điền dữ liệu. Hãy kiểm tra lại trước khi lưu.
          </p>
        )}

        {hasSuggestions && (
          <>
            <p role="status" className="sr-only">
              Có {suggestions.length} gợi ý tiếng Nhật.
            </p>
            <ul id={listboxId} role="listbox" aria-label="Gợi ý từ tiếng Nhật" className="mt-2 space-y-1.5">
              {suggestions.map((candidate, index) => {
                const key = `${candidate.term}\u0000${candidate.kana}`;
                const isPending = selectedKey === key;
                return (
                  <li key={key} role="presentation">
                    <button
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === index}
                      disabled={selectedKey !== null}
                      className="flex w-full items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left text-xs transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => void selectSuggestion(candidate)}
                    >
                      <span className="min-w-0">
                        <span className="block font-bold text-foreground">
                          {candidate.term} <span className="font-normal text-muted-foreground">{candidate.kana}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-muted-foreground">
                          {candidate.glossEnglish}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-primary">
                        {isPending ? (
                          <LoaderCircle className="size-3 animate-spin" />
                        ) : candidate.audioUrl ? (
                          <Volume2 className="size-3" />
                        ) : null}
                        {isPending ? "Đang điền" : candidate.audioUrl ? "Có audio" : "Chọn"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {selectionError && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {selectionError}
          </p>
        )}

        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
          Dữ liệu từ <a className="underline" href="https://jotoba.de/about" target="_blank" rel="noreferrer">Jotoba/JMdict</a>; bản dịch qua <a className="underline" href="https://mymemory.translated.net" target="_blank" rel="noreferrer">MyMemory</a>. Audio từ <a className="underline" href="https://github.com/kanjialive/kanji-data-media" target="_blank" rel="noreferrer">Kanji Alive (CC BY 4.0)</a> hoặc <a className="underline" href="https://github.com/tofugu/japanese-vocabulary-pronunciation-audio" target="_blank" rel="noreferrer">Tofugu (CC BY-SA 4.0)</a>; nếu thiếu sẽ dùng giọng đọc trình duyệt.
        </p>
      </div>
    </div>
  );
}
