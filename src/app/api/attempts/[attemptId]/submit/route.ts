import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { createAttemptService } from "@/features/assessment/services/attempt.service.ts";
import { logger } from "@/lib/logger";
import { checkIdempotency, markIdempotencyDone } from "@/lib/idempotency";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const { attemptId } = await params;

  // Đọc Idempotency-Key từ header của client
  const idempotencyKey = request.headers.get("Idempotency-Key");

  const db = getAdminDb();

  // Kiểm tra double-submit nếu client gửi key
  if (idempotencyKey) {
    const idempResult = await checkIdempotency(
      db,
      idempotencyKey,
      user.uid,
      `submit_attempt:${attemptId}`,
    );

    if (idempResult.type === "duplicate") {
      // Trả lại kết quả đã lưu từ request trước — không xử lý lại
      return Response.json(idempResult.responseBody, { status: 200 });
    }

    if (idempResult.type === "conflict") {
      return jsonError("Yêu cầu đang được xử lý, vui lòng không gửi lại.", 409);
    }
  }

  try {
    const attemptService = createAttemptService(db);
    const gradedAttempt = await attemptService.submitAndGradeAttempt(user.uid, attemptId);

    const responseBody = { ok: true, attempt: gradedAttempt };

    // Lưu kết quả vào idempotency record để tái sử dụng
    if (idempotencyKey) {
      await markIdempotencyDone(db, idempotencyKey, responseBody);
    }

    return Response.json(responseBody);
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
