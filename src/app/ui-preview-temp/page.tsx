import { AppShell } from "@/components/layout/app-shell";
import { DashboardOverview } from "@/features/vocabulary/components/dashboard-overview";
import { TopicExplorer } from "@/features/vocabulary/components/topic-explorer";
import { WordList } from "@/features/vocabulary/components/word-list";
import { PracticePlayer } from "@/features/vocabulary/components/practice-player";
import { createStarterVocabularySeed } from "@/features/vocabulary/seed/starter-vocabulary";
import { createGradedVocabularySeed } from "@/features/vocabulary/seed/graded-vocabulary";
import type { VocabularyTopicDto, VocabularyWordDto } from "@/features/vocabulary/schemas/vocabulary.schema";

export default async function Preview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const seed = [...createStarterVocabularySeed({ seconds: 1000, nanoseconds: 0 }), ...createGradedVocabularySeed({ seconds: 1000, nanoseconds: 0 })];
  const topics = seed.filter((item) => item.collection === "vocabularyTopics").map((item) => { const { createdAt, updatedAt, ...topic } = item.data; void createdAt; void updatedAt; return topic as VocabularyTopicDto; });
  const words = seed.filter((item) => item.collection === "vocabularyWords" && item.data.topicId === topics[0].id).map((item) => { const { createdAt, updatedAt, ...word } = item.data; void createdAt; void updatedAt; return word as VocabularyWordDto; });
  return <AppShell>{view === "catalog" || view === "review" ? <><h1 className="page-title mb-8">Khám phá chủ đề</h1><TopicExplorer topics={topics} progressItems={[]} userId="ui-test" practice={view === "review"} /></> : view === "words" ? <WordList words={words} languageCode="en" masteredWordIds={[words[0].id]} /> : view === "flashcards" || view === "fill" || view === "matching" ? <PracticePlayer topic={topics[0]} words={words.slice(0, 3)} mode={view} /> : <DashboardOverview displayName="Minh Anh" isAdmin={false} topics={topics} progressItems={[]} practiceDays={[]} todayId="2026-09-07" />}</AppShell>;
}
