import Link from "next/link";
import { ArrowLeft, HelpCircle, FileText } from "lucide-react";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { compilePublishedLesson, getPublishedLessonSizeBytes } from "@/features/content/services/publish-lesson";
import {
  lessonDraftSchema,
  activityDraftSchema,
  sourceAttributionSchema,
  type ActivityDraft,
  type SourceAttribution,
} from "@/features/content/schemas/content.schema";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

type VocabularyItem = {
  lexemeId: string;
  term: string;
  meaningVi: string;
  pronunciation: string | null;
  example: string | null;
  mediaRefs: string[];
};

export default async function LessonPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ activityIndex?: string }>;
}) {
  await requireAdmin();
  const { lessonId } = await params;
  const { activityIndex } = await searchParams;
  const db = getAdminDb();

  const lessonSnap = await db.collection(COLLECTIONS.contentLessons).doc(lessonId).get();
  if (!lessonSnap.exists) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Bài học không tồn tại</h2>
        <Link href="/admin" className="text-sm underline mt-2 inline-block">
          Quay lại Admin
        </Link>
      </div>
    );
  }

  const lesson = lessonDraftSchema.parse(lessonSnap.data());

  const unitSnap = await db.collection(COLLECTIONS.contentUnits).doc(lesson.unitId).get();
  const unit = unitSnap.data()!;
  const courseSnap = await db.collection(COLLECTIONS.contentCourses).doc(unit.courseId).get();
  const course = courseSnap.data()!;
  const programSnap = await db.collection(COLLECTIONS.programs).doc(course.programId).get();
  const program = programSnap.data()!;

  const activities: ActivityDraft[] = [];
  const errors: string[] = [];

  for (const activityId of lesson.activityRefs) {
    const actSnap = await db.collection(COLLECTIONS.contentActivities).doc(activityId).get();
    if (!actSnap.exists) {
      errors.push(`Thiếu activity: ${activityId}`);
    } else {
      try {
        activities.push(activityDraftSchema.parse(actSnap.data()));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Activity ${activityId} lỗi cấu trúc: ${msg}`);
      }
    }
  }

  const vocabulary: VocabularyItem[] = [];
  for (const lexemeId of lesson.vocabularyRefs) {
    const lexSnap = await db.collection(COLLECTIONS.lexemes).doc(lexemeId).get();
    if (lexSnap.exists) {
      const data = lexSnap.data()!;
      vocabulary.push({
        lexemeId,
        term: data.term || "",
        meaningVi: data.meaningVi || "",
        pronunciation: data.pronunciation ?? null,
        example: data.example ?? null,
        mediaRefs: data.mediaRefs || [],
      });
    } else {
      errors.push(`Thiếu lexeme: ${lexemeId}`);
    }
  }

  const sourceAttributions: SourceAttribution[] = [];
  const allSourceRefs = Array.from(
    new Set([...lesson.sourceRefs, ...activities.flatMap((a) => a.sourceRefs || [])]),
  );
  for (const sourceId of allSourceRefs) {
    const srcSnap = await db.collection(COLLECTIONS.contentSources).doc(sourceId).get();
    if (srcSnap.exists) {
      sourceAttributions.push(sourceAttributionSchema.parse(srcSnap.data()));
    } else {
      errors.push(`Thiếu nguồn tài liệu: ${sourceId}`);
    }
  }

  let compiledLesson: ReturnType<typeof compilePublishedLesson> | null = null;
  let compileErrorMessage: string | null = null;

  if (errors.length === 0) {
    try {
      compiledLesson = compilePublishedLesson({
        revisionId: "preview-temp-id",
        revisionNumber: 0,
        publishedAt: new Date() as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        publishedBy: "preview-actor",
        lesson,
        courseId: unit.courseId,
        programId: course.programId,
        languageId: program.languageId,
        activities,
        vocabulary,
        mediaManifest: [],
        sourceAttributions,
      });
    } catch (err: unknown) {
      compileErrorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  const selectedIndex = parseInt(activityIndex || "0", 10);
  const selectedActivity = activities[selectedIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4 mr-1.5" />
            Admin CMS
          </Button>
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Xem trước nội dung (Draft Preview)</p>
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
        </div>
      </div>

      <div className="p-4 rounded-xl border bg-card space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4 text-primary" />
          Kiểm thử xuất bản (Publish Diagnostic)
        </h2>
        {errors.length > 0 ? (
          <div className="text-xs text-red-600 space-y-1">
            <p className="font-semibold">⚠️ Chặn xuất bản do thiếu tài nguyên liên kết:</p>
            <ul className="list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        ) : compileErrorMessage ? (
          <div className="text-xs text-red-600">
            <p className="font-semibold">⚠️ Lỗi biên dịch (Compiler Error):</p>
            <p className="mt-1 font-mono">{compileErrorMessage}</p>
          </div>
        ) : (
          <div className="text-xs text-green-600">
            <p className="font-semibold">✅ Trạng thái biên dịch: Sẵn sàng (Ready to Publish)</p>
            {compiledLesson && (
              <p className="mt-1 text-2xs font-mono text-muted-foreground">
                Checksum: {compiledLesson.checksum} | Size:{" "}
                {(getPublishedLessonSizeBytes(compiledLesson) / 1024).toFixed(2)} KB
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
            Danh sách Hoạt động ({activities.length})
          </h3>
          <div className="space-y-1">
            {activities.map((act, index) => {
              const active = index === selectedIndex;
              return (
                <Link
                  key={act.id}
                  href={`/admin/preview/lessons/${lessonId}?activityIndex=${index}`}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="opacity-70 font-mono">#{index + 1}</span>
                  <div className="truncate">
                    <p className="truncate font-semibold">{act.prompt || act.instruction}</p>
                    <p
                      className={`text-2xs opacity-80 uppercase ${active ? "" : "text-muted-foreground"}`}
                    >
                      {act.type}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {selectedActivity ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">
                    ID: {selectedActivity.id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-2xs uppercase font-bold">
                    {selectedActivity.type}
                  </span>
                </div>
                <CardTitle className="text-xl mt-2">{selectedActivity.prompt}</CardTitle>
                <CardDescription className="text-sm">
                  {selectedActivity.instruction}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedActivity.type === "explanation" && (
                  <div className="p-4 bg-muted/30 rounded-xl whitespace-pre-wrap text-sm text-foreground">
                    {selectedActivity.body}
                  </div>
                )}

                {selectedActivity.type === "vocabulary_card" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedActivity.entries?.map((entry, i: number) => (
                      <div key={i} className="p-4 rounded-xl border bg-muted/10 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-bold">{entry.term}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {entry.pronunciation}
                          </span>
                        </div>
                        <p className="text-sm text-foreground font-medium">{entry.meaningVi}</p>
                        {entry.example && (
                          <p className="text-xs text-muted-foreground italic">
                            VD: &quot;{entry.example}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedActivity.type === "single_choice" && (
                  <div className="space-y-2">
                    {selectedActivity.options?.map((opt) => {
                      const isCorrect =
                        selectedActivity.scoringDefinition.correctOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border flex items-center justify-between text-sm ${
                            isCorrect ? "border-green-500 bg-green-50/50" : "bg-background"
                          }`}
                        >
                          <span>{opt.text}</span>
                          {isCorrect && (
                            <span className="text-xs font-semibold text-green-600">Đúng</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedActivity.type === "gap_fill" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-xl text-center text-lg font-mono">
                      {selectedActivity.template}
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                        Đáp án đúng
                      </h4>
                      {selectedActivity.scoringDefinition.answers?.map((ans, i: number) => (
                        <div key={i} className="p-3 rounded-xl border text-sm bg-background">
                          Gap <strong>{ans.gapId}</strong>:{" "}
                          <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                            {ans.acceptedAnswers.join(" | ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedActivity.type === "reorder_tokens" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedActivity.tokens?.map((tok) => (
                        <span key={tok.id} className="px-3 py-1.5 rounded-lg border text-sm font-medium">
                          {tok.text}
                        </span>
                      ))}
                    </div>
                    <div className="p-3 bg-muted/10 rounded-xl border text-xs text-muted-foreground">
                      Thứ tự đúng:{" "}
                      <strong className="font-mono text-foreground">
                        {selectedActivity.scoringDefinition.correctTokenIds?.join(" → ")}
                      </strong>
                    </div>
                  </div>
                )}

                {selectedActivity.type === "listening_choice" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/30 rounded-xl border text-sm italic">
                      Transcript: &quot;{selectedActivity.transcript}&quot;
                    </div>
                    <div className="space-y-2">
                      {selectedActivity.options?.map((opt) => {
                        const isCorrect =
                          selectedActivity.scoringDefinition.correctOptionId === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border flex items-center justify-between text-sm ${
                              isCorrect ? "border-green-500 bg-green-50/50" : "bg-background"
                            }`}
                          >
                            <span>{opt.text}</span>
                            {isCorrect && (
                              <span className="text-xs font-semibold text-green-600">Đúng</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 border border-dashed rounded-2xl text-center text-muted-foreground">
              <HelpCircle className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Bài học chưa cấu hình hoạt động nào.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
