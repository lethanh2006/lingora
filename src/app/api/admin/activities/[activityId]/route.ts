import { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";
import { auditLogSchema } from "@/features/content/schemas/audit-log.schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  const { activityId } = await params;
  const db = getAdminDb();

  const snap = await db.collection(COLLECTIONS.contentActivities).doc(activityId).get();
  if (!snap.exists) return jsonError("Activity not found", 404);

  return Response.json({ activity: snap.data() });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  const { activityId } = await params;
  const db = getAdminDb();

  const activityRef = db.collection(COLLECTIONS.contentActivities).doc(activityId);
  const snap = await activityRef.get();
  if (!snap.exists) return jsonError("Activity not found", 404);

  const data = snap.data()!;

  await activityRef.delete();

  // Audit Log
  const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
  const auditLog = auditLogSchema.parse({
    schemaVersion: 1,
    actorUid: user.uid,
    action: "delete_activity",
    entityType: "activity",
    entityId: activityId,
    metadata: {
      type: data.type,
      instruction: data.instruction,
    },
    createdAt: Timestamp.now(),
  });
  await auditLogRef.set(auditLog);

  return Response.json({ ok: true });
}
