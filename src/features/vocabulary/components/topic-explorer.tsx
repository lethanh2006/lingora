"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Bookmark,
  GalleryHorizontalEnd,
  Search,
  SearchX,
  SlidersHorizontal,
  TextCursorInput,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopicCard } from "./topic-card";
import { useSavedTopics } from "./use-saved-topics";
import {
  discoverTopics,
  type TopicFilter,
  type TopicSort,
} from "../topic-discovery";
import type {
  PracticeMode,
  TopicProgressDto,
  VocabularyTopicDto,
} from "../schemas/vocabulary.schema";
import { getVocabularyLanguageCopy } from "../vocabulary-language";
import { cn } from "@/lib/utils";

const languages = [
  { id: "all", label: "Tất cả ngôn ngữ", symbol: "✦" },
  { id: "en", label: "Tiếng Anh", symbol: "🇬🇧" },
  { id: "ja", label: "Tiếng Nhật", symbol: "🇯🇵" },
  { id: "zh", label: "Tiếng Trung", symbol: "🇨🇳" },
];
const filters: { id: TopicFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "started", label: "Đang học" },
  { id: "new", label: "Chưa học" },
  { id: "completed", label: "Đã ghi nhớ" },
  { id: "saved", label: "Đã lưu" },
];
const modes = [
  {
    id: "flashcards",
    title: "Lật thẻ",
    description: "Làm quen và ghi nhớ",
    icon: GalleryHorizontalEnd,
    color: "bg-[#e8f2e4] text-primary",
  },
  {
    id: "matching",
    title: "Ghép từ",
    description: "Tăng phản xạ với từ",
    icon: Blocks,
    color: "bg-[#eeebf9] text-violet-700",
  },
  {
    id: "fill",
    title: "Điền từ",
    description: "Thử sức trí nhớ",
    icon: TextCursorInput,
    color: "bg-[#fcf0d8] text-amber-700",
  },
] as const;

