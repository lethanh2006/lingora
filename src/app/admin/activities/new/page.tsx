import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ActivityEditor } from "@/features/content/components/activity-editor";

export const metadata: Metadata = { title: "Tạo Hoạt động mới – Admin" };

export default async function NewActivityPage() {
  await requireAdmin();
  const db = getAdminDb();

  // Fetch available sources
  const sourcesSnap = await db
    .collection(COLLECTIONS.contentSources)
    .orderBy("__name__", "asc")
    .get();

  const availableSources = sourcesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || doc.id,
    };
  });

  return <ActivityEditor availableSources={availableSources} />;
}
