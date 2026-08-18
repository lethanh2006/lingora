import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Award, ShieldAlert, BookOpen } from "lucide-react";

import { getAdminDb } from "@/lib/firebase/admin";
import { createAssessmentRepository } from "@/features/assessment/assessment.repository.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StartExamButton } from "./start-button.tsx";

interface ExamDetailPageProps {
  params: Promise<{ blueprintId: string }>;
}

export default async function ExamDetailPage({ params }: ExamDetailPageProps) {
  const { blueprintId } = await params;
  const db = getAdminDb();
  const assessmentRepository = createAssessmentRepository(db);

  let blueprint;
  try {
    blueprint = await assessmentRepository.getPublishedBlueprint(blueprintId);
  } catch (error) {
    console.error("Invalid blueprint schema in DB", error);
    notFound();
  }
  if (!blueprint) notFound();

  const durationMins = Math.round(blueprint.durationSeconds / 60);

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Back to list */}
      <Link
        href="/exams"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Quay lại danh sách bài thi</span>
      </Link>

      {/* Main card */}
      <Card className="shadow-lg border-2 border-primary/5">
        <CardHeader className="bg-muted/10 border-b pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
              Cấp độ {blueprint.levelId.toUpperCase()}
            </span>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-extrabold text-foreground">
            {blueprint.title}
          </CardTitle>
          <CardDescription className="text-base">
            Vui lòng đọc kỹ hướng dẫn trước khi bấm bắt đầu làm bài.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Stats overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border">
              <Clock className="size-6 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold">THỜI GIAN LÀM BÀI</p>
                <p className="text-lg font-bold text-foreground">{durationMins} phút</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border">
              <Award className="size-6 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground font-semibold">TỔNG ĐIỂM THI</p>
                <p className="text-lg font-bold text-foreground">
                  {blueprint.sections.reduce(
                    (sum, sec) => sum + sec.slots.reduce((sSum, slot) => sSum + slot.points, 0),
                    0
                  )}{" "}
                  điểm
                </p>
              </div>
            </div>
          </div>

          {/* Exam Structure */}
          <div className="space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
              <BookOpen className="size-5 text-primary" />
              <span>Cấu trúc bài thi</span>
            </h3>
            <div className="space-y-2">
              {blueprint.sections.map((sec, idx) => {
                const secDurationMins = Math.round(sec.durationSeconds / 60);
                const secPoints = sec.slots.reduce((sum, s) => sum + s.points, 0);
                const secQuestions = sec.slots.reduce((sum, s) => sum + s.questionCount, 0);

                return (
                  <div
                    key={sec.id}
                    className="flex justify-between items-center p-3 rounded-lg border bg-card text-sm"
                  >
                    <div>
                      <span className="font-semibold text-foreground">
                        Phần {idx + 1}: {sec.title}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {secQuestions} câu hỏi • Gợi ý làm bài: {secDurationMins} phút
                      </p>
                    </div>
                    <span className="font-bold text-emerald-600">+{secPoints} điểm</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions and policy */}
          <div className="space-y-3 p-4 rounded-xl bg-rose-50/30 border border-rose-100">
            <h3 className="text-sm font-bold flex items-center gap-2 text-rose-800">
              <ShieldAlert className="size-5" />
              <span>Quy chế và lưu ý quan trọng</span>
            </h3>
            <ul className="list-disc pl-5 text-sm space-y-2 text-rose-700">
              <li>
                <strong>Đếm ngược liên tục:</strong> Khi đã bấm bắt đầu, thời gian thi sẽ được tính trực tiếp trên máy chủ. Kể cả khi bạn đóng trình duyệt hoặc mất kết nối, đồng hồ vẫn tiếp tục chạy.
              </li>
              <li>
                <strong>Không gian thi bảo mật:</strong> Không mở tab khác hoặc tìm kiếm đáp án. Hệ thống ghi nhận mọi lượt tự động lưu đáp án.
              </li>
              <li>
                <strong>Tự động nộp bài:</strong> Khi hết giờ thi, hệ thống sẽ tự động khoá bài làm và tính điểm dựa trên những câu trả lời đã được lưu trên máy chủ.
              </li>
            </ul>
          </div>

          {/* Start Button Wrapper */}
          <div className="pt-4 border-t">
            <StartExamButton blueprintId={blueprint.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
