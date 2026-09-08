import type {
  TopicProgressDto,
  VocabularyTopicDto,
} from "./schemas/vocabulary.schema.ts";

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi")
    .trim();
}

export type TopicFilter = "all" | "started" | "new" | "completed" | "saved";
export type TopicSort = "recommended" | "alphabetical" | "words";

export function discoverTopics(
  topics: VocabularyTopicDto[],
  progressItems: TopicProgressDto[],
  options: {
    query: string;
    language: string;
    filter: TopicFilter;
    sort: TopicSort;
    savedIds: readonly string[];
  },
) {
  const query = normalizeSearch(options.query);
  const progressByTopic = new Map(
    progressItems.map((item) => [item.topicId, item]),
  );
  return topics
    .filter((topic) => {
      if (options.language !== "all" && topic.languageCode !== options.language)
        return false;
      if (
        query &&
        !normalizeSearch(`${topic.title} ${topic.description}`).includes(query)
      )
        return false;
      const progress = progressByTopic.get(topic.id);
      const started = (progress?.sessionsCompleted ?? 0) > 0;
      const complete =
        topic.wordCount > 0 &&
        (progress?.masteredWordIds.length ?? 0) >= topic.wordCount;
      if (options.filter === "started") return started && !complete;
      if (options.filter === "new") return !started;
      if (options.filter === "completed") return complete;
      if (options.filter === "saved")
        return options.savedIds.includes(topic.id);
      return true;
    })
    .sort((left, right) => {
      if (options.sort === "alphabetical")
        return left.title.localeCompare(right.title, "vi");
      if (options.sort === "words")
        return left.wordCount - right.wordCount || left.order - right.order;
      return left.order - right.order;
    });
}

export function getContinueTopic(
  topics: VocabularyTopicDto[],
  progressItems: TopicProgressDto[],
) {
  const available = new Map(
    topics
      .filter((topic) => topic.wordCount > 0)
      .map((topic) => [topic.id, topic]),
  );
  const recent = [...progressItems]
    .filter((item) => item.sessionsCompleted > 0 && available.has(item.topicId))
    .sort(
      (left, right) =>
        (right.lastPracticedAtMs ?? 0) - (left.lastPracticedAtMs ?? 0),
    );
  const unfinished = recent.find(
    (item) =>
      item.masteredWordIds.length < available.get(item.topicId)!.wordCount,
  );
  return (
    available.get((unfinished ?? recent[0])?.topicId) ??
    [...available.values()][0]
  );
}

export function getPracticeWeek(dateIds: string[], todayId: string) {
  const today = new Date(`${todayId}T00:00:00.000Z`);
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const activeDates = new Set(dateIds);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - mondayOffset + index);
    const id = date.toISOString().slice(0, 10);
    return {
      id,
      label: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index],
      active: activeDates.has(id),
      today: id === todayId,
      future: id > todayId,
    };
  });
}
