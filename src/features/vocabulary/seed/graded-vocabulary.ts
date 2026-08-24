import { COLLECTIONS } from "../../../lib/firebase/collections.ts";
import type { FirestoreTimestampValue } from "../../content/schemas/content.schema.ts";
import {
  vocabularyTopicSchema,
  vocabularyWordSchema,
} from "../schemas/vocabulary.schema.ts";
import { gradedChineseVocabulary } from "./graded-chinese-vocabulary.ts";
import { gradedEnglishVocabulary } from "./graded-english-vocabulary.ts";
import { gradedJapaneseVocabulary } from "./graded-japanese-vocabulary.ts";
import type { GradedVocabularyWordData } from "./graded-vocabulary.types.ts";
import type {
  VocabularySeedDocument,
  VocabularySeedStore,
} from "./starter-vocabulary.ts";

export const gradedVocabularyTopics = [
  ...gradedEnglishVocabulary,
  ...gradedJapaneseVocabulary,
  ...gradedChineseVocabulary,
] as const;

function optionalText(value?: string): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function createGradedVocabularySeed(
  timestamp: FirestoreTimestampValue,
): VocabularySeedDocument[] {
  const documents: VocabularySeedDocument[] = [];

  for (const topic of gradedVocabularyTopics) {
    const words: readonly GradedVocabularyWordData[] = topic.words;
    const description = `${topic.description} Nguồn: ${topic.sourceName} (${topic.sourceVersion}).`;
    documents.push({
      collection: COLLECTIONS.vocabularyTopics,
      id: topic.id,
      data: vocabularyTopicSchema.parse({
        schemaVersion: 1,
        id: topic.id,
        title: topic.title,
        description,
        languageCode: topic.languageCode,
        icon: topic.icon,
        accent: topic.accent,
        order: topic.order,
        isVisible: true,
        wordCount: words.length,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });

    words.forEach((word, order) => {
      const wordId = `${topic.id}-${word.id}`;
      documents.push({
        collection: COLLECTIONS.vocabularyWords,
        id: wordId,
        data: vocabularyWordSchema.parse({
          schemaVersion: 1,
          id: wordId,
          topicId: topic.id,
          term: word.term,
          meaning: word.meaning,
          pronunciation: word.pronunciation,
          example: optionalText(word.example),
          exampleMeaning: optionalText(word.exampleMeaning),
          audioUrl: optionalText(word.audioUrl),
          imageUrl: null,
          order,
          isVisible: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      });
    });
  }

  return documents;
}

export async function seedGradedVocabulary(
  store: VocabularySeedStore,
  timestamp: FirestoreTimestampValue,
) {
  const result = { created: [] as string[], skipped: [] as string[] };
  const documents = createGradedVocabularySeed(timestamp);

  for (let offset = 0; offset < documents.length; offset += 20) {
    const batch = documents.slice(offset, offset + 20);
    const outcomes = await Promise.all(
      batch.map(async (document) => ({
        path: `${document.collection}/${document.id}`,
        created: await store.createIfMissing(document),
      })),
    );
    for (const outcome of outcomes) {
      if (outcome.created) result.created.push(outcome.path);
      else result.skipped.push(outcome.path);
    }
  }
  return result;
}
