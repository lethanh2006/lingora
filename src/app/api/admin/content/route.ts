import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";
import {
  courseSchema,
  unitDraftSchema,
  lessonDraftSchema,
} from "@/features/content/schemas/content.schema";
import { auditLogSchema } from "@/features/content/schemas/audit-log.schema";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const body = await request.json();
    const { action } = body;
    const db = getAdminDb();
    const now = Timestamp.now();

    if (action === "save_course") {
      const payload = courseSchema.parse(body.course);
      const ref = db.collection(COLLECTIONS.contentCourses).doc(payload.id);
      const snap = await ref.get();
      const isNew = !snap.exists;

      if (!isNew && snap.exists) {
        const dbUpdatedAt = snap.data()?.updatedAt;
        if (dbUpdatedAt && body.clientUpdatedAt) {
          const dbIso = dbUpdatedAt.toDate().toISOString();
          if (dbIso !== body.clientUpdatedAt) {
            return Response.json({ error: "CONFLICT", message: "Học liệu đã bị thay đổi bởi người khác" }, { status: 409 });
          }
        }
      }

      const doc = {
        ...payload,
        status: "draft" as const,
        createdAt: isNew ? now : snap.data()?.createdAt || now,
        updatedAt: now,
      };
      await ref.set(doc);

      // Audit Log
      const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
      const auditLog = auditLogSchema.parse({
        schemaVersion: 1,
        actorUid: user.uid,
        action: isNew ? "create_course_draft" : "update_course_draft",
        entityType: "course_draft",
        entityId: payload.id,
        metadata: { title: payload.title },
        createdAt: now,
      });
      await auditLogRef.set(auditLog);

      return Response.json({ ok: true, course: doc });
    }

    if (action === "save_unit") {
      const payload = unitDraftSchema.parse(body.unit);
      const ref = db.collection(COLLECTIONS.contentUnits).doc(payload.id);
      const snap = await ref.get();
      const isNew = !snap.exists;

      if (!isNew && snap.exists) {
        const dbUpdatedAt = snap.data()?.updatedAt;
        if (dbUpdatedAt && body.clientUpdatedAt) {
          const dbIso = dbUpdatedAt.toDate().toISOString();
          if (dbIso !== body.clientUpdatedAt) {
            return Response.json({ error: "CONFLICT", message: "Học liệu đã bị thay đổi bởi người khác" }, { status: 409 });
          }
        }
      }

      const doc = {
        ...payload,
        status: "draft" as const,
        createdAt: isNew ? now : snap.data()?.createdAt || now,
        updatedAt: now,
      };
      await ref.set(doc);

      // Audit Log
      const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
      const auditLog = auditLogSchema.parse({
        schemaVersion: 1,
        actorUid: user.uid,
        action: isNew ? "create_unit_draft" : "update_unit_draft",
        entityType: "unit_draft",
        entityId: payload.id,
        metadata: { title: payload.title, courseId: payload.courseId },
        createdAt: now,
      });
      await auditLogRef.set(auditLog);

      return Response.json({ ok: true, unit: doc });
    }

    if (action === "save_lesson") {
      const payload = lessonDraftSchema.parse(body.lesson);
      const ref = db.collection(COLLECTIONS.contentLessons).doc(payload.id);
      const snap = await ref.get();
      const isNew = !snap.exists;

      if (!isNew && snap.exists) {
        const dbUpdatedAt = snap.data()?.updatedAt;
        if (dbUpdatedAt && body.clientUpdatedAt) {
          const dbIso = dbUpdatedAt.toDate().toISOString();
          if (dbIso !== body.clientUpdatedAt) {
            return Response.json({ error: "CONFLICT", message: "Học liệu đã bị thay đổi bởi người khác" }, { status: 409 });
          }
        }
      }

      const doc = {
        ...payload,
        status: "draft" as const,
        rejectionComment: null,
        createdAt: isNew ? now : snap.data()?.createdAt || now,
        updatedAt: now,
      };
      await ref.set(doc);

      // Audit Log
      const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
      const auditLog = auditLogSchema.parse({
        schemaVersion: 1,
        actorUid: user.uid,
        action: isNew ? "create_lesson_draft" : "update_lesson_draft",
        entityType: "lesson_draft",
        entityId: payload.id,
        metadata: { title: payload.title, unitId: payload.unitId },
        createdAt: now,
      });
      await auditLogRef.set(auditLog);

      return Response.json({ ok: true, lesson: doc });
    }

    if (action === "reorder_hierarchy") {
      const { type, items } = body; // type is "unit" or "lesson", items is array of { id, order }
      if (!type || !Array.isArray(items)) {
        return jsonError("Invalid parameters", 400);
      }

      const collName = type === "unit" ? COLLECTIONS.contentUnits : COLLECTIONS.contentLessons;
      await db.runTransaction(async (transaction) => {
        for (const item of items) {
          const ref = db.collection(collName).doc(item.id);
          transaction.update(ref, {
            order: item.order,
            updatedAt: now,
          });
        }
      });

      // Audit Log
      const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
      const auditLog = auditLogSchema.parse({
        schemaVersion: 1,
        actorUid: user.uid,
        action: "reorder_hierarchy",
        entityType: `${type}_reorder`,
        entityId: "bulk",
        metadata: { itemCount: items.length },
        createdAt: now,
      });
      await auditLogRef.set(auditLog);

      return Response.json({ ok: true });
    }

    return jsonError("Action not supported", 400);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.message, 400);
    }
    console.error("Failed in content save API", error);
    return jsonError("Internal Server Error", 500);
  }
}
