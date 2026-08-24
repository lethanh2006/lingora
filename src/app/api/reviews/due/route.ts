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
  const programId = searchParams.get("programId") ?? null;
  const mode = searchParams.get("mode") ?? "due"; // "due" | "all"

  try {
    const db = getAdminDb();
    const now = Timestamp.now();

    // Build base query
    let query = db
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .collection(USER_SUBCOLLECTIONS.reviewItems) as FirebaseFirestore.Query;

    if (mode === "due") {
      query = query.where("dueAt", "<=", now);
    }

    if (programId) {
      query = query.where("programId", "==", programId);
    }

    // Firestore compound queries need composite indexes; fall back to in-memory sort
    let snap;
    try {
      snap = await query
        .orderBy("dueAt", "asc")
        .limit(limitVal * 2)
        .get();
    } catch (indexErr: unknown) {
      const msg = String(indexErr);
      if (msg.includes("requires an index") || msg.includes("FAILED_PRECONDITION")) {
        // Fallback: fetch without ordering, sort in memory
        snap = await query.limit(limitVal * 4).get();
      } else {
        throw indexErr;
      }
    }

    const allItems = snap.docs
      .map((d) => ({ id: d.id, ...d.data() })) as any[];

    // Filter items
    const filteredItems = allItems
      .filter((item) => {
        if (item.state === "suspended") return false;
        if (mode === "due") {
          return item.state !== "mastered";
        }
        return true; // mode === "all" includes mastered & future-due cards
      })
      .sort((a, b) => {
        const aMs = a.dueAt?.seconds ?? 0;
        const bMs = b.dueAt?.seconds ?? 0;
        return aMs - bMs;
      })
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
