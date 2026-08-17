import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AdminDashboard } from "@/features/content/components/admin-dashboard";

export const metadata: Metadata = { title: "Quản trị" };

export default async function AdminPage() {
  const user = await requireAdmin();
  const db = getAdminDb();

  const coursesSnap = await db.collection(COLLECTIONS.contentCourses).get();
  const courses = coursesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || "",
      summary: data.summary || "",
      status: data.status || "draft",
      currentPublishedRevisionId: data.currentPublishedRevisionId,
    };
  });

  const unitsSnap = await db.collection(COLLECTIONS.contentUnits).get();
  const units = unitsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      courseId: data.courseId || "",
      title: data.title || "",
      order: data.order || 0,
    };
  });

  const lessonsSnap = await db.collection(COLLECTIONS.contentLessons).get();
  const lessons = lessonsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      unitId: data.unitId || "",
      title: data.title || "",
      summary: data.summary || "",
      status: data.status || "draft",
      activityRefs: data.activityRefs || [],
      vocabularyRefs: data.vocabularyRefs || [],
      sourceRefs: data.sourceRefs || [],
      validationReport: data.validationReport
        ? {
            errors: data.validationReport.errors || [],
            warnings: data.validationReport.warnings || [],
            validatedAt: data.validationReport.validatedAt
              ? (data.validationReport.validatedAt.toDate
                ? data.validationReport.validatedAt.toDate().toISOString()
                : data.validationReport.validatedAt)
              : undefined,
          }
        : undefined,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Đăng nhập với {user.email}</p>
          <h1 className="text-3xl font-bold tracking-tight">Khu vực quản trị</h1>
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
