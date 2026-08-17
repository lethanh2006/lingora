import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { createAttemptService } from "@/features/assessment/services/attempt.service.ts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const { attemptId } = await params;

  try {
    const db = getAdminDb();
    const attemptService = createAttemptService(db);
    const gradedAttempt = await attemptService.submitAndGradeAttempt(user.uid, attemptId);

    return Response.json({ ok: true, attempt: gradedAttempt });
  } catch (error) {
    console.error("Failed to submit attempt", error);
    return jsonError("Unable to submit attempt", 500);
  }
}
