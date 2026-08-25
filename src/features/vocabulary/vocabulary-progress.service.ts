import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS, USER_SUBCOLLECTIONS } from "../../lib/firebase/collections.ts";
import { getStudyReminderUpdate } from "../notifications/push-subscription.repository.ts";
import {
  topicProgressSchema,
  type PracticeSessionInput,
  type TopicProgress,
  type TopicProgressDto,
} from "./schemas/vocabulary.schema.ts";

const EMPTY_BEST_SCORES = {
  flashcards: 0,
  matching: 0,
  fill: 0,
} as const;

export function getVietnamDateId(now = new Date()): string {
  const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1_000);
  return vietnamTime.toISOString().slice(0, 10);
}

export function toTopicProgressDto(progress: TopicProgress): TopicProgressDto {
  const dto = { ...progress } as Partial<TopicProgress>;
  delete dto.firstPracticedAt;
  delete dto.lastPracticedAt;
  return dto as TopicProgressDto;
}

export function createVocabularyProgressService(db: Firestore) {
  return {
    async listProgress(userId: string): Promise<TopicProgressDto[]> {
      const snapshot = await db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.topicProgress)
        .limit(200)
        .get();

      return snapshot.docs.map((document) => {
        const progress = topicProgressSchema.parse(document.data());
        if (progress.topicId !== document.id) {
          throw new Error(`Document ${document.ref.path} có topicId không khớp path`);
        }
        return toTopicProgressDto(progress);
      });
    },

    async listActivePracticeDateIds(userId: string, maxDays = 90): Promise<string[]> {
      const snapshot = await db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.practiceDays)
        .orderBy("date", "desc")
        .limit(maxDays)
        .get();

      return snapshot.docs
        .filter((document) => Number(document.data().sessionsCompleted ?? 0) > 0)
        .map((document) => document.id);
    },

    async recordSession(userId: string, input: PracticeSessionInput): Promise<TopicProgressDto> {
      const progressRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.topicProgress)
        .doc(input.topicId);
      const practiceDayRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.practiceDays)
        .doc(getVietnamDateId());
      const userRef = db.collection(COLLECTIONS.users).doc(userId);
      const now = Timestamp.now();

      const progress = await db.runTransaction(async (transaction) => {
        const [progressSnapshot, practiceDaySnapshot, userSnapshot] = await Promise.all([
          transaction.get(progressRef),
          transaction.get(practiceDayRef),
          transaction.get(userRef),
        ]);

        const existing = progressSnapshot.exists
          ? topicProgressSchema.parse(progressSnapshot.data())
          : null;
        const practicedModes = new Set(existing?.practicedModes ?? []);
        practicedModes.add(input.mode);
        const masteredWordIds = new Set(existing?.masteredWordIds ?? []);
        input.masteredWordIds.forEach((wordId) => masteredWordIds.add(wordId));
        const score = Math.round((input.correctAnswers / input.totalAnswers) * 100);

        const nextProgress = topicProgressSchema.parse({
          schemaVersion: 1,
          topicId: input.topicId,
          practicedModes: [...practicedModes],
          sessionsCompleted: (existing?.sessionsCompleted ?? 0) + 1,
          correctAnswers: (existing?.correctAnswers ?? 0) + input.correctAnswers,
          totalAnswers: (existing?.totalAnswers ?? 0) + input.totalAnswers,
          masteredWordIds: [...masteredWordIds],
          bestScores: {
            ...(existing?.bestScores ?? EMPTY_BEST_SCORES),
            [input.mode]: Math.max(existing?.bestScores[input.mode] ?? 0, score),
          },
          totalStudySeconds: (existing?.totalStudySeconds ?? 0) + input.durationSeconds,
          firstPracticedAt: existing?.firstPracticedAt ?? now,
          lastPracticedAt: now,
        });

        const practiceDay = practiceDaySnapshot.data();
        transaction.set(practiceDayRef, {
          schemaVersion: 1,
          date: getVietnamDateId(),
          sessionsCompleted: Number(practiceDay?.sessionsCompleted ?? 0) + 1,
          studySeconds: Number(practiceDay?.studySeconds ?? 0) + input.durationSeconds,
          correctAnswers: Number(practiceDay?.correctAnswers ?? 0) + input.correctAnswers,
          totalAnswers: Number(practiceDay?.totalAnswers ?? 0) + input.totalAnswers,
          updatedAt: now,
        });
        transaction.set(progressRef, nextProgress);
        if (userSnapshot.exists) {
          transaction.set(
            userRef,
            getStudyReminderUpdate(userSnapshot.data(), now),
            { merge: true },
          );
        }

        return nextProgress;
      });

      return toTopicProgressDto(progress);
    },
  };
}

export type VocabularyProgressService = ReturnType<typeof createVocabularyProgressService>;
