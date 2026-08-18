import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ActivityEditor } from "@/features/content/components/activity-editor";

export const metadata: Metadata = { title: "Chỉnh sửa Hoạt động – Admin" };

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  await requireAdmin();
  const { activityId } = await params;
  const db = getAdminDb();

  // Fetch the activity
  const activitySnap = await db
    .collection(COLLECTIONS.contentActivities)
    .doc(activityId)
    .get();

  if (!activitySnap.exists) {
    notFound();
  }

  const activity = activitySnap.data()!;

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

  return (
    <ActivityEditor
      initialActivity={activity}
      availableSources={availableSources}
    />
  );
}
