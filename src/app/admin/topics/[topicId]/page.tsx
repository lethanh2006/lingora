import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TopicWordEditor } from "@/features/vocabulary/components/topic-word-editor";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Quản lý từ vựng – Lingora" };

export default async function AdminTopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  await requireAdmin();
  const { topicId } = await params;
  const repository = createVocabularyRepository(getAdminDb());
  const [topic, words] = await Promise.all([
    repository.getTopic(topicId, { includeHidden: true }),
    repository.listWords(topicId, { includeHidden: true }),
  ]);
  if (!topic) notFound();

  return <TopicWordEditor topic={topic} words={words} />;
}
