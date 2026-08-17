import { Timestamp } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limitVal = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam) || 30)) : 30;

  try {
    const db = getAdminDb();
    const now = Timestamp.now();

    // Query due items within users/{uid}/reviewItems
    const snap = await db
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .collection(USER_SUBCOLLECTIONS.reviewItems)
      .where("dueAt", "<=", now)
      .orderBy("dueAt", "asc")
      .limit(limitVal * 2) // Fetch a bit more to allow for in-memory filtering of suspended/mastered
      .get();

    const allItems = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as any[];

    // Filter out mastered and suspended items in-memory
    const filteredItems = allItems
      .filter((item) => item.state !== "mastered" && item.state !== "suspended")
      .slice(0, limitVal);

    if (filteredItems.length === 0) {
      return Response.json({ items: [] });
    }

    // Fetch details of associated lexemes
    const lexemeSnaps = await Promise.all(
      filteredItems.map((item) =>
        db.collection(COLLECTIONS.lexemes).doc(item.targetId).get()
      )
    );

    const lexemesMap = new Map<string, any>();
    lexemeSnaps.forEach((s) => {
      if (s.exists) {
        lexemesMap.set(s.id, s.data());
      }
    });

    const items = filteredItems.map((item) => ({
      ...item,
      lexeme: lexemesMap.get(item.targetId) || null,
    }));

    return Response.json({ items });
  } catch (error) {
    console.error("Failed to fetch due reviews", error);
    return jsonError("Unable to fetch due reviews", 500);
  }
}
