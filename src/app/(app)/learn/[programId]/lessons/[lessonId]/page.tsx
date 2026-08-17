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
  let revSnap;
  try {
    revSnap = await db
      .collection(COLLECTIONS.publishedLessonRevisions)
      .where("lessonId", "==", lessonId)
      .where("programId", "==", programId)
      .orderBy("revisionNumber", "desc")
      .limit(1)
      .get();
  } catch (err: unknown) {
    const errMsg = String(err);
    if (errMsg.includes("requires an index") || errMsg.includes("FAILED_PRECONDITION")) {
      console.warn("Firestore index not ready for publishedLessonRevisions. Falling back to in-memory filtering.");
      const allRevs = await db
        .collection(COLLECTIONS.publishedLessonRevisions)
        .where("lessonId", "==", lessonId)
        .where("programId", "==", programId)
        .get();
      const sortedDocs = allRevs.docs.sort((a, b) => {
        const revA = a.data().revisionNumber || 0;
        const revB = b.data().revisionNumber || 0;
        return revB - revA;
      });
      revSnap = {
        empty: sortedDocs.length === 0,
        docs: sortedDocs.slice(0, 1),
      };
    } else {
      throw err;
    }
  }

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
    languageId: revision.languageId,
    title: revision.title,
    summary: revision.summary,
    objectives: revision.objectives || [],
    estimatedMinutes: revision.estimatedMinutes || 5,
    activities: revision.activities || [],
    vocabulary: revision.vocabulary || [],
  };

  return <LessonPlayer lessonRevision={lessonRevision} />;
}
