import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { UserProfile, UserRole } from "@/features/user/types";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const SESSION_COOKIE_NAME = "lingora_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export async function getCurrentUser(): Promise<UserProfile | null> {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    const snapshot = await getAdminDb()
      .collection(COLLECTIONS.users)
      .doc(decoded.uid)
      .get();
    const profile = snapshot.data();

    return {
      uid: decoded.uid,
      email: profile?.email ?? decoded.email ?? "",
      displayName: profile?.displayName ?? decoded.name ?? "Lingora learner",
      role: profile?.role === "admin" ? "admin" : ("user" as UserRole),
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard?error=forbidden");
  return user;
}
