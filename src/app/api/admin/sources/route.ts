import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";
import { createSourceService } from "@/features/content/services/source-service";
import { sourceAttributionSchema } from "@/features/content/schemas/content.schema";
import { auditLogSchema } from "@/features/content/schemas/audit-log.schema";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const payload = sourceAttributionSchema.parse(await request.json());
    const db = getAdminDb();
    const service = createSourceService(db);

    const existing = await service.getSource(payload.id);
    if (existing) {
      return jsonError("Source already exists with this ID", 400);
    }

    const created = await service.createSource(payload);

    // Audit Log
    const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
    const auditLog = auditLogSchema.parse({
      schemaVersion: 1,
      actorUid: user.uid,
      action: "create_source",
      entityType: "source",
      entityId: payload.id,
      metadata: {
        title: payload.title,
      },
      createdAt: Timestamp.now(),
    });
    await auditLogRef.set(auditLog);

    return Response.json({ ok: true, source: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.message, 400);
    }
    console.error("Failed to create source", error);
    return jsonError("Internal Server Error", 500);
  }
}
