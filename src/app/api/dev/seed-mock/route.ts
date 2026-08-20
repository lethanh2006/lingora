import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const db = getAdminDb();
  const userId = user.uid;

  try {
    // 1. Fetch all published lesson revisions
    const revisionsSnap = await db.collection("publishedLessonRevisions").get();
    if (revisionsSnap.empty) {
      return Response.json({ ok: false, error: "Chưa có bài học nào được xuất bản trong hệ thống. Vui lòng chạy lệnh seed trước." });
    }

    const batch = db.batch();

    // 2. Create active enrollments for each program found in revisions
    const programs = new Set<string>();
    revisionsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.programId) programs.add(data.programId);
    });

    const now = Timestamp.now();

    for (const programId of programs) {
      const enrollmentRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection("enrollments")
        .doc(programId);

      batch.set(enrollmentRef, {
        schemaVersion: 1,
        id: programId,
        uid: userId,
        programId,
        status: "active",
        currentCourseId: programId.includes("zh") ? "zh-basics-course-1" : programId.includes("ja") ? "ja-basics-course-1" : "en-basics-course-1",
        completedLessonIds: [],
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    // 3. Create completed progress & review items for all published lessons
    for (const doc of revisionsSnap.docs) {
      const revisionData = doc.data();
      const lessonId = revisionData.lessonId;
      const revisionId = doc.id;

      // Set lesson progress as completed
      const progressRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection("lessonProgress")
        .doc(lessonId);

      const boundedActivityState: Record<string, any> = {};
      const activities = revisionData.activities || [];
      activities.forEach((act: any) => {
        boundedActivityState[act.id] = {
          completed: true,
          score: 100,
          attempts: 1,
          lastResponse: null,
          updatedAt: now,
        };
      });

      batch.set(progressRef, {
        schemaVersion: 1,
        lessonId,
        lessonRevisionId: revisionId,
        status: "completed",
        masteryStatus: "not_assessed",
        completedRequiredCount: activities.length,
        requiredActivityCount: activities.length,
        lastActivityId: activities[activities.length - 1]?.id || null,
        boundedActivityState,
        checkpointScore: 100,
        bestCheckpointScore: 100,
        timeSpentSeconds: 300,
        startedAt: now,
        completedAt: now,
        lastActivityAt: now,
      }, { merge: true });

      // Generate review items
      const vocabulary = revisionData.vocabulary || [];
      for (const vocab of vocabulary) {
        const reviewItemRef = db
          .collection(COLLECTIONS.users)
          .doc(userId)
          .collection("reviewItems")
          .doc(vocab.lexemeId);

        batch.set(reviewItemRef, {
          schemaVersion: 1,
          id: vocab.lexemeId,
          uid: userId,
          programId: revisionData.programId,
          languageId: revisionData.languageId,
          targetType: "lexeme",
          targetId: vocab.lexemeId,
          state: "new",
          dueAt: now, // immediately due!
          intervalDays: 0,
          ease: 2.5,
          correctStreak: 0,
          lapseCount: 0,
          lastReviewedAt: null,
          schedulerVersion: "simple-sm2-v1",
          createdAt: now,
          updatedAt: now,
        }, { merge: true });
      }
    }

    // 4. Create some mock daily stats for the last 3 days to simulate a streak
    const tzOffset = 7 * 60 * 60 * 1000;
    for (let i = 0; i < 3; i++) {
      const date = new Date(Date.now() + tzOffset - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      const statRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection("dailyStats")
        .doc(dateStr);

      batch.set(statRef, {
        schemaVersion: 1,
        date: dateStr,
        timeSpentSeconds: 600,
        lessonsCompletedCount: 1,
        updatedAt: now,
      }, { merge: true });
    }

    await batch.commit();
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("Failed to seed mock data:", error);
    return jsonError(error.message || "Không thể tạo dữ liệu demo", 500);
  }
}
