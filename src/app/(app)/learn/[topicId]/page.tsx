import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Blocks,
  GalleryHorizontalEnd,
  TextCursorInput,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { WordList } from "@/features/vocabulary/components/word-list";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { createVocabularyProgressService } from "@/features/vocabulary/vocabulary-progress.service";
import { getVocabularyLanguageCopy } from "@/features/vocabulary/vocabulary-language";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

const games = [
  {
    mode: "flashcards",
    title: "Lật thẻ",
    description: "Làm quen với từ, tự đoán rồi lật thẻ để khám phá nghĩa.",
    icon: GalleryHorizontalEnd,
    color: "bg-[#e8f2e4] text-primary",
  },
  {
    mode: "matching",
    title: "Ghép từ",
    description: "Kết nối từ và nghĩa. Rèn phản xạ qua từng lượt ghép.",
    icon: Blocks,
    color: "bg-[#eeebf9] text-violet-700",
  },
  {
    mode: "fill",
    title: "Điền từ",
    description: "Thử thách trí nhớ bằng cách tự viết lại từ đã học.",
    icon: TextCursorInput,
    color: "bg-[#fcf0d8] text-amber-700",
  },
] as const;

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const user = await requireUser();
  const { topicId } = await params;
  const db = getAdminDb();
  const repository = createVocabularyRepository(db);
  const [topic, words, progressItems] = await Promise.all([
    repository.getTopic(topicId),
    repository.listWords(topicId),
    createVocabularyProgressService(db).listProgress(user.uid),
  ]);
  if (!topic) notFound();
  const progress = progressItems.find((item) => item.topicId === topicId);
  const masteredIds = words
    .filter((word) => progress?.masteredWordIds.includes(word.id))
    .map((word) => word.id);
  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Khám phá chủ đề
        </Link>
        <div className="mt-5 flex items-start gap-4 sm:gap-5">
          <span
            className="grid size-16 shrink-0 place-items-center rounded-2xl border bg-card text-4xl sm:size-20"
            aria-hidden="true"
          >
            {topic.icon}
          </span>
          <div className="min-w-0">
            <p className="eyebrow text-primary">
              {getVocabularyLanguageCopy(topic.languageCode).name} ·{" "}
              {words.length} từ vựng
            </p>
            <h1 className="page-title mt-2 break-words">{topic.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {topic.description}
            </p>
            <p className="mt-3 text-xs font-semibold text-primary">
              Đã ghi nhớ {masteredIds.length}/{words.length} từ ·{" "}
              {progress?.sessionsCompleted ?? 0} phiên luyện
            </p>
          </div>
        </div>
      </header>
      {words.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <h2 className="font-semibold">Những từ mới đang được chuẩn bị</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hãy khám phá một chủ đề khác và quay lại sau nhé.
          </p>
        </div>
      ) : (
        <>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Chọn cách bạn muốn học</h2>
              <span className="hidden text-xs text-muted-foreground">
                Mỗi phiên, một bước tiến nhỏ
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {games.map(({ mode, title, description, icon: Icon, color }) => (
                <Link
                  href={`/learn/${topic.id}/practice/${mode}`}
                  key={mode}
                  className="group"
                >
                  <Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:border-primary/35">
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid size-10 place-items-center rounded-xl ${color}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" />
                    </div>
                    <h3 className="mt-4 font-bold">{title}</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      {description}
                    </p>
                    {progress?.practicedModes.includes(mode) && (
                      <p className="mt-3 text-[11px] font-semibold text-primary">
                        Tốt nhất: {progress.bestScores[mode]}%
                      </p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </section>
          <WordList
            words={words}
            languageCode={topic.languageCode}
            masteredWordIds={masteredIds}
          />
        </>
      )}
    </div>
  );
}
