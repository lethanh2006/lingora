import { z, ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { createProgressService } from "@/features/progress/progress.service";

const MAX_REQUEST_BYTES = 16 * 1024; // 16KB for progress payloads

const updateProgressRequestSchema = z.object({
  lessonId: z.string(),
  lessonRevisionId: z.string(),
  status: z.enum(["in_progress", "completed"]),
  lastActivityId: z.string().nullable(),
  boundedActivityState: z.record(
    z.string(),
    z.object({
      completed: z.boolean(),
      score: z.number().nullable().optional(),
      attempts: z.number().int().nonnegative().optional(),
      lastResponse: z.any().optional(),
    }),
  ),
  completedRequiredCount: z.number().int().nonnegative(),
  requiredActivityCount: z.number().int().nonnegative(),
  timeSpentSeconds: z.number().int().nonnegative(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("lessonId");
  if (!lessonId) {
    return jsonError("Missing lessonId", 400);
  }

  try {
    const db = getAdminDb();
    const service = createProgressService(db);
    const progress = await service.getLessonProgress(user.uid, lessonId);
    return Response.json({ progress });
  } catch (error) {
    console.error("Failed to fetch lesson progress", error);
    return jsonError("Unable to fetch lesson progress", 500);
  }
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request body too large", 413);
    }

    const payload = updateProgressRequestSchema.parse(JSON.parse(body));
    const db = getAdminDb();
    const service = createProgressService(db);

    const progress = await service.updateLessonProgress(user.uid, payload.lessonId, {
      lessonRevisionId: payload.lessonRevisionId,
      status: payload.status,
      lastActivityId: payload.lastActivityId,
      boundedActivityState: payload.boundedActivityState,
      completedRequiredCount: payload.completedRequiredCount,
      requiredActivityCount: payload.requiredActivityCount,
      timeSpentSeconds: payload.timeSpentSeconds,
    });

    return Response.json({ ok: true, progress });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid progress request", 400);
    }

    console.error("Failed to update progress", error);
    return jsonError("Unable to update progress", 500);
  }
}
