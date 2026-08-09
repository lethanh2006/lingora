import { FieldValue } from "firebase-admin/firestore";

import { profileSchema } from "@/features/user/schemas/profile.schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { hasValidOrigin, jsonError } from "@/lib/http";

export async function PUT(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  try {
    const input = profileSchema.parse(await request.json());
    await Promise.all([
      getAdminAuth().updateUser(user.uid, { displayName: input.displayName }),
      getAdminDb().collection(COLLECTIONS.users).doc(user.uid).set(
        { displayName: input.displayName, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      ),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to update profile", error);
    return jsonError("Unable to update profile", 400);
  }
}
