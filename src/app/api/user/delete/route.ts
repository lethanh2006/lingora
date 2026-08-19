import { cookies } from "next/headers";
import { getCurrentUser, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { createDeletionService } from "@/features/user/services/deletion-service";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  if (user.role === "admin") {
    return jsonError("Không thể xóa tài khoản Admin qua cổng này", 400);
  }

  // Rate Limit: Max 3 deletion attempts per 60 seconds per UID
  const rateLimit = await checkRateLimit(user.uid, "delete_account", {
    maxRequests: 3,
    windowSeconds: 60,
  });
  if (!rateLimit.success) {
    return jsonError("Quá nhiều yêu cầu. Vui lòng thử lại sau.", 429);
  }

  const db = getAdminDb();
  const auth = getAdminAuth();
  const uid = user.uid;

  try {
    // 1. Delete all Firestore data for this user
    const deletionService = createDeletionService(db);
    await deletionService.deleteUserData(uid);

    // 2. Delete user in Firebase Auth
    await auth.deleteUser(uid);

    // 3. Clear session cookie
    (await cookies()).set(SESSION_COOKIE_NAME, "", { maxAge: -1, path: "/" });

    // 4. Audit log — ghi lại sự kiện xóa tài khoản (fire-and-forget)
    void writeAuditLog(db, {
      actorUid: uid,
      action: AUDIT_ACTIONS.ACCOUNT_DELETE,
      entityType: "user",
      entityId: uid,
      metadata: { selfDelete: true },
    });

    return Response.json({ ok: true });
  } catch (error) {
    logger.error("Failed to delete user account", {
      error,
      userId: user.uid,
      path: "/api/user/delete",
      method: "POST",
    });
    return jsonError("Unable to delete account", 500);
  }
}
