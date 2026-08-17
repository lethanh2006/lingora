import Link from "next/link";

import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { LessonPlayer } from "@/features/content/components/lesson-player";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ programId: string; lessonId: string }>;
}) {
  await requireUser();
  const { programId, lessonId } = await params;
  const db = getAdminDb();

  // Find the latest published revision for this lesson
  const revSnap = await db
    .collection(COLLECTIONS.publishedLessonRevisions)
    .where("lessonId", "==", lessonId)
    .where("programId", "==", programId)
    .orderBy("revisionNumber", "desc")
    .limit(1)
    .get();

  if (revSnap.empty) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Bài học chưa xuất bản</h2>
        <p className="text-muted-foreground text-sm">
          Bài học này hiện chưa được xuất bản hoặc không thuộc chương trình học hiện tại.
        </p>
        <Link href={`/learn/${programId}`} className="text-sm underline text-primary inline-block">
          Quay lại chương trình học
        </Link>
      </div>
    );
  }

  const revisionDoc = revSnap.docs[0];
  const revision = revisionDoc.data();

  // Make a clean payload to pass to the client component
  const lessonRevision = {
    lessonId: revision.lessonId,
    courseId: revision.courseId,
    programId: revision.programId,
    title: revision.title,
    summary: revision.summary,
    objectives: revision.objectives || [],
    estimatedMinutes: revision.estimatedMinutes || 5,
    activities: revision.activities || [],
    vocabulary: revision.vocabulary || [],
  };

  return <LessonPlayer lessonRevision={lessonRevision} />;
}
