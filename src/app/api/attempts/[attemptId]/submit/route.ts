import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { createAttemptService } from "@/features/assessment/services/attempt.service.ts";
import { logger } from "@/lib/logger";

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
    logger.error("Failed to submit attempt", {
      error,
      userId: user.uid,
      path: `/api/attempts/${attemptId}/submit`,
      method: "POST",
    });
    return jsonError("Unable to submit attempt", 500);
  }
}
