import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";
import { createSourceService } from "@/features/content/services/source-service";
import { sourceAttributionSchema } from "@/features/content/schemas/content.schema";
import { auditLogSchema } from "@/features/content/schemas/audit-log.schema";

const sourceUpdateSchema = sourceAttributionSchema.omit({ id: true }).partial();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  const { sourceId } = await params;

  try {
    const payload = sourceUpdateSchema.parse(await request.json());
    const db = getAdminDb();
    const service = createSourceService(db);

    const updated = await service.updateSource(sourceId, payload);

    // Audit Log
    const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
    const auditLog = auditLogSchema.parse({
      schemaVersion: 1,
      actorUid: user.uid,
      action: "update_source",
      entityType: "source",
      entityId: sourceId,
      metadata: {
        updatedFields: Object.keys(payload),
      },
      createdAt: Timestamp.now(),
    });
    await auditLogRef.set(auditLog);

    return Response.json({ ok: true, source: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.message, 400);
    }
    console.error("Failed to update source", error);
    return jsonError("Internal Server Error", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  const { sourceId } = await params;
  const db = getAdminDb();
  const service = createSourceService(db);

  try {
    const existing = await service.getSource(sourceId);
    if (!existing) return jsonError("Source not found", 404);

    await service.deleteSource(sourceId);

    // Audit Log
    const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
    const auditLog = auditLogSchema.parse({
      schemaVersion: 1,
      actorUid: user.uid,
      action: "delete_source",
      entityType: "source",
      entityId: sourceId,
      metadata: {
        title: existing.title,
      },
      createdAt: Timestamp.now(),
    });
    await auditLogRef.set(auditLog);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete source", error);
    return jsonError("Internal Server Error", 500);
  }
}
