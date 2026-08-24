import type { Metadata } from "next";

import { TopicManager } from "@/features/vocabulary/components/topic-manager";
import { VocabularyTransferActions } from "@/features/vocabulary/components/vocabulary-transfer-actions";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Chủ đề & từ vựng – Lingora" };

export default async function AdminTopicsPage() {
  await requireAdmin();
  const topics = await createVocabularyRepository(getAdminDb()).listTopics({ includeHidden: true });

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Nội dung học</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Chủ đề & từ vựng</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Tạo chủ đề tại đây, sau đó mở “Quản lý từ”. Nội dung bật hiển thị được dùng ngay trong cả ba trò chơi.
          </p>
        </div>
        <VocabularyTransferActions endpoint="/api/admin/topics/transfer" itemLabel="chủ đề" />
      </header>
      <TopicManager topics={topics} />
    </div>
  );
}
