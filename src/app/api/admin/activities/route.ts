import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";
import { activityDraftSchema } from "@/features/content/schemas/content.schema";
import { auditLogSchema } from "@/features/content/schemas/audit-log.schema";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const payload = activityDraftSchema.parse(await request.json());
    const db = getAdminDb();

    const activityRef = db.collection(COLLECTIONS.contentActivities).doc(payload.id);
    const snap = await activityRef.get();
    const isNew = !snap.exists;

    const now = Timestamp.now();
    const activityDoc = {
      ...payload,
      createdAt: isNew ? now : snap.data()?.createdAt || now,
      updatedAt: now,
    };

    await activityRef.set(activityDoc);

    // Audit Log
    const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
    const auditLog = auditLogSchema.parse({
      schemaVersion: 1,
      actorUid: user.uid,
      action: isNew ? "create_activity" : "update_activity",
      entityType: "activity",
      entityId: payload.id,
      metadata: {
        type: payload.type,
        instruction: payload.instruction,
      },
      createdAt: now,
    });
    await auditLogRef.set(auditLog);

    return Response.json({ ok: true, activity: activityDoc });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.message, 400);
    }
    console.error("Failed to save activity", error);
    return jsonError("Internal Server Error", 500);
  }
}
