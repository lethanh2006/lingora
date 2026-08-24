import { type Firestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "../../lib/firebase/collections.ts";
import {
  lessonProgressSchema,
  dailyStatsSchema,
  type LessonProgress,
} from "./schemas/progress.schema.ts";

export type UpdateLessonProgressInput = {
  lessonRevisionId: string;
  status: "in_progress" | "completed";
  lastActivityId: string | null;
  boundedActivityState: Record<
    string,
    {
      completed: boolean;
      score?: number | null;
      attempts?: number;
      lastResponse?: unknown;
    }
  >;
  completedRequiredCount: number;
  requiredActivityCount: number;
  timeSpentSeconds: number;
};

export function createProgressService(db: Firestore) {
  return {
    async getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | null> {
      const snap = await db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.lessonProgress)
        .doc(lessonId)
        .get();

      if (!snap.exists) return null;
      return lessonProgressSchema.parse(snap.data());
    },

    async updateLessonProgress(
      userId: string,
      lessonId: string,
      input: UpdateLessonProgressInput,
    ): Promise<LessonProgress> {
      const progressRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.lessonProgress)
        .doc(lessonId);

      const existingSnap = await progressRef.get();
      const now = Timestamp.now();

      let progressData: unknown;
      let wasCompleted = false;

      if (existingSnap.exists) {
        const current = existingSnap.data()!;
        wasCompleted = current.status === "completed";

        // Build updating payload
        const updatedActivityState = {
          ...(current.boundedActivityState || {}),
        };

        // Merge activity state updates
        for (const [actId, state] of Object.entries(input.boundedActivityState)) {
          updatedActivityState[actId] = {
            completed: state.completed,
            score: state.score ?? null,
            attempts: state.attempts ?? 0,
            lastResponse: state.lastResponse ?? null,
            updatedAt: now,
          };
        }

        progressData = {
          schemaVersion: 1,
          lessonId,
          lessonRevisionId: input.lessonRevisionId,
          status: input.status,
          masteryStatus: current.masteryStatus || "not_assessed",
          completedRequiredCount: input.completedRequiredCount,
          requiredActivityCount: input.requiredActivityCount,
          lastActivityId: input.lastActivityId,
          boundedActivityState: updatedActivityState,
          checkpointScore: current.checkpointScore ?? null,
          bestCheckpointScore: current.bestCheckpointScore ?? null,
          timeSpentSeconds: (current.timeSpentSeconds || 0) + input.timeSpentSeconds,
          startedAt: current.startedAt || now,
          completedAt: !wasCompleted && input.status === "completed" ? now : (current.completedAt || null),
          lastActivityAt: now,
        };
      } else {
        const boundedActivityState: Record<string, unknown> = {};
        for (const [actId, state] of Object.entries(input.boundedActivityState)) {
          boundedActivityState[actId] = {
            completed: state.completed,
            score: state.score ?? null,
            attempts: state.attempts ?? 1,
            lastResponse: state.lastResponse ?? null,
            updatedAt: now,
          };
        }

        progressData = {
          schemaVersion: 1,
          lessonId,
          lessonRevisionId: input.lessonRevisionId,
          status: input.status,
          masteryStatus: "not_assessed",
          completedRequiredCount: input.completedRequiredCount,
          requiredActivityCount: input.requiredActivityCount,
          lastActivityId: input.lastActivityId,
          boundedActivityState,
          checkpointScore: null,
          bestCheckpointScore: null,
          timeSpentSeconds: input.timeSpentSeconds,
          startedAt: now,
          completedAt: input.status === "completed" ? now : null,
          lastActivityAt: now,
        };
      }

      const validated = lessonProgressSchema.parse(progressData);
      await progressRef.set(validated);

      // If progress just transitioned to completed, update dailyStats and generate review items
      if (!wasCompleted && input.status === "completed") {
        await this.updateDailyStats(userId, input.timeSpentSeconds, true);
        await this.generateReviewItemsForLesson(userId, input.lessonRevisionId);
      } else {
        await this.updateDailyStats(userId, input.timeSpentSeconds, false);
        if (input.status === "completed") {
          await this.generateReviewItemsForLesson(userId, input.lessonRevisionId);
        }
      }

      return validated;
    },

    async generateReviewItemsForLesson(userId: string, lessonRevisionId: string): Promise<void> {
      const revisionSnap = await db
        .collection(COLLECTIONS.publishedLessonRevisions)
        .doc(lessonRevisionId)
        .get();

      if (!revisionSnap.exists) return;

      const revisionData = revisionSnap.data()!;
      const vocabulary = revisionData.vocabulary || [];
      if (vocabulary.length === 0) return;

      const now = Timestamp.now();

      await db.runTransaction(async (transaction) => {
        for (const vocab of vocabulary) {
          const reviewItemRef = db
            .collection(COLLECTIONS.users)
            .doc(userId)
            .collection(USER_SUBCOLLECTIONS.reviewItems)
            .doc(vocab.lexemeId);

          const snap = await transaction.get(reviewItemRef);
          if (!snap.exists) {
            const newReviewItem = {
              schemaVersion: 1,
              id: vocab.lexemeId,
              uid: userId,
              programId: revisionData.programId,
              languageId: revisionData.languageId,
              targetType: "lexeme",
              targetId: vocab.lexemeId,
              state: "new",
              dueAt: now,
              intervalDays: 0,
              ease: 2.5,
              correctStreak: 0,
              lapseCount: 0,
              lastReviewedAt: null,
              schedulerVersion: "simple-sm2-v1",
              createdAt: now,
              updatedAt: now,
            };
            transaction.set(reviewItemRef, newReviewItem);
          }
        }
      });
    },

    async updateDailyStats(userId: string, additionalSeconds: number, isLessonCompletion: boolean) {
      // Get current date string in user local timezone (e.g. Asia/Ho_Chi_Minh or UTC)
      // Since it's a server endpoint, we fallback to local system timezone date formatted as yyyy-mm-dd
      const tzOffset = 7 * 60 * 60 * 1000; // GMT+7 offset for Vietnam
      const localDate = new Date(Date.now() + tzOffset);
      const dateStr = localDate.toISOString().split("T")[0]; // YYYY-MM-DD

      const statsRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.dailyStats)
        .doc(dateStr);

      const snap = await statsRef.get();
      const now = Timestamp.now();

      if (snap.exists) {
        const current = snap.data()!;
        const updated = {
          schemaVersion: 1,
          studySeconds: (current.studySeconds || 0) + additionalSeconds,
          qualifiesForStreak: true,
          completedLessonCount: (current.completedLessonCount || 0) + (isLessonCompletion ? 1 : 0),
          updatedAt: now,
        };
        await statsRef.set(dailyStatsSchema.parse(updated));
      } else {
        const initial = {
          schemaVersion: 1,
          studySeconds: additionalSeconds,
          qualifiesForStreak: true,
          completedLessonCount: isLessonCompletion ? 1 : 0,
          updatedAt: now,
        };
        await statsRef.set(dailyStatsSchema.parse(initial));
      }
    },
  };
}

export type ProgressService = ReturnType<typeof createProgressService>;
