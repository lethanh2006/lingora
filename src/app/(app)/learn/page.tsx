import type { Metadata } from "next";
import { LibraryBig } from "lucide-react";

import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { TopicCard } from "@/features/vocabulary/components/topic-card";
import { createVocabularyProgressService } from "@/features/vocabulary/vocabulary-progress.service";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Chủ đề từ vựng" };

export default async function LearnPage() {
  const user = await requireUser();
  const db = getAdminDb();
  const [topics, progressItems] = await Promise.all([
    createVocabularyRepository(db).listTopics(),
    createVocabularyProgressService(db).listProgress(user.uid),
  ]);
  const progressByTopic = new Map(progressItems.map((progress) => [progress.topicId, progress]));

  return (
    <div className="min-w-0 space-y-8">
      <header>
        <p className="text-sm font-semibold text-primary">Kho từ vựng</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Bạn muốn học chủ đề nào?</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Mỗi chủ đề dùng chung một danh sách từ cho lật thẻ, ghép từ và điền từ.</p>
      </header>
      {topics.length === 0 ? <CatalogEmptyState icon={LibraryBig} title="Chưa có chủ đề sẵn sàng" description="Quản trị viên chưa bật hiển thị chủ đề từ vựng nào." /> : <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">{topics.map((topic) => <TopicCard key={topic.id} topic={topic} progress={progressByTopic.get(topic.id)} />)}</div>}
    </div>
  );
}
