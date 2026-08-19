import { z, ZodError } from "zod";
import { createPublishService, PublishError } from "@/features/content/services/publish-service";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { stableIdSchema } from "@/features/content/schemas/content.schema";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit-log";

const publishRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("publish_lesson"),
    lessonId: stableIdSchema,
  }),
  z.object({
    action: z.literal("publish_course"),
    courseId: stableIdSchema,
    releaseNotes: z.string().trim().max(2_000).optional(),
  }),
  z.object({
    action: z.literal("rollback_course"),
    courseId: stableIdSchema,
    targetRevisionId: z.string().trim().min(1),
    reason: z.string().trim().min(1).max(2_000),
  }),
]);

const MAX_REQUEST_BYTES = 4_096;

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request body too large", 413);
    }

    const payload = publishRequestSchema.parse(JSON.parse(body));
    const publishService = createPublishService(getAdminDb());

    if (payload.action === "publish_lesson") {
      const revision = await publishService.publishLesson(payload.lessonId, user.uid);
      void writeAuditLog(getAdminDb(), {
        actorUid: user.uid,
        action: AUDIT_ACTIONS.LESSON_PUBLISH,
        entityType: "lesson",
        entityId: payload.lessonId,
        revisionId: revision.id,
        metadata: { revisionNumber: revision.revisionNumber },
      });
      return Response.json({
        ok: true,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
      });
    }

    if (payload.action === "publish_course") {
      const revision = await publishService.publishCourse(
        payload.courseId,
        user.uid,
        payload.releaseNotes,
      );
      return Response.json({
        ok: true,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
      });
    }

    if (payload.action === "rollback_course") {
      await publishService.rollbackCourse(
        payload.courseId,
        payload.targetRevisionId,
        user.uid,
        payload.reason,
      );
      return Response.json({ ok: true, currentPublishedRevisionId: payload.targetRevisionId });
    }

    return jsonError("Unsupported action", 400);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request payload", 400);
    }
    if (error instanceof PublishError) {
      return jsonError(error.message, 400);
    }

    console.error("Failed to execute publish action", error);
    return jsonError("Internal Server Error", 500);
  }
}