export function TopicExplorer({
  topics,
  progressItems,
  userId,
  initialLanguage = "all",
  practice = false,
}: {
  topics: VocabularyTopicDto[];
  progressItems: TopicProgressDto[];
  userId: string;
  initialLanguage?: string;
  practice?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState(
    languages.some((item) => item.id === initialLanguage)
      ? initialLanguage
      : "all",
  );
  const [filter, setFilter] = useState<TopicFilter>("all");
  const [sort, setSort] = useState<TopicSort>("recommended");
  const [mode, setMode] = useState<PracticeMode>("flashcards");
  const [notice, setNotice] = useState("");
  const { ids, toggle } = useSavedTopics(userId);
  const progressByTopic = useMemo(
    () => new Map(progressItems.map((item) => [item.topicId, item])),
    [progressItems],
  );
  const visible = useMemo(
    () =>
      discoverTopics(topics, progressItems, {
        query,
        language,
        filter,
        sort,
        savedIds: ids,
      }),
    [topics, progressItems, query, language, filter, sort, ids],
  );
  const hasFilters = query !== "" || language !== "all" || filter !== "all";
  function reset() {
    setQuery("");
    setLanguage("all");
    setFilter("all");
    setSort("recommended");
  }
  return (
    <div className="space-y-6">
      {practice && (
        <div
          className="grid gap-3 sm:grid-cols-3"
          aria-label="Chọn cách luyện tập"
        >
          {modes.map(({ id, title, description, icon: Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition sm:flex-col sm:items-start sm:p-5",
                mode === id
                  ? "border-primary ring-1 ring-primary"
                  : "hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl",
                  color,
                )}
              >
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Lọc ngôn ngữ">
        {languages.map(({ id, label, symbol }) => (
          <button
            key={id}
            type="button"
            aria-pressed={language === id}
            onClick={() => setLanguage(id)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition",
              language === id
                ? "border-primary bg-primary text-white"
                : "bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            <span aria-hidden="true">{symbol}</span>
            {label}
            <span
              className={cn(
                "ml-1 text-[10px]",
                language === id ? "text-white/75" : "text-muted-foreground",
              )}
            >
              {
                topics.filter(
                  (topic) => id === "all" || topic.languageCode === id,
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Tìm kiếm chủ đề"
              placeholder="Tìm chủ đề, cấp độ hoặc điều bạn thích..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="border-border bg-background pl-10 shadow-none"
            />
          </div>
          <label className="flex h-11 items-center gap-2 rounded-xl border px-3 text-xs text-muted-foreground">
            <SlidersHorizontal className="size-4 shrink-0" />
            <span className="sr-only">Sắp xếp chủ đề</span>
            <select
              className="w-full bg-transparent py-2 text-foreground outline-none sm:w-auto"
              value={sort}
              onChange={(event) => setSort(event.target.value as TopicSort)}
            >
              <option value="recommended">Thứ tự đề xuất</option>
              <option value="alphabetical">Tên A → Z</option>
              <option value="words">Ít từ trước</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-1" aria-label="Lọc tiến độ">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition",
                filter === id
                  ? "bg-muted font-bold text-primary"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {id === "saved" && <Bookmark className="size-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p role="status" className="text-muted-foreground">
          <span className="font-bold text-foreground">{visible.length}</span>{" "}
          chủ đề{" "}
          {practice
            ? `· Chế độ ${modes.find((item) => item.id === mode)?.title.toLocaleLowerCase("vi")}`
            : "đang chờ bạn khám phá"}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-8 items-center gap-1 font-semibold text-primary"
          >
            <X className="size-3.5" />
            Xóa bộ lọc
          </button>
        )}
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground"
        >
          {notice}
        </p>
      )}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted">
            <SearchX className="size-6 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-lg font-bold">
            {filter === "saved"
              ? "Chưa có chủ đề đã lưu phù hợp"
              : "Chưa tìm thấy chủ đề phù hợp"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {filter === "saved"
              ? "Nhấn biểu tượng đánh dấu trên thẻ chủ đề để tạo góc học tập của riêng bạn."
              : "Thử một từ khóa ngắn hơn hoặc chọn ngôn ngữ khác nhé."}
          </p>
          <Button variant="outline" className="mt-5" onClick={reset}>
            Xem tất cả chủ đề
          </Button>
        </div>
      ) : practice ? (
        <div className="space-y-3">
          {visible.map((topic) => (
            <article
              key={topic.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5"
            >
              <span
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-2xl"
                aria-hidden="true"
              >
                {topic.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
                  {getVocabularyLanguageCopy(topic.languageCode).name} ·{" "}
                  {topic.wordCount} từ
                </p>
                <h2 className="font-bold">{topic.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {progressByTopic.get(topic.id)?.sessionsCompleted
                    ? `Điểm ${modes.find((item) => item.id === mode)?.title.toLocaleLowerCase("vi")} tốt nhất: ${progressByTopic.get(topic.id)!.bestScores[mode]}%`
                    : "Một chủ đề mới để bạn chinh phục"}
                </p>
              </div>
              {topic.wordCount > 0 ? (
                <Link
                  href={`/learn/${topic.id}/practice/${mode}`}
                  aria-label={`Luyện ${modes.find((item) => item.id === mode)?.title.toLocaleLowerCase("vi")}: ${topic.title}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "ml-auto text-primary",
                  )}
                >
                  Luyện ngay
                  <ArrowRight className="size-3.5" />
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Sắp có từ vựng
                </span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              progress={progressByTopic.get(topic.id)}
              saved={ids.includes(topic.id)}
              onToggleSaved={() => {
                const success = toggle(topic.id);
                setNotice(
                  success
                    ? `${ids.includes(topic.id) ? "Đã bỏ lưu" : "Đã lưu"} “${topic.title}”. Chủ đề đã lưu được giữ trên trình duyệt này.`
                    : "Trình duyệt đang chặn lưu trữ. Chưa thể lưu chủ đề, bạn hãy thử lại.",
                );
              }}
            />
          ))}
        </div>
      )}
      {filter === "saved" && (
        <p className="text-center text-xs text-muted-foreground">
          Chủ đề đã lưu được giữ riêng cho tài khoản này trên trình duyệt hiện
          tại.
        </p>
      )}
    </div>
  );
}
