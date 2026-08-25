import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";

import {
  createStudyReminderService,
  getWebPushEnv,
} from "@/features/notifications/study-reminder.service";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

function hasValidCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || secret.length < 16 || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    getWebPushEnv();
    const result = await createStudyReminderService(getAdminDb()).sendDue();
    return Response.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Study reminder environment is not configured");
      return Response.json(
        { error: "Push notifications are not configured" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Study reminder cron failed", error);
    return Response.json(
      { error: "Unable to process study reminders" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
