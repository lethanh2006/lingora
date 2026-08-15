import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock3, Layers3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { createCatalogRepository } from "@/features/catalog/catalog.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ programId: string; courseId: string }>;
}) {
  await requireUser();
  const { programId, courseId } = await params;
  const repository = createCatalogRepository(getAdminDb());
  const [program, course] = await Promise.all([
    repository.getPublishedProgram(programId),
    repository.getPublishedCourse(courseId),
  ]);
  if (!program || !course || course.programId !== program.id) notFound();

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

      <section aria-labelledby="lesson-heading" className="space-y-4">
        <h2 id="lesson-heading" className="text-2xl font-semibold tracking-tight">Bài học</h2>
        <CatalogEmptyState
          icon={BookOpen}
          title="Danh sách bài học sẽ xuất hiện tại đây"
          description="Course overview đã sẵn sàng. Lesson player sẽ được kết nối ở phần triển khai kế tiếp."
        />
      </section>
    </div>
  );
}
