import { ZodError } from "zod";

import {
  pushEndpointInputSchema,
  pushSubscriptionInputSchema,
} from "@/features/notifications/schemas/push-subscription.schema";
import {
  PushSubscriptionUserNotFoundError,
  createPushSubscriptionRepository,
} from "@/features/notifications/push-subscription.repository";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limiter";

const MAX_REQUEST_BYTES = 8 * 1_024;

async function readBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  return JSON.parse(body);
}

function successResponse(status = 200, data: Record<string, unknown> = {}) {
  return Response.json(
    { ok: true, ...data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const rateLimit = await checkRateLimit(user.uid, "push_subscribe", {
    maxRequests: 12,
    windowSeconds: 60,
  });
  if (!rateLimit.success) return jsonError("Quá nhiều yêu cầu", 429);

  try {
    const subscription = pushSubscriptionInputSchema.parse(await readBody(request));
    await createPushSubscriptionRepository(getAdminDb()).subscribe(user.uid, subscription);
    return successResponse(201);
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
      return jsonError("Dữ liệu đăng ký quá lớn", 413);
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Dữ liệu đăng ký không hợp lệ", 400);
    }
    if (error instanceof PushSubscriptionUserNotFoundError) {
      return jsonError("Hồ sơ người dùng không tồn tại", 404);
    }
    console.error("Failed to save push subscription", error);
    return jsonError("Không thể bật thông báo", 500);
  }
}

export async function DELETE(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const rateLimit = await checkRateLimit(user.uid, "push_unsubscribe", {
    maxRequests: 12,
    windowSeconds: 60,
  });
  if (!rateLimit.success) return jsonError("Quá nhiều yêu cầu", 429);

  try {
    const { endpoint } = pushEndpointInputSchema.parse(await readBody(request));
    const reminderEnabled = await createPushSubscriptionRepository(getAdminDb()).unsubscribe(
      user.uid,
      endpoint,
    );
    return successResponse(200, { reminderEnabled });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
      return jsonError("Dữ liệu đăng ký quá lớn", 413);
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Dữ liệu đăng ký không hợp lệ", 400);
    }
    console.error("Failed to remove push subscription", error);
    return jsonError("Không thể tắt thông báo", 500);
  }
}
