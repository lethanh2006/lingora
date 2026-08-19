import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AdminDashboard } from "@/features/content/components/admin-dashboard";

export const metadata: Metadata = { title: "Biên dịch & Xuất bản – Admin" };

export default async function AdminContentPage() {
  await requireAdmin();
  const db = getAdminDb();

  // Fetch courses drafts
  const coursesSnap = await db.collection(COLLECTIONS.contentCourses).get();
  const courses = coursesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || "",
      summary: data.description || "",
      status: data.status || "draft",
      currentPublishedRevisionId: data.currentPublishedRevisionId || undefined,
      updatedAt: data.updatedAt
        ? new Timestamp(data.updatedAt.seconds, data.updatedAt.nanoseconds)
            .toDate()
            .toISOString()
        : undefined,
    };
  });

  // Fetch units drafts
  const unitsSnap = await db.collection(COLLECTIONS.contentUnits).get();
  const units = unitsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      courseId: data.courseId || "",
      title: data.title || "",
      order: data.order || 0,
      updatedAt: data.updatedAt
        ? new Timestamp(data.updatedAt.seconds, data.updatedAt.nanoseconds)
            .toDate()
            .toISOString()
        : undefined,
    };
  });

  // Fetch lessons drafts
  const lessonsSnap = await db.collection(COLLECTIONS.contentLessons).get();
  const lessons = lessonsSnap.docs.map((doc) => {
    const data = doc.data();
    let validationReport = undefined;
    if (data.validationReport) {
      validationReport = {
        errors: data.validationReport.errors || [],
        warnings: data.validationReport.warnings || [],
        validatedAt: data.validationReport.validatedAt
          ? new Timestamp(
              data.validationReport.validatedAt.seconds,
              data.validationReport.validatedAt.nanoseconds
            )
              .toDate()
              .toISOString()
          : undefined,
      };
    }

    return {
      id: doc.id,
      unitId: data.unitId || "",
      title: data.title || "",
      summary: data.summary || "",
      status: data.status || "draft",
      activityRefs: data.activityRefs || [],
      vocabularyRefs: data.vocabularyRefs || [],
      sourceRefs: data.sourceRefs || [],
      validationReport,
      rejectionComment: data.rejectionComment || null,
      updatedAt: data.updatedAt
        ? new Timestamp(data.updatedAt.seconds, data.updatedAt.nanoseconds)
            .toDate()
            .toISOString()
        : undefined,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <BookOpen className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Biên dịch & Xuất bản
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý quy trình xác thực (validation), biên dịch (compilation) và xuất bản các khóa học, bài học.
          </p>
        </div>
      </div>

      <AdminDashboard
        initialCourses={courses}
        initialUnits={units}
        initialLessons={lessons}
      />
    </div>
  );
}
