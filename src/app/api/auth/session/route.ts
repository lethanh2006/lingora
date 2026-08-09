import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { sessionSchema } from "@/features/auth/schemas/auth.schema";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { hasValidOrigin, jsonError } from "@/lib/http";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  try {
    const { idToken } = sessionSchema.parse(await request.json());
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);

    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return jsonError("Recent sign-in required", 401);
    }

    const authUser = await auth.getUser(decoded.uid);
    const userRef = getAdminDb().collection(COLLECTIONS.users).doc(decoded.uid);
    const snapshot = await userRef.get();

    if (snapshot.exists) {
      await userRef.set(
        {
          email: authUser.email ?? "",
          displayName: authUser.displayName ?? "Lingora learner",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      await userRef.set({
        email: authUser.email ?? "",
        displayName: authUser.displayName ?? "Lingora learner",
        role: "user",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Failed to create session", error);
    return jsonError("Unable to create session", 401);
  }
}
