import "server-only";

import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "../../lib/firebase/collections.ts";
import {
  vocabularyTopicSchema,
  vocabularyWordSchema,
  type VocabularyTopic,
  type VocabularyTopicDto,
  type VocabularyWord,
  type VocabularyWordDto,
} from "./schemas/vocabulary.schema.ts";

function parseDocument<T extends { id: string }>(
  snapshot: DocumentSnapshot,
  parse: (value: unknown) => T,
): T {
  const value = parse(snapshot.data());
  if (value.id !== snapshot.id) {
    throw new Error(`Document ${snapshot.ref.path} có field id không khớp path`);
  }
  return value;
}

export function toTopicDto(topic: VocabularyTopic): VocabularyTopicDto {
  const dto = { ...topic } as Partial<VocabularyTopic>;
  delete dto.createdAt;
  delete dto.updatedAt;
  return dto as VocabularyTopicDto;
}

export function toWordDto(word: VocabularyWord): VocabularyWordDto {
  const dto = { ...word } as Partial<VocabularyWord>;
  delete dto.createdAt;
  delete dto.updatedAt;
  return dto as VocabularyWordDto;
}

export function createVocabularyRepository(db: Firestore) {
  return {
    async listTopics(options: { includeHidden?: boolean } = {}): Promise<VocabularyTopicDto[]> {
      const snapshot = await db.collection(COLLECTIONS.vocabularyTopics).limit(200).get();

      return snapshot.docs
        .map((document) => parseDocument(document, (value) => vocabularyTopicSchema.parse(value)))
        .filter((topic) => options.includeHidden || topic.isVisible)
        .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "vi"))
        .map(toTopicDto);
    },

    async getTopic(
      topicId: string,
      options: { includeHidden?: boolean } = {},
    ): Promise<VocabularyTopicDto | null> {
      const snapshot = await db.collection(COLLECTIONS.vocabularyTopics).doc(topicId).get();
      if (!snapshot.exists) return null;

      const topic = parseDocument(snapshot, (value) => vocabularyTopicSchema.parse(value));
      if (!options.includeHidden && !topic.isVisible) return null;
      return toTopicDto(topic);
    },

    async listWords(
      topicId: string,
      options: { includeHidden?: boolean } = {},
    ): Promise<VocabularyWordDto[]> {
      const snapshot = await db
        .collection(COLLECTIONS.vocabularyWords)
        .where("topicId", "==", topicId)
        .limit(500)
        .get();

      return snapshot.docs
        .map((document) => parseDocument(document, (value) => vocabularyWordSchema.parse(value)))
        .filter((word) => options.includeHidden || word.isVisible)
        .sort((left, right) => left.order - right.order || left.term.localeCompare(right.term))
        .map(toWordDto);
    },
  };
}

export type VocabularyRepository = ReturnType<typeof createVocabularyRepository>;
