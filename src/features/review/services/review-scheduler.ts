import { Timestamp } from "firebase-admin/firestore";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type CurrentReviewState = {
  state: "new" | "learning" | "review" | "mastered" | "suspended";
  intervalDays: number;
  ease: number;
  correctStreak: number;
  lapseCount: number;
};

export type ReviewSchedulerResult = {
  state: "new" | "learning" | "review" | "mastered" | "suspended";
  intervalDays: number;
  ease: number;
  correctStreak: number;
  lapseCount: number;
  dueAt: Timestamp;
};

export const SCHEDULER_VERSION = "simple-sm2-v1";

export function calculateNextReview(
  currentState: CurrentReviewState,
  rating: ReviewRating,
  answeredAt: Date = new Date()
): ReviewSchedulerResult {
  let { state, intervalDays, ease, correctStreak, lapseCount } = currentState;

  if (rating === "again") {
    correctStreak = 0;
    lapseCount += 1;
    intervalDays = 0; // immediate review / same day
    ease = Math.max(1.3, ease - 0.2);
    state = "learning";
  } else {
    // Correct answer (hard, good, easy)
    correctStreak += 1;

    if (rating === "hard") {
      ease = Math.max(1.3, ease - 0.15);
      intervalDays = intervalDays === 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
      state = "review";
    } else if (rating === "good") {
      if (correctStreak === 1) {
        intervalDays = 1;
      } else if (correctStreak === 2) {
        intervalDays = 4;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * ease));
      }
      state = "review";
    } else if (rating === "easy") {
      ease = Math.min(3.0, ease + 0.15);
      if (correctStreak === 1) {
        intervalDays = 4;
      } else if (correctStreak === 2) {
        intervalDays = 6;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * ease * 1.3));
      }
      if (correctStreak >= 4 || intervalDays >= 15) {
        state = "mastered";
      } else {
        state = "review";
      }
    }
  }

  // Calculate next due date
  // For intervalDays = 0, we set dueAt to 10 minutes in the future
  // Otherwise, set dueAt to intervalDays from now
  const dueAtMs = answeredAt.getTime() + (intervalDays === 0 ? 10 * 60 * 1000 : intervalDays * 24 * 60 * 60 * 1000);
  const dueAt = Timestamp.fromMillis(dueAtMs);

  return {
    state,
    intervalDays,
    ease,
    correctStreak,
    lapseCount,
    dueAt,
  };
}
