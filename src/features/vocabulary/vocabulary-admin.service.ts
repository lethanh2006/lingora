import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "../../lib/firebase/collections.ts";
import {
  vocabularyTopicSchema,
  vocabularyWordSchema,
  type VocabularyTopicDto,
  type VocabularyTopicInput,
  type VocabularyWordDto,
  type VocabularyWordInput,
} from "./schemas/vocabulary.schema.ts";
import { toTopicDto, toWordDto } from "./vocabulary.repository.ts";

export function slugifyTopicTitle(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/g, "");
  return slug || "chu-de";
}

function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function createVocabularyAdminService(db: Firestore) {
  return {
    async createTopic(input: VocabularyTopicInput): Promise<VocabularyTopicDto> {
      const baseId = slugifyTopicTitle(input.title);
      let topicId = baseId;
      let suffix = 2;

      while ((await db.collection(COLLECTIONS.vocabularyTopics).doc(topicId).get()).exists) {
        topicId = `${baseId}-${suffix}`;
        suffix += 1;
        if (suffix > 100) throw new Error("Không thể tạo ID chủ đề duy nhất");
      }

      const now = Timestamp.now();
      const topic = vocabularyTopicSchema.parse({
        schemaVersion: 1,
        id: topicId,
        ...input,
        wordCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      await db.collection(COLLECTIONS.vocabularyTopics).doc(topicId).create(topic);
      return toTopicDto(topic);
    },

    async updateTopic(
      topicId: string,
      input: VocabularyTopicInput,
    ): Promise<VocabularyTopicDto | null> {
      const reference = db.collection(COLLECTIONS.vocabularyTopics).doc(topicId);
      const snapshot = await reference.get();
      if (!snapshot.exists) return null;

      const existing = vocabularyTopicSchema.parse(snapshot.data());
      const topic = vocabularyTopicSchema.parse({
        ...existing,
        ...input,
        id: topicId,
        updatedAt: Timestamp.now(),
      });
      await reference.set(topic);
      return toTopicDto(topic);
    },

    async deleteTopic(topicId: string): Promise<boolean> {
      const topicReference = db.collection(COLLECTIONS.vocabularyTopics).doc(topicId);
      if (!(await topicReference.get()).exists) return false;

      while (true) {
        const words = await db
          .collection(COLLECTIONS.vocabularyWords)
          .where("topicId", "==", topicId)
          .limit(400)
          .get();
        if (words.empty) break;
        const batch = db.batch();
        words.docs.forEach((word) => batch.delete(word.ref));
        await batch.commit();
      }

      await topicReference.delete();
      return true;
    },

    async createWord(
      topicId: string,
      input: VocabularyWordInput,
    ): Promise<VocabularyWordDto | null> {
      const topicReference = db.collection(COLLECTIONS.vocabularyTopics).doc(topicId);
      const wordReference = db.collection(COLLECTIONS.vocabularyWords).doc();
      const now = Timestamp.now();

      return db.runTransaction(async (transaction) => {
        const topicSnapshot = await transaction.get(topicReference);
        if (!topicSnapshot.exists) return null;
        const topic = vocabularyTopicSchema.parse(topicSnapshot.data());
        const word = vocabularyWordSchema.parse({
          schemaVersion: 1,
          id: wordReference.id,
          topicId,
          ...input,
          pronunciation: optionalText(input.pronunciation),
          example: optionalText(input.example),
          exampleMeaning: optionalText(input.exampleMeaning),
          imageUrl: optionalText(input.imageUrl),
          createdAt: now,
          updatedAt: now,
        });

        transaction.create(wordReference, word);
        transaction.update(topicReference, {
          wordCount: topic.wordCount + (word.isVisible ? 1 : 0),
          updatedAt: now,
        });
        return toWordDto(word);
      });
    },

    async updateWord(
      topicId: string,
      wordId: string,
      input: VocabularyWordInput,
    ): Promise<VocabularyWordDto | null> {
      const topicReference = db.collection(COLLECTIONS.vocabularyTopics).doc(topicId);
      const wordReference = db.collection(COLLECTIONS.vocabularyWords).doc(wordId);
      const now = Timestamp.now();

      return db.runTransaction(async (transaction) => {
        const [topicSnapshot, wordSnapshot] = await Promise.all([
          transaction.get(topicReference),
          transaction.get(wordReference),
        ]);
        if (!topicSnapshot.exists || !wordSnapshot.exists) return null;

        const topic = vocabularyTopicSchema.parse(topicSnapshot.data());
        const existing = vocabularyWordSchema.parse(wordSnapshot.data());
        if (existing.topicId !== topicId) return null;
        const word = vocabularyWordSchema.parse({
          ...existing,
          ...input,
          id: wordId,
          topicId,
          pronunciation: optionalText(input.pronunciation),
          example: optionalText(input.example),
          exampleMeaning: optionalText(input.exampleMeaning),
          imageUrl: optionalText(input.imageUrl),
          updatedAt: now,
        });
        const visibleDelta = Number(word.isVisible) - Number(existing.isVisible);

        transaction.set(wordReference, word);
        transaction.update(topicReference, {
          wordCount: Math.max(0, topic.wordCount + visibleDelta),
          updatedAt: now,
        });
        return toWordDto(word);
      });
    },

    async deleteWord(topicId: string, wordId: string): Promise<boolean> {
      const topicReference = db.collection(COLLECTIONS.vocabularyTopics).doc(topicId);
      const wordReference = db.collection(COLLECTIONS.vocabularyWords).doc(wordId);

      return db.runTransaction(async (transaction) => {
        const [topicSnapshot, wordSnapshot] = await Promise.all([
          transaction.get(topicReference),
          transaction.get(wordReference),
        ]);
        if (!topicSnapshot.exists || !wordSnapshot.exists) return false;

        const topic = vocabularyTopicSchema.parse(topicSnapshot.data());
        const word = vocabularyWordSchema.parse(wordSnapshot.data());
        if (word.topicId !== topicId) return false;
        transaction.delete(wordReference);
        transaction.update(topicReference, {
          wordCount: Math.max(0, topic.wordCount - (word.isVisible ? 1 : 0)),
          updatedAt: Timestamp.now(),
        });
        return true;
      });
    },
  };
}

export type VocabularyAdminService = ReturnType<typeof createVocabularyAdminService>;
