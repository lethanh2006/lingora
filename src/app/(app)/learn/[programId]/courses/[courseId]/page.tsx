import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock3, Layers3, Play, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { createCatalogRepository } from "@/features/catalog/catalog.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ programId: string; courseId: string }>;
}) {
  const user = await requireUser();
  const { programId, courseId } = await params;
  const db = getAdminDb();
  const repository = createCatalogRepository(db);
  const [program, course] = await Promise.all([
    repository.getPublishedProgram(programId),
    repository.getPublishedCourse(courseId),
  ]);
  if (!program || !course || course.programId !== program.id) notFound();

  // Fetch student progress for the lessons in this course
  const progressSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection("lessonProgress")
    .get();

  const progressMap: Record<string, string> = {};
  progressSnap.docs.forEach((doc) => {
    progressMap[doc.id] = doc.data().status || "not_started";
  });

  // Fetch course curriculum from the active revision pointer
  const revisionId = course.currentPublishedRevisionId;
  
  type UnitData = {
    id: string;
    title: string;
    order: number;
  };

  type LessonRevisionData = {
    id: string;
    lessonId: string;
    unitId: string;
    title: string;
    summary: string;
    estimatedMinutes: number;
    activities: unknown[];
    vocabulary: unknown[];
  };

  let units: UnitData[] = [];
  let lessons: LessonRevisionData[] = [];

  if (revisionId) {
    const revSnap = await db.collection(COLLECTIONS.publishedCourseRevisions).doc(revisionId).get();
    if (revSnap.exists) {
      const revData = revSnap.data()!;
      const orderedUnitIds = revData.orderedUnitIds || [];
      const lessonRevisionMap = revData.lessonRevisionMap || {};

      // Fetch units in order
      if (orderedUnitIds.length > 0) {
        const unitPromises = orderedUnitIds.map(async (unitId: string) => {
          const snap = await db.collection(COLLECTIONS.contentUnits).doc(unitId).get();
          if (!snap.exists) return null;
          const udata = snap.data()!;
          return { id: snap.id, title: udata.title || "", order: udata.order || 0 };
        });
        units = (await Promise.all(unitPromises)).filter((u): u is UnitData => u !== null);
      }

      // Fetch lesson revisions
      const lessonRevIds = Object.values(lessonRevisionMap) as string[];
      if (lessonRevIds.length > 0) {
        const lessonPromises = lessonRevIds.map(async (revId: string) => {
          const snap = await db.collection(COLLECTIONS.publishedLessonRevisions).doc(revId).get();
          if (!snap.exists) return null;
          const ldata = snap.data()!;
          return {
            id: snap.id,
            lessonId: ldata.lessonId || "",
            unitId: ldata.unitId || "",
            title: ldata.title || "",
            summary: ldata.summary || "",
            estimatedMinutes: ldata.estimatedMinutes || 0,
            activities: ldata.activities || [],
            vocabulary: ldata.vocabulary || [],
          };
        });
        lessons = (await Promise.all(lessonPromises)).filter((l): l is LessonRevisionData => l !== null);
      }
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <Link
          href={`/learn/${program.id}`}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← {program.title}
        </Link>
        <p className="mt-6 text-sm font-semibold text-primary">Trình độ {course.levelId.toUpperCase()}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{course.description}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Clock3 className="size-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Thời lượng dự kiến</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{course.estimatedMinutes} phút</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Layers3 className="size-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Khung trình độ</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{course.levelId.toUpperCase()}</CardContent>
        </Card>
      </div>

      <section aria-labelledby="lesson-heading" className="space-y-6">
        <h2 id="lesson-heading" className="text-2xl font-semibold tracking-tight">Chương trình học</h2>
        
        {units.length === 0 ? (
          <CatalogEmptyState
            icon={BookOpen}
            title="Danh sách bài học chưa xuất bản"
            description="Nội dung khóa học đang được biên soạn và sẽ sớm ra mắt."
          />
        ) : (
          <div className="space-y-8">
            {units.map((unit, index) => {
              const unitLessons = lessons.filter((l) => l.unitId === unit.id);

              return (
                <div key={unit.id} className="space-y-4">
                  <div className="border-b pb-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Unit {index + 1}
                    </span>
                    <h3 className="text-lg font-bold text-foreground">{unit.title}</h3>
                  </div>

                  {unitLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic pl-2">
                      Không có bài học nào trong phần này.
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {unitLessons.map((lesson) => {
                        const status = progressMap[lesson.lessonId] || "not_started";

                        return (
                          <Link
                            key={lesson.id}
                            href={`/learn/${program.id}/lessons/${lesson.lessonId}`}
                            className={`flex items-center justify-between p-4 rounded-xl border bg-background hover:bg-muted/30 transition group ${
                              status === "completed" ? "border-green-200 bg-green-50/10" : ""
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground group-hover:text-primary transition">
                                  {lesson.title}
                                </h4>
                                {status === "completed" && (
                                  <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-green-100 text-green-800 border border-green-200">
                                    Hoàn thành
                                  </span>
                                )}
                                {status === "in_progress" && (
                                  <span className="px-2 py-0.5 rounded-full text-3xs font-bold uppercase bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    Đang học
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{lesson.summary}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>⏱️ {lesson.estimatedMinutes} phút</span>
                                <span>💡 {lesson.activities.length} câu hỏi</span>
                                <span>📝 {lesson.vocabulary.length} từ vựng</span>
                              </div>
                            </div>
                            
                            <div className={`grid size-9 place-items-center rounded-full transition ${
                              status === "completed"
                                ? "bg-green-100 text-green-700 group-hover:bg-green-600 group-hover:text-white"
                                : status === "in_progress"
                                ? "bg-yellow-100 text-yellow-700 group-hover:bg-yellow-600 group-hover:text-white"
                                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                            }`}>
                              {status === "completed" ? (
                                <CheckCircle2 className="size-4" />
                              ) : (
                                <Play className="size-4 ml-0.5" />
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
