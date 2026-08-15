import Link from "next/link";
import { ArrowRight, Languages } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicProgramDto } from "@/features/content/schemas/content.schema";

const languageLabels = {
  en: "Tiếng Anh",
  ja: "Tiếng Nhật",
  zh: "Tiếng Trung",
} as const;

export function ProgramCard({ program }: { program: PublicProgramDto }) {
  return (
    <Link href={`/learn/${program.id}`} className="group block h-full">
      <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Languages className="size-5" aria-hidden="true" />
            </span>
            <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="pt-3">{program.title}</CardTitle>
          <CardDescription>{languageLabels[program.languageId]}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{program.description}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-muted px-3 py-1.5">
              {program.frameworkCode.toUpperCase()} · {program.frameworkVersion}
            </span>
            <span className="rounded-full bg-muted px-3 py-1.5">
              {program.levelIds.length} trình độ
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
