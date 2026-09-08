import type { Metadata } from "next";
import { DashboardOverview } from "@/features/vocabulary/components/dashboard-overview";
import {
  createVocabularyProgressService,
  getVietnamDateId,
} from "@/features/vocabulary/vocabulary-progress.service";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Góc học tập" };

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getAdminDb();
  const service = createVocabularyProgressService(db);
  const [topics, progressItems, practiceDays] = await Promise.all([
    createVocabularyRepository(db).listTopics(),
    service.listProgress(user.uid),
    service.listActivePracticeDateIds(user.uid),
  ]);
  return (
    <DashboardOverview
      displayName={user.displayName}
      isAdmin={user.role === "admin"}
      topics={topics}
      progressItems={progressItems}
      practiceDays={practiceDays}
      todayId={getVietnamDateId()}
    />
  );
}
