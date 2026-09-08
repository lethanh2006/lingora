import { notFound } from "next/navigation";

import { PracticePlayer } from "@/features/vocabulary/components/practice-player";
import { practiceModeSchema } from "@/features/vocabulary/schemas/vocabulary.schema";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { createVocabularyProgressService } from "@/features/vocabulary/vocabulary-progress.service";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ topicId: string; mode: string }>;
}) {
  const user = await requireUser();
  const { topicId, mode: rawMode } = await params;
  const modeResult = practiceModeSchema.safeParse(rawMode);
  if (!modeResult.success) notFound();

  const repository = createVocabularyRepository(getAdminDb());
  const [topic, words, progress] = await Promise.all([
    repository.getTopic(topicId),
    repository.listWords(topicId),
    createVocabularyProgressService(getAdminDb()).listProgress(user.uid),
  ]);
  if (!topic || words.length === 0) notFound();

  return (
    <PracticePlayer
      key={`${topicId}:${modeResult.data}`}
      topic={topic}
      words={words}
      mode={modeResult.data}
      masteredWordIds={
        progress.find((item) => item.topicId === topicId)?.masteredWordIds ?? []
      }
    />
  );
}
