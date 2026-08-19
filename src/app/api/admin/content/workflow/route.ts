import { z, ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { stableIdSchema } from "@/features/content/schemas/content.schema";
import { auditLogSchema } from "@/features/content/schemas/audit-log.schema";
import { Timestamp } from "firebase-admin/firestore";

const workflowRequestSchema = z.object({
  lessonId: stableIdSchema,
  action: z.enum(["submit_review", "approve", "reject", "retire"]),
  comment: z.string().trim().max(2_000).optional(),
});

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

    const payload = workflowRequestSchema.parse(JSON.parse(body));
    const db = getAdminDb();
    const now = Timestamp.now();

    const result = await db.runTransaction(async (transaction) => {
      const lessonRef = db.collection(COLLECTIONS.contentLessons).doc(payload.lessonId);
      const lessonSnap = await transaction.get(lessonRef);

      if (!lessonSnap.exists) {
        throw new Error("NOT_FOUND");
      }

      const lessonData = lessonSnap.data()!;
      const currentStatus = lessonData.status || "draft";
      let nextStatus = currentStatus;
      let rejectionComment = lessonData.rejectionComment || null;

      if (payload.action === "submit_review") {
        if (currentStatus !== "draft") {
          throw new Error("INVALID_TRANSITION");
        }
        nextStatus = "in_review";
        rejectionComment = null;
      } else if (payload.action === "approve") {
        if (currentStatus !== "in_review" && currentStatus !== "draft") {
          throw new Error("INVALID_TRANSITION");
        }
        nextStatus = "approved";
      } else if (payload.action === "reject") {
        if (currentStatus !== "in_review") {
          throw new Error("INVALID_TRANSITION");
        }
        nextStatus = "draft";
        rejectionComment = payload.comment || "Bị từ chối bởi người kiểm duyệt";
      } else if (payload.action === "retire") {
        if (currentStatus !== "published") {
          throw new Error("INVALID_TRANSITION");
        }
        nextStatus = "retired";
      }

      const updateData: Record<string, any> = {
        status: nextStatus,
        rejectionComment: rejectionComment,
        updatedAt: now,
      };

      transaction.update(lessonRef, updateData);

      // Audit Log
      const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
      const auditLog = auditLogSchema.parse({
        schemaVersion: 1,
        actorUid: user.uid,
        action: `${payload.action}_lesson`,
        entityType: "lesson",
        entityId: payload.lessonId,
        metadata: {
          title: lessonData.title || "",
          fromStatus: currentStatus,
          toStatus: nextStatus,
          comment: payload.comment || undefined,
        },
        createdAt: now,
      });

      transaction.create(auditLogRef, auditLog);

      return { status: nextStatus, rejectionComment };
    });

    return Response.json({
      ok: true,
      status: result.status,
      rejectionComment: result.rejectionComment,
    });
  } catch (error: any) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request payload", 400);
    }

    if (error.message === "NOT_FOUND") {
      return jsonError("Lesson draft not found", 404);
    }

    if (error.message === "INVALID_TRANSITION") {
      return jsonError("Trạng thái chuyển đổi không hợp lệ", 400);
    }

    console.error("Failed to execute workflow action", error);
    return jsonError("Internal Server Error", 500);
  }
}
