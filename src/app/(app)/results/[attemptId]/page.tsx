import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { Check, X, ArrowLeft, Award, Clock, BarChart3, HelpCircle } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "@/lib/firebase/collections.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  attemptSchema,
  attemptSectionSchema,
  questionVersionSchema,
  examBlueprintSchema,
} from "@/features/assessment/schemas/assessment.schema.ts";
import { scoreQuestion } from "@/features/assessment/services/attempt.service.ts";

interface ResultsPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const user = await requireUser();
  const { attemptId } = await params;
  const db = getAdminDb();

  // 1. Fetch Attempt
  const attemptSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection(USER_SUBCOLLECTIONS.attempts)
    .doc(attemptId)
    .get();

  if (!attemptSnap.exists) {
    notFound();
  }

  let attempt;
  try {
    attempt = attemptSchema.parse(attemptSnap.data());
  } catch (err) {
    console.error("Invalid attempt schema in DB", err);
    notFound();
  }

  // If the attempt is still in progress, redirect back to attempt screen
  if (attempt.state === "in_progress") {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 space-y-6">
        <div className="size-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2 animate-bounce">
          <Clock className="size-8" />
        </div>
        <h1 className="text-xl font-bold">Bài thi chưa hoàn thành!</h1>
        <p className="text-muted-foreground text-sm">
          Bài thi này chưa được nộp. Bạn hãy nhấp vào nút bên dưới để tiếp tục làm bài.
        </p>
        <Link
          href={`/attempts/${attemptId}`}
          className="inline-flex h-10 px-6 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm"
        >
          Tiếp tục thi
        </Link>
      </div>
    );
  }

  // 2. Fetch Form Version and Blueprint
  const formSnap = await db.collection(COLLECTIONS.examFormVersions).doc(attempt.examFormVersionId).get();
  if (!formSnap.exists) {
    notFound();
  }
  const formVersion = formSnap.data() as any;

  const blueprintSnap = await db.collection(COLLECTIONS.examBlueprints).doc(attempt.blueprintId).get();
  if (!blueprintSnap.exists) {
    notFound();
  }
  const blueprint = examBlueprintSchema.parse(blueprintSnap.data());

  // 3. Fetch all section answers
  const sectionsAnswers: Record<string, any> = {};
  const activeSectionIds = (formVersion.publicSectionSnapshots || []).map((s: any) => s.id);
  
  for (const secId of activeSectionIds) {
    const secSnap = await db
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .collection(USER_SUBCOLLECTIONS.attempts)
      .doc(attemptId)
      .collection(USER_SUBCOLLECTIONS.sections)
      .doc(secId)
      .get();
    if (secSnap.exists) {
      const secData = attemptSectionSchema.parse(secSnap.data());
      Object.assign(sectionsAnswers, secData.answers);
    }
  }

  // 4. Fetch Question Versions
  const questionVersions: Record<string, any> = {};
  if (attempt.questionVersionIds && attempt.questionVersionIds.length > 0) {
    const qvPromises = attempt.questionVersionIds.map(async (qvid: string) => {
      const snap = await db.collection(COLLECTIONS.questionVersions).doc(qvid).get();
      if (snap.exists) {
        questionVersions[qvid] = questionVersionSchema.parse(snap.data());
      }
    });
    await Promise.all(qvPromises);
  }

  const durationMins = Math.round(blueprint.durationSeconds / 60);
  const formattedSubmitDate = attempt.submittedAt
    ? new Timestamp(attempt.submittedAt.seconds, attempt.submittedAt.nanoseconds)
        .toDate()
        .toLocaleString("vi-VN")
    : "Chưa nộp";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      {/* Back to list link */}
      <Link
        href="/exams"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Quay về trang Exam Center</span>
      </Link>

      {/* Hero Result Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Circle Score Card */}
        <Card className="md:col-span-1 border-2 border-primary/5 bg-gradient-to-br from-emerald-50/20 to-teal-50/20 shadow-md flex flex-col justify-center items-center p-6 text-center">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Kết quả bài thi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center">
            {/* Radial score marker */}
            <div className="relative size-36 rounded-full border-8 border-emerald-500/20 flex flex-col items-center justify-center bg-white shadow-inner mb-4">
              <span className="text-4xl font-extrabold text-emerald-600">
                {attempt.totalRawScore ?? 0}
              </span>
              <span className="text-xs text-muted-foreground font-semibold mt-0.5">
                đúng {Math.round(attempt.totalPercent ?? 0)}%
              </span>
            </div>
            <p className="text-base font-bold text-foreground">{blueprint.title}</p>
            <p className="text-xs text-muted-foreground mt-1">Nộp lúc: {formattedSubmitDate}</p>
          </CardContent>
        </Card>

        {/* Detailed Stats Cards */}
        <Card className="md:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <span>Phân tích kết quả theo kỹ năng</span>
            </CardTitle>
            <CardDescription>
              Đánh giá điểm số của bạn cho các nhóm kỹ năng khác nhau trong bài kiểm tra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {attempt.skillScores &&
              Object.values(attempt.skillScores).map((score: any) => {
                const percent = Math.round(score.percent);
                return (
                  <div key={score.skill} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-foreground capitalize">{score.skill}</span>
                      <span className="text-muted-foreground">
                        {score.rawScore} / {score.maxScore} điểm ({percent}%)
                      </span>
                    </div>
                    {/* Progress container */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {/* General metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span>Thời gian quy định: <strong>{durationMins} phút</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="size-4 text-muted-foreground" />
                <span>Trạng thái bài thi: <strong className="text-emerald-600 capitalize">{attempt.state}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Questions review breakdown */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" />
          <span>Chi tiết đáp án & Giải thích</span>
        </h2>

        {formVersion.publicSectionSnapshots?.map((sec: any) => {
          return (
            <div key={sec.id} className="space-y-4">
              <h3 className="text-lg font-bold border-b pb-2 text-foreground">
                {sec.title}
              </h3>
              <div className="space-y-6">
                {sec.questions.map((q: any, idx: number) => {
                  const qv = questionVersions[q.id];
                  const userAns = sectionsAnswers[q.id];
                  const isCorrect = qv ? scoreQuestion(qv.interactionType, userAns, qv.scoringDefinition) === 1 : false;

                  return (
                    <Card
                      key={q.id}
                      className={`border-2 transition-all ${
                        isCorrect ? "border-emerald-100/80 bg-emerald-50/10" : "border-rose-100 bg-rose-50/10"
                      }`}
                    >
                      <CardHeader className="flex flex-row justify-between items-start pb-2 border-b/50">
                        <div className="space-y-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Câu hỏi {idx + 1}
                          </span>
                          <CardTitle className="text-base font-bold text-foreground">
                            {q.promptBlocks?.find((p: any) => p.type === "text")?.content}
                          </CardTitle>
                        </div>
                        {/* Status badge */}
                        <div
                          className={`size-8 rounded-full flex items-center justify-center text-white ${
                            isCorrect ? "bg-emerald-500 shadow-sm" : "bg-rose-500 shadow-sm"
                          }`}
                        >
                          {isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {/* Option choices highlighting */}
                        {q.interactionType === "single_choice" && (
                          <div className="space-y-2">
                            {q.options?.map((opt: any) => {
                              const isSelected = userAns?.selectedOptionId === opt.id;
                              const isCorrectOption = qv?.scoringDefinition?.correctOptionId === opt.id;

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
                                    isCorrectOption
                                      ? "border-emerald-300 bg-emerald-100/50 text-emerald-900 font-semibold"
                                      : isSelected
                                      ? "border-rose-300 bg-rose-100/50 text-rose-900"
                                      : "bg-card text-foreground"
                                  }`}
                                >
                                  <span>{opt.text}</span>
                                  {isCorrectOption && (
                                    <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">
                                      Đáp án đúng
                                    </span>
                                  )}
                                  {isSelected && !isCorrectOption && (
                                    <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">
                                      Lựa chọn của bạn
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.interactionType === "gap_fill" && (
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground font-semibold">
                              Câu trả lời của bạn:{" "}
                              <span className={`font-bold ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                                &ldquo;{userAns?.answers?.[0] || "(Không trả lời)"}&rdquo;
                              </span>
                            </p>
                            {!isCorrect && (
                              <p className="text-emerald-700 font-semibold">
                                Đáp án chính xác:{" "}
                                <span className="font-bold">
                                  &ldquo;{qv?.scoringDefinition?.correctAnswers?.[0]}&rdquo;
                                </span>
                              </p>
                            )}
                          </div>
                        )}

                        {q.interactionType === "reorder_tokens" && (
                          <div className="space-y-2 text-sm">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-muted-foreground font-semibold">Thứ tự của bạn:</span>
                              {userAns?.selectedTokenIds?.map((tokenId: string) => {
                                const opt = q.options?.find((o: any) => o.id === tokenId);
                                return (
                                  <span key={tokenId} className="px-2 py-1 rounded bg-slate-100 border text-xs font-semibold text-slate-700">
                                    {opt?.text}
                                  </span>
                                )
                              })}
                              {(!userAns?.selectedTokenIds || userAns.selectedTokenIds.length === 0) && (
                                <span className="italic text-rose-500">(Không trả lời)</span>
                              )}
                            </div>

                            {!isCorrect && (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-emerald-700 font-semibold">Đáp án đúng:</span>
                                {qv?.scoringDefinition?.correctTokenIds?.map((tokenId: string) => {
                                  const opt = q.options?.find((o: any) => o.id === tokenId);
                                  return (
                                    <span key={tokenId} className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                                      {opt?.text}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Explanation block */}
                        {qv?.explanation && (
                          <div className="p-3 bg-muted/30 border border-dashed rounded-lg text-xs md:text-sm text-muted-foreground space-y-1">
                            <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                              Giải thích:
                            </p>
                            <p>{qv.explanation}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
