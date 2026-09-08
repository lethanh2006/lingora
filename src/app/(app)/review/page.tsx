import type { Metadata } from "next";
import { Gamepad2 } from "lucide-react";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { TopicExplorer } from "@/features/vocabulary/components/topic-explorer";
import { createVocabularyProgressService } from "@/features/vocabulary/vocabulary-progress.service";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Góc luyện tập" };

export default async function PracticeHubPage() {
  const user = await requireUser();
  const db = getAdminDb();
  const [topics, progressItems] = await Promise.all([
    createVocabularyRepository(db).listTopics(),
    createVocabularyProgressService(db).listProgress(user.uid),
  ]);
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow text-primary">Góc luyện tập</p>
        <h1 className="page-title mt-3">Luyện một chút, nhớ lâu hơn.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Chọn cách luyện phù hợp với tâm trạng hôm nay, rồi bắt đầu với một chủ
          đề.
        </p>
      </header>
      {topics.length === 0 ? (
        <CatalogEmptyState
          icon={Gamepad2}
          title="Chưa có chủ đề để luyện"
          description="Các trò chơi sẽ sẵn sàng khi có chủ đề mới."
        />
      ) : (
        <TopicExplorer
          topics={topics}
          progressItems={progressItems}
          userId={user.uid}
          practice
        />
      )}
    </div>
  );
}
