import { z } from "zod";
import { ZodError } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "@/lib/firebase/collections";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { enrollmentGoalTypeSchema, enrollmentSchema } from "@/features/enrollment/schemas/enrollment.schema";
import { stableIdSchema } from "@/features/content/schemas/content.schema";

const MAX_REQUEST_BYTES = 4_096;

const updateEnrollmentPrefsSchema = z.object({
  programId: stableIdSchema,
  goalType: enrollmentGoalTypeSchema.optional(),
  targetLevelId: stableIdSchema.optional(),
  dailyGoalMinutes: z.number().int().min(5).max(240).optional(),
}).strict();

/**
 * PATCH /api/enrollments/[programId]/prefs
 * Update learner preferences (goalType, targetLevelId, dailyGoalMinutes) for an enrollment.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  try {
    const { programId } = await params;
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request body too large", 413);
    }

    const input = updateEnrollmentPrefsSchema.parse({ programId, ...JSON.parse(body) });

    const db = getAdminDb();
    const enrollmentRef = db
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .collection(USER_SUBCOLLECTIONS.enrollments)
      .doc(programId);

    const snap = await enrollmentRef.get();
    if (!snap.exists) {
      return jsonError("Enrollment not found", 404);
    }

    const updates: Record<string, any> = {
      lastActivityAt: Timestamp.now(),
    };

    if (input.goalType !== undefined) updates.goalType = input.goalType;
    if (input.targetLevelId !== undefined) updates.targetLevelId = input.targetLevelId;
    if (input.dailyGoalMinutes !== undefined) updates.dailyGoalMinutes = input.dailyGoalMinutes;

    await enrollmentRef.update(updates);

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request body", 400);
    }
    console.error("Failed to update enrollment prefs", error);
    return jsonError("Unable to update enrollment preferences", 500);
  }
}
