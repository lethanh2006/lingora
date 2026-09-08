import Link from "next/link";
import { ArrowUpRight, Bookmark, Check, Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type {
  TopicProgressDto,
  VocabularyTopicDto,
} from "@/features/vocabulary/schemas/vocabulary.schema";
import { getVocabularyLanguageCopy } from "@/features/vocabulary/vocabulary-language";

const accents = {
  emerald: "bg-[#e8f2e4] text-[#467447]",
  blue: "bg-[#e7eef9] text-[#416da8]",
  violet: "bg-[#eeebf9] text-[#8060a9]",
  amber: "bg-[#fcf0d8] text-[#9b772e]",
  rose: "bg-[#f8e9e9] text-[#b76a72]",
  cyan: "bg-[#e4f2f2] text-[#407f88]",
};

export function TopicCard({
  topic,
  progress,
  saved,
  onToggleSaved,
}: {
  topic: VocabularyTopicDto;
  progress?: TopicProgressDto;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const masteredCount = Math.min(
    progress?.masteredWordIds.length ?? 0,
    topic.wordCount,
  );
  const percent =
    topic.wordCount > 0
      ? Math.round((masteredCount / topic.wordCount) * 100)
      : 0;
  const started = (progress?.sessionsCompleted ?? 0) > 0;
  return (
    <Card className="group relative flex h-full min-w-0 flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_8px_28px_#243b3209]">
      <div
        className={`relative m-2 mb-0 flex h-28 items-center justify-between overflow-hidden rounded-xl px-5 ${accents[topic.accent]}`}
      >
        <span
          className="relative z-10 text-5xl transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        >
          {topic.icon}
        </span>
        <div className="dot-pattern absolute inset-y-0 right-0 w-1/2 opacity-15" />
        <span className="absolute -right-3 -bottom-5 size-28 rounded-full border-[18px] border-current opacity-[0.06]" />
        <span className="relative mr-7 rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-bold">
          {getVocabularyLanguageCopy(topic.languageCode).name}
        </span>
      </div>
      {onToggleSaved && (
        <button
          type="button"
          onClick={onToggleSaved}
          aria-label={`${saved ? "Bỏ lưu" : "Lưu"} chủ đề ${topic.title}`}
          aria-pressed={saved}
          className={`absolute top-5 right-5 z-20 grid size-8 place-items-center rounded-full bg-white/85 transition hover:bg-white ${saved ? "text-primary" : "text-muted-foreground"}`}
        >
          <Bookmark className="size-4" fill={saved ? "currentColor" : "none"} />
        </button>
      )}
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{topic.wordCount} từ vựng</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" />{" "}
            {Math.max(1, Math.ceil(Math.min(topic.wordCount, 20) / 4))} phút /
            phiên
          </span>
        </div>
        <h2 className="text-lg font-bold tracking-tight">
          <Link
            href={`/learn/${topic.id}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
          >
            {topic.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-6 text-muted-foreground">
          {topic.description}
        </p>
        <div
          className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`Tiến độ ${topic.title}`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary/75"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground">
            {percent === 100 ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <Check className="size-3.5" /> Đã ghi nhớ tất cả
              </span>
            ) : started ? (
              `Đã nhớ ${masteredCount}/${topic.wordCount} từ`
            ) : (
              "Chờ bạn khám phá"
            )}
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-primary">
            {started ? "Học tiếp" : "Bắt đầu"}
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
