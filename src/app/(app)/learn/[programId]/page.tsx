import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { CourseCard } from "@/features/catalog/components/course-card";
import { createCatalogRepository } from "@/features/catalog/catalog.repository";
import { EnrollmentAction } from "@/features/enrollment/components/enrollment-action";
import { createEnrollmentService } from "@/features/enrollment/enrollment.service";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const [user, { programId }] = await Promise.all([requireUser(), params]);
  const firestore = getAdminDb();
  const catalogRepository = createCatalogRepository(firestore);
  const enrollmentService = createEnrollmentService(firestore);
  const [program, courses, enrollment] = await Promise.all([
    catalogRepository.getPublishedProgram(programId),
    catalogRepository.listPublishedCourses(programId),
    enrollmentService.getEnrollment(user.uid, programId),
  ]);
  if (!program) notFound();

  return (
    <div className="space-y-8">
      <header>
        <Link href="/learn" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Tất cả chương trình
        </Link>
        <p className="mt-6 text-sm font-semibold text-primary">
          {program.frameworkCode.toUpperCase()} · {program.frameworkVersion}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{program.title}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{program.description}</p>
      </header>

      <EnrollmentAction programId={program.id} isEnrolled={enrollment !== null} />

      <section aria-labelledby="course-heading" className="space-y-4">
        <div>
          <h2 id="course-heading" className="text-2xl font-semibold tracking-tight">Khóa học</h2>
          <p className="mt-1 text-sm text-muted-foreground">Học theo thứ tự từ nền tảng đến ứng dụng.</p>
        </div>
        {courses.length === 0 ? (
          <CatalogEmptyState
            icon={BookOpen}
            title="Chưa có khóa học được xuất bản"
            description="Lộ trình đã sẵn sàng nhưng nội dung khóa học vẫn đang được kiểm duyệt."
          />
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} programId={program.id} />
            ))}
          </div>
        )}
      </section>

      <Link href="/learn" className={buttonVariants({ variant: "outline" })}>Chọn chương trình khác</Link>
    </div>
  );
}
