import { notFound } from "next/navigation";

import { PracticePlayer } from "@/features/vocabulary/components/practice-player";
import { practiceModeSchema } from "@/features/vocabulary/schemas/vocabulary.schema";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ programId: string; mode: string }>;
}) {
  await requireUser();
  const { programId: topicId, mode: rawMode } = await params;
  const modeResult = practiceModeSchema.safeParse(rawMode);
  if (!modeResult.success) notFound();

  const repository = createVocabularyRepository(getAdminDb());
  const [topic, words] = await Promise.all([repository.getTopic(topicId), repository.listWords(topicId)]);
  if (!topic || words.length === 0) notFound();

  return <PracticePlayer topic={topic} words={words} mode={modeResult.data} />;
}
