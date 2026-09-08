import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Gamepad2,
  Lightbulb,
  Sprout,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopicCard } from "./topic-card";
import { StudyIllustration } from "./study-illustration";
import type {
  TopicProgressDto,
  VocabularyTopicDto,
} from "../schemas/vocabulary.schema";
import { calculatePracticeStreak } from "../vocabulary-stats";
import { getContinueTopic, getPracticeWeek } from "../topic-discovery";

export function DashboardOverview({
  displayName,
  isAdmin,
  topics,
  progressItems,
  practiceDays,
  todayId,
}: {
  displayName: string;
  isAdmin: boolean;
  topics: VocabularyTopicDto[];
  progressItems: TopicProgressDto[];
  practiceDays: string[];
  todayId: string;
}) {
  const progressByTopic = new Map(
    progressItems.map((item) => [item.topicId, item]),
  );
  const masteredCount = new Set(
    progressItems.flatMap((item) => item.masteredWordIds),
  ).size;
  const sessions = progressItems.reduce(
    (total, item) => total + item.sessionsCompleted,
    0,
  );
  const studyMinutes = Math.floor(
    progressItems.reduce((total, item) => total + item.totalStudySeconds, 0) /
      60,
  );
  const streak = calculatePracticeStreak(practiceDays, todayId);
  const nextTopic = getContinueTopic(topics, progressItems);
  const hasProgress = sessions > 0;
  const practicedToday = practiceDays.includes(todayId);
  const week = getPracticeWeek(practiceDays, todayId);
  const weekCount = week.filter((day) => day.active).length;
  const dateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${todayId}T00:00:00Z`));
  const stats = [
    {
      label: "Chuỗi ngày học",
      value: streak,
      unit: "ngày",
      icon: Flame,
      color: "bg-[#fff0dd] text-[#c47c32]",
    },
    {
      label: "Từ đã ghi nhớ",
      value: masteredCount,
      unit: "từ",
      icon: Brain,
      color: "bg-[#e9efdf] text-primary",
    },
    {
      label: "Phiên đã hoàn thành",
      value: sessions,
      unit: "phiên",
      icon: Gamepad2,
      color: "bg-[#eeebf9] text-[#8b6eaa]",
    },
    {
      label: "Thời gian học",
      value: studyMinutes,
      unit: "phút",
      icon: Clock3,
      color: "bg-[#e5eef7] text-[#5c85ab]",
    },
  ];
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Góc học tập của bạn</p>
          <h1 className="page-title mt-3">
            Chào {displayName.trim().split(/\s+/).at(-1) || "bạn"}, cùng học nhé{" "}
            <span className="inline-block text-2xl" aria-hidden="true">
              ☀️
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Một bước nhỏ hôm nay, một tiến bộ lớn ngày mai.
          </p>
        </div>
        <p className="mb-1 text-xs text-muted-foreground">{dateLabel}</p>
      </header>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, unit, icon: Icon, color }) => (
          <Card key={label} className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                {label}
              </span>
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${color}`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-[28px] font-bold tracking-tight">
              {value}
              <span className="ml-2 text-xs font-normal tracking-normal text-muted-foreground">
                {unit}
              </span>
            </p>
          </Card>
        ))}
      </div>
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-8">
          <section className="relative overflow-hidden rounded-[24px] border border-[#dce5c4] bg-[#eaf0d8] p-6 sm:p-8">
            <div className="relative z-10 sm:max-w-[62%]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-bold text-primary">
                <Sprout className="size-3.5" />
                {hasProgress ? "Tiếp nối hành trình" : "Bắt đầu hành trình"}
              </span>
              <h2 className="mt-4 text-2xl font-bold leading-tight tracking-[-0.035em] sm:text-3xl">
                {hasProgress
                  ? "Thêm một chút tiến bộ, mỗi ngày."
                  : "Gieo một từ mới. Mở một thế giới."}
              </h2>
              <p className="mt-3 text-xs leading-6 text-[#62754f] sm:text-sm">
                {nextTopic
                  ? hasProgress
                    ? `Cùng quay lại với “${nextTopic.title}” và củng cố những từ bạn đã gặp.`
                    : "Bắt đầu bằng vài tấm thẻ. Bạn sẽ ngạc nhiên với những gì mình nhớ được."
                  : "Khám phá kho từ vựng và tìm cảm hứng cho buổi học đầu tiên."}
              </p>
              <Link
                href={
                  nextTopic
                    ? `/learn/${nextTopic.id}/practice/flashcards`
                    : "/learn"
                }
                className={`${buttonVariants()} mt-5 text-xs`}
              >
                {hasProgress ? "Tiếp tục học" : "Bắt đầu học"}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="pointer-events-none absolute -right-5 top-5 hidden w-64 sm:block">
              <StudyIllustration compact />
            </div>
          </section>
          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-muted-foreground">
                  Dành chút thời gian cho điều mới
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight">
                  Chủ đề dành cho bạn
                </h2>
              </div>
              <Link
                href="/learn"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary"
              >
                Xem tất cả
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            {topics.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
                <Sprout className="mx-auto size-8 text-primary" />
                <h3 className="mt-3 font-bold">
                  Một hành trình mới đang chờ bạn
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Những chủ đề đầu tiên đang được chuẩn bị.
                </p>
                {isAdmin && (
                  <Link
                    href="/admin/topics"
                    className={`${buttonVariants()} mt-4`}
                  >
                    Tạo chủ đề đầu tiên
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {topics.slice(0, 4).map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    progress={progressByTopic.get(topic.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Nhịp học tuần này</h2>
              <Flame className="size-4 text-[#c47c32]" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {weekCount > 0
                ? `Bạn đã dành ${weekCount} ngày cho bản thân.`
                : "Mỗi buổi học đều là một khởi đầu tốt."}
            </p>
            <div className="mt-6 grid grid-cols-7 gap-1">
              {week.map((day) => (
                <div
                  key={day.id}
                  className="text-center"
                  aria-label={`${day.label}, ${day.id}: ${day.active ? "đã học" : day.future ? "sắp tới" : "chưa học"}`}
                >
                  <span
                    className={`text-[9px] font-medium ${day.today ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {day.label}
                  </span>
                  <span
                    className={`mx-auto mt-2 grid size-7 place-items-center rounded-full text-[10px] ${day.active ? "bg-primary text-white" : day.today ? "border-2 border-primary bg-primary/5 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {day.active ? (
                      <Check className="size-3" />
                    ) : (
                      Number(day.id.slice(-2))
                    )}
                  </span>
                  <span
                    className={`mx-auto mt-1.5 block size-1 rounded-full ${day.today ? "bg-primary" : "bg-transparent"}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 border-t pt-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className={`mt-0.5 size-4 shrink-0 ${practicedToday ? "text-primary" : "text-muted-foreground"}`}
                />
                <div>
                  <p className="text-xs font-bold">
                    {practicedToday
                      ? "Bạn đã học hôm nay!"
                      : "Mục tiêu nhỏ: 1 phiên hôm nay"}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {practicedToday
                      ? "Bạn có thể nghỉ ngơi hoặc học thêm một chút."
                      : "Chỉ vài phút để duy trì một thói quen tốt."}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-bold">Một ngôn ngữ, một chân trời</h2>
            <div className="mt-4 space-y-1">
              {[
                {
                  code: "en",
                  name: "Tiếng Anh",
                  sub: "Hello, world!",
                  flag: "🇬🇧",
                },
                {
                  code: "ja",
                  name: "Tiếng Nhật",
                  sub: "こんにちは",
                  flag: "🇯🇵",
                },
                {
                  code: "zh",
                  name: "Tiếng Trung",
                  sub: "你好，世界",
                  flag: "🇨🇳",
                },
              ].map((language) => (
                <Link
                  key={language.code}
                  href={`/learn?language=${language.code}`}
                  className="flex items-center gap-3 rounded-xl px-1 py-3 transition hover:bg-muted"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-muted text-xl">
                    {language.flag}
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-semibold">
                      {language.name}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {language.sub}
                    </span>
                  </span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Card>
          <div className="rounded-2xl border border-[#ece4c9] bg-[#fbf7e9] p-5">
            <Lightbulb className="size-5 text-[#a68a41]" strokeWidth={1.5} />
            <h2 className="mt-3 text-sm font-bold">Một mẹo nhỏ cho bạn</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Thử đoán nghĩa trước khi lật thẻ. Việc tự nhớ lại giúp bạn nhận ra
              những từ cần luyện thêm.
            </p>
            <Link
              href="/review"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#8d702c]"
            >
              Thử ngay
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
