import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicCourseDto } from "@/features/content/schemas/content.schema";

export function CourseCard({
  course,
  programId,
}: {
  course: PublicCourseDto;
  programId: string;
}) {
  return (
    <Link href={`/learn/${programId}/courses/${course.id}`} className="group block">
      <Card className="transition group-hover:border-primary/40 group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardDescription>Trình độ {course.levelId.toUpperCase()}</CardDescription>
              <CardTitle className="mt-1">{course.title}</CardTitle>
            </div>
            <ArrowRight className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
            <Clock3 className="size-4 text-primary" aria-hidden="true" />
            Khoảng {course.estimatedMinutes} phút
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
