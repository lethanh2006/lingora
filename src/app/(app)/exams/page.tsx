import React from "react";
import Link from "next/link";
import { Timestamp } from "firebase-admin/firestore";
import { ArrowRight, BookOpen, Clock, FileText, CheckCircle2, AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "@/lib/firebase/collections.ts";
import { seedMockExamData } from "@/features/assessment/seed-mock.ts";
import { attemptSchema } from "@/features/assessment/schemas/assessment.schema.ts";

export default async function ExamsPage() {
  const user = await requireUser();
  const db = getAdminDb();

  // Make sure we have mock exam data seeded
  await seedMockExamData(db);

  // 1. Fetch published blueprints
  const blueprintsSnap = await db
    .collection(COLLECTIONS.examBlueprints)
    .where("status", "==", "published")
    .get();

  const blueprints = blueprintsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // 2. Fetch user's previous/active exam attempts
  const attemptsSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection(USER_SUBCOLLECTIONS.attempts)
    .orderBy("createdAt", "desc")
    .get();

  const attempts = attemptsSnap.docs.map((doc) => {
    try {
      return attemptSchema.parse(doc.data());
    } catch (err) {
      return null;
    }
  }).filter(Boolean) as any[];

  // Separate active (in_progress) from completed attempts
  const activeAttempts = attempts.filter((a) => a.state === "in_progress");
  const pastAttempts = attempts.filter((a) => a.state !== "in_progress");

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-8 md:p-12 shadow-md">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/4">
          <BookOpen className="size-96" />
        </div>
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Lingora Exam Center
          </h1>
          <p className="text-emerald-50 text-base md:text-lg">
            Đánh giá năng lực ngoại ngữ của bạn với các bài thi mô phỏng chuẩn CEFR. Kết quả sẽ được lưu trữ trong hồ sơ cá nhân.
          </p>
        </div>
      </div>

      {/* Active Attempts */}
      {activeAttempts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-amber-600">
            <AlertCircle className="size-5" />
            <span>Bài thi đang diễn ra</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAttempts.map((attempt) => {
              const blueprint = blueprints.find((b) => b.id === attempt.blueprintId);
              return (
                <Card key={attempt.id} className="border-amber-200 bg-amber-50/20 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold">
                      {blueprint?.title || "Bài thi vô danh"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 text-amber-700">
                      <Clock className="size-4 animate-pulse" />
                      <span>Bài thi đang được thực hiện, hãy bấm nút dưới để tiếp tục.</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex justify-end">
                    <Link
                      href={`/attempts/${attempt.id}`}
                      className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-sm font-semibold transition-all shadow-sm gap-2"
                    >
                      <span>Tiếp tục làm bài</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Blueprints Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Các bài thi có sẵn
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blueprints.map((blueprint) => {
            const sectionsCount = blueprint.sections?.length || 0;
            const durationMins = Math.round(blueprint.durationSeconds / 60);

            return (
              <Card key={blueprint.id} className="flex flex-col justify-between hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 uppercase">
                      {blueprint.levelId}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      CEFR
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                    {blueprint.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    Bài thi đánh giá cấp độ {blueprint.levelId.toUpperCase()} chính thức của Lingora.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground border-y py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-4" />
                      <span>{durationMins} phút</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-4" />
                      <span>{sectionsCount} phần thi</span>
                    </div>
                  </div>
                  <Link
                    href={`/exams/${blueprint.id}`}
                    className="flex w-full items-center justify-center h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-all gap-2"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Past Attempts */}
      {pastAttempts.length > 0 && (
        <div className="space-y-4 border-t pt-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Lịch sử thi của bạn
          </h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="min-w-full divide-y divide-border">
              {pastAttempts.map((attempt) => {
                const blueprint = blueprints.find((b) => b.id === attempt.blueprintId);
                const dateStr = attempt.submittedAt
                  ? new Timestamp(attempt.submittedAt.seconds, attempt.submittedAt.nanoseconds)
                      .toDate()
                      .toLocaleDateString("vi-VN")
                  : "Chưa hoàn thành";

                return (
                  <div key={attempt.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">
                        {blueprint?.title || "Bài thi vô danh"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Ngày làm: {dateStr} • Trạng thái:{" "}
                        <span className={`font-semibold ${attempt.state === "graded" ? "text-emerald-600" : "text-rose-600"}`}>
                          {attempt.state === "graded" ? "Đã chấm điểm" : "Hết giờ / Bỏ dở"}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      {attempt.totalRawScore !== null && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-600">
                            {attempt.totalRawScore} điểm
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Tỉ lệ đúng: {Math.round(attempt.totalPercent || 0)}%
                          </div>
                        </div>
                      )}
                      <Link
                        href={`/results/${attempt.id}`}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-input hover:bg-muted text-sm font-semibold transition-all gap-1.5"
                      >
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span>Xem kết quả</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
