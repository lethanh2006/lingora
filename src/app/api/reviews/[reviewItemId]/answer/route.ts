import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";
import { calculateNextReview, SCHEDULER_VERSION, type ReviewRating } from "@/features/review/services/review-scheduler";

const answerBodySchema = z.object({
  rating: z.enum(["again", "hard", "good", "easy"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewItemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const { reviewItemId } = await params;

  try {
    const bodyText = await request.text();
    const { rating } = answerBodySchema.parse(JSON.parse(bodyText));

    const db = getAdminDb();
    const reviewItemRef = db
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .collection(USER_SUBCOLLECTIONS.reviewItems)
      .doc(reviewItemId);

    const now = Timestamp.now();

    const updated = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(reviewItemRef);
      if (!snap.exists) {
        throw new Error("NOT_FOUND");
      }

      const current = snap.data()!;
      const state = current.state || "new";
      const intervalDays = current.intervalDays ?? 0;
      const ease = current.ease ?? 2.5;
      const correctStreak = current.correctStreak ?? 0;
      const lapseCount = current.lapseCount ?? 0;

      const nextState = calculateNextReview(
        { state, intervalDays, ease, correctStreak, lapseCount },
        rating as ReviewRating,
        now.toDate()
      );

      const updatedData = {
        ...current,
        state: nextState.state,
        intervalDays: nextState.intervalDays,
        ease: nextState.ease,
        correctStreak: nextState.correctStreak,
        lapseCount: nextState.lapseCount,
        dueAt: nextState.dueAt,
        lastReviewedAt: now,
        schedulerVersion: SCHEDULER_VERSION,
        updatedAt: now,
      };

      transaction.set(reviewItemRef, updatedData);
      return updatedData;
    });

    return Response.json({ ok: true, reviewItem: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return jsonError("Review item not found", 404);
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request payload", 400);
    }

    console.error("Failed to answer review item", error);
    return jsonError("Unable to process answer", 500);
  }
}
