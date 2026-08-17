import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { jsonError } from "@/lib/http";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "@/lib/firebase/collections.ts";
import { attemptSchema } from "@/features/assessment/schemas/assessment.schema.ts";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const { attemptId } = await params;

  try {
    const db = getAdminDb();
    const attemptSnap = await db
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .collection(USER_SUBCOLLECTIONS.attempts)
      .doc(attemptId)
      .get();

    if (!attemptSnap.exists) {
      return jsonError("Attempt not found", 404);
    }

    const attempt = attemptSchema.parse(attemptSnap.data());

    // Fetch corresponding form version
    const formSnap = await db
      .collection(COLLECTIONS.examFormVersions)
      .doc(attempt.examFormVersionId)
      .get();

    if (!formSnap.exists) {
      return jsonError("Exam form version not found", 404);
    }

    const formVersion = formSnap.data();

    return Response.json({ attempt, formVersion });
  } catch (error) {
    console.error("Failed to fetch attempt", error);
    return jsonError("Unable to fetch attempt", 500);
  }
}
