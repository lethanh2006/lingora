import { createPushSubscriptionRepository } from "@/features/notifications/push-subscription.repository";
import { APP_ACTIVITY_WRITE_INTERVAL_MS } from "@/features/notifications/reminder.constants";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  if (
    !user.studyRemindersEnabled ||
    (user.lastActiveAtMs !== null &&
      Date.now() - user.lastActiveAtMs < APP_ACTIVITY_WRITE_INTERVAL_MS)
  ) {
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const recorded = await createPushSubscriptionRepository(getAdminDb()).recordActivity(user.uid);
    if (!recorded) return jsonError("User profile not found", 404);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to record app activity", error);
    return jsonError("Không thể ghi nhận hoạt động", 500);
  }
}
