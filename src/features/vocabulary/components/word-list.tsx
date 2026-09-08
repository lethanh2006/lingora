"use client";

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpeakButton } from "./speak-button";
import { normalizeSearch } from "../topic-discovery";
import type {
  VocabularyTopicDto,
  VocabularyWordDto,
} from "../schemas/vocabulary.schema";

export function WordList({
  words,
  languageCode,
  masteredWordIds,
}: {
  words: VocabularyWordDto[];
  languageCode: VocabularyTopicDto["languageCode"];
  masteredWordIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [hideMeanings, setHideMeanings] = useState(false);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [onlyUnmastered, setOnlyUnmastered] = useState(false);
  const visible = useMemo(
    () =>
      words.filter(
        (word) =>
          (!onlyUnmastered || !masteredWordIds.includes(word.id)) &&
          normalizeSearch(
            `${word.term} ${word.meaning} ${word.pronunciation ?? ""}`,
          ).includes(normalizeSearch(query)),
      ),
    [words, masteredWordIds, query, onlyUnmastered],
  );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-muted-foreground">
            Làm quen trước khi luyện
          </p>
          <h2 className="mt-2 text-xl font-bold">Từ vựng trong chủ đề</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={hideMeanings}
          onClick={() => {
            setHideMeanings(!hideMeanings);
            setRevealedIds([]);
          }}
        >
          {hideMeanings ? (
            <Eye className="size-4" />
          ) : (
            <EyeOff className="size-4" />
          )}
          {hideMeanings ? "Hiện nghĩa" : "Ẩn nghĩa để tự nhớ"}
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Tìm từ trong chủ đề"
            placeholder="Tìm từ, phiên âm hoặc nghĩa..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="bg-card pl-10"
          />
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={onlyUnmastered}
            onChange={(event) => setOnlyUnmastered(event.target.checked)}
            className="size-4 accent-primary"
          />
          Chỉ từ chưa ghi nhớ
        </label>
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        {visible.length}/{words.length} từ
        {hideMeanings
          ? " · Nhấn “Xem nghĩa” khi bạn đã thử tự nhớ."
          : " · Nhấn biểu tượng loa để nghe phát âm."}
      </p>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {visible.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold">
              {onlyUnmastered && !query
                ? "Bạn đã ghi nhớ tất cả từ trong chủ đề này!"
                : "Chưa tìm thấy từ phù hợp"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-primary"
              onClick={() => {
                setQuery("");
                setOnlyUnmastered(false);
              }}
            >
              Xem tất cả từ
            </Button>
          </div>
        ) : (
          visible.map((word, index) => {
            const showMeaning = !hideMeanings || revealedIds.includes(word.id);
            const mastered = masteredWordIds.includes(word.id);
            return (
              <article
                key={word.id}
                className="flex items-start gap-3 border-b p-4 last:border-0 sm:gap-4 sm:p-5"
              >
                <span
                  className={`mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-semibold ${mastered ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  aria-label={mastered ? "Đã ghi nhớ" : undefined}
                >
                  {mastered ? (
                    <Check className="size-3.5" />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 sm:gap-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className="min-w-0 break-words text-lg font-bold"
                        lang={languageCode}
                      >
                        {word.term}
                      </h3>
                      <SpeakButton
                        text={word.term}
                        languageCode={languageCode}
                        audioUrl={word.audioUrl}
                      />
                    </div>
                    {word.pronunciation && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {word.pronunciation}
                      </p>
                    )}
                  </div>
                  <div className="self-center">
                    {showMeaning ? (
                      <>
                        <p className="text-sm font-semibold text-primary">
                          {word.meaning}
                        </p>
                        {word.example && (
                          <p
                            lang={languageCode}
                            className="mt-2 text-xs leading-5 text-muted-foreground"
                          >
                            {word.example}
                          </p>
                        )}
                        {word.exampleMeaning && (
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {word.exampleMeaning}
                          </p>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="border border-dashed text-xs text-muted-foreground"
                        onClick={() =>
                          setRevealedIds((current) => [...current, word.id])
                        }
                      >
                        <Eye className="size-3.5" />
                        Xem nghĩa
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
