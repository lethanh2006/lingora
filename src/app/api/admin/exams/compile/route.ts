import { z, ZodError } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { stableIdSchema } from "@/features/content/schemas/content.schema";
import { createExamCompiler } from "@/features/assessment/services/exam-compiler";
import { createAssessmentRepository } from "@/features/assessment/assessment.repository";
import { auditLogSchema } from "@/features/content/schemas/audit-log.schema";

const compileRequestSchema = z.object({
  blueprintId: stableIdSchema,
});

const MAX_REQUEST_BYTES = 1024; // 1KB is more than enough for a stable ID

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request body too large", 413);
    }

    const payload = compileRequestSchema.parse(JSON.parse(body));
    const { blueprintId } = payload;

    const db = getAdminDb();
    const repo = createAssessmentRepository(db);

    const blueprint = await repo.getBlueprint(blueprintId);
    if (!blueprint) {
      return jsonError("Không tìm thấy blueprint đề thi", 404);
    }

    if (blueprint.status !== "published") {
      return jsonError("Blueprint đề thi chưa được phát hành (published)", 400);
    }

    // Determine the next blueprint version
    const latestForm = await repo.getLatestPublishedFormVersion(blueprintId);
    const nextBlueprintVersion = latestForm ? latestForm.blueprintVersion + 1 : 1;

    // Compile exam form
    const compiler = createExamCompiler(db);
    const formVersion = await compiler.compileExamForm(blueprint, nextBlueprintVersion);

    // Save exam form version to DB
    const formRef = db.collection(COLLECTIONS.examFormVersions).doc(formVersion.id);
    await formRef.set(formVersion);

    // Audit Log
    const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
    const auditLog = auditLogSchema.parse({
      schemaVersion: 1,
      actorUid: user.uid,
      action: "compile_exam_form",
      entityType: "exam_blueprint",
      entityId: blueprintId,
      revisionId: formVersion.id,
      metadata: {
        blueprintVersion: nextBlueprintVersion,
        questionCount: formVersion.orderedQuestionVersionIds.length,
      },
      createdAt: Timestamp.now(),
    });
    await auditLogRef.set(auditLog);

    return Response.json({
      ok: true,
      formVersionId: formVersion.id,
      blueprintVersion: nextBlueprintVersion,
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request payload", 400);
    }
    // Handling compile error (e.g. not enough questions)
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }

    console.error("Failed to compile exam form", error);
    return jsonError("Internal Server Error", 500);
  }
}
