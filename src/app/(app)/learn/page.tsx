import type { Metadata } from "next";
import { LibraryBig } from "lucide-react";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { TopicExplorer } from "@/features/vocabulary/components/topic-explorer";
import { createVocabularyProgressService } from "@/features/vocabulary/vocabulary-progress.service";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Khám phá chủ đề" };

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ language?: string }>;
}) {
  const user = await requireUser();
  const db = getAdminDb();
  const [topics, progressItems, query] = await Promise.all([
    createVocabularyRepository(db).listTopics(),
    createVocabularyProgressService(db).listProgress(user.uid),
    searchParams,
  ]);
  return (
    <div className="min-w-0 space-y-8">
      <header>
        <p className="eyebrow text-primary">Thế giới từ vựng</p>
        <h1 className="page-title mt-3">Hôm nay, bạn muốn khám phá gì?</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tìm một chủ đề bạn thích. Biến những từ mới thành điều quen thuộc.
        </p>
      </header>
      {topics.length === 0 ? (
        <CatalogEmptyState
          icon={LibraryBig}
          title="Những chủ đề đầu tiên đang được chuẩn bị"
          description="Hãy quay lại sau để khám phá từ vựng tiếng Anh, Nhật và Trung."
        />
      ) : (
        <TopicExplorer
          key={query.language ?? "all"}
          topics={topics}
          progressItems={progressItems}
          userId={user.uid}
          initialLanguage={query.language}
        />
      )}
    </div>
  );
}
