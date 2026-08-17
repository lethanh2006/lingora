"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Target,
  BarChart2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Globe,
  Award,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Program = {
  id: string;
  title: string;
  description: string;
  languageId: string;
};

type OnboardingWizardProps = {
  programs: Program[];
};

const GOALS = [
  {
    id: "communication",
    label: "Giao tiếp hàng ngày",
    description: "Tự tin nói chuyện với người bản ngữ trong các tình huống thực tế",
    icon: Globe,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    selectedBg: "bg-blue-600",
  },
  {
    id: "foundation",
    label: "Học nền tảng",
    description: "Nắm vững ngữ pháp, từ vựng và cấu trúc câu từ cơ bản",
    icon: BookOpen,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    selectedBg: "bg-emerald-600",
  },
  {
    id: "exam_prep",
    label: "Luyện thi chứng chỉ",
    description: "Chuẩn bị cho các kỳ thi IELTS, JLPT, HSK hoặc tương đương",
    icon: Award,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    selectedBg: "bg-violet-600",
  },
];

const LEVELS = [
  { id: "a1", label: "A1 – Mới bắt đầu", desc: "Chưa biết gì hoặc chỉ biết vài từ cơ bản" },
  { id: "a2", label: "A2 – Sơ cấp", desc: "Hiểu các câu đơn giản và giao tiếp cơ bản" },
  { id: "b1", label: "B1 – Trung cấp", desc: "Giao tiếp được trong nhiều tình huống thông thường" },
  { id: "b2", label: "B2 – Trên trung cấp", desc: "Hiểu và diễn đạt ý kiến phức tạp" },
  { id: "c1", label: "C1 – Nâng cao", desc: "Thành thạo, diễn đạt tự nhiên và linh hoạt" },
];

const DAILY_GOALS = [
  { minutes: 5, label: "5 phút", desc: "Học thư giãn", icon: "🌱" },
  { minutes: 10, label: "10 phút", desc: "Tiến bộ đều", icon: "📚" },
  { minutes: 15, label: "15 phút", desc: "Khuyến nghị", icon: "⭐", recommended: true },
  { minutes: 30, label: "30 phút", desc: "Học chuyên sâu", icon: "🔥" },
  { minutes: 60, label: "60 phút", desc: "Học chuyên nghiệp", icon: "🚀" },
];

const LANG_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  ja: "🇯🇵",
  zh: "🇨🇳",
};

const LANG_LABELS: Record<string, string> = {
  en: "Tiếng Anh",
  ja: "Tiếng Nhật",
  zh: "Tiếng Trung",
};

type Step = "language" | "goal" | "level" | "daily" | "done";

export function OnboardingWizard({ programs }: OnboardingWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("language");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedDailyMinutes, setSelectedDailyMinutes] = useState<number>(15);
  const [error, setError] = useState<string | null>(null);

  const steps: Step[] = ["language", "goal", "level", "daily", "done"];
  const currentStepIdx = steps.indexOf(step);
  const progress = ((currentStepIdx) / (steps.length - 1)) * 100;

  const handleEnrollAndFinish = async () => {
    if (!selectedProgramId) return;
    setError(null);

    startTransition(async () => {
      try {
        // 1. Enroll
        const enrollRes = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId: selectedProgramId }),
        });

        if (!enrollRes.ok && enrollRes.status !== 200) {
          const data = await enrollRes.json();
          throw new Error(data.message || "Không thể đăng ký chương trình");
        }

        // 2. Update preferences
        const prefsRes = await fetch(`/api/enrollments/${selectedProgramId}/prefs`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalType: selectedGoal,
            targetLevelId: selectedLevel,
            dailyGoalMinutes: selectedDailyMinutes,
          }),
        });

        if (!prefsRes.ok) {
          // Non-fatal — preferences can be updated later in settings
          console.warn("Failed to update enrollment preferences, non-fatal");
        }

        setStep("done");
      } catch (err: any) {
        setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    });
  };

  // ── Step: Language ────────────────────────────────────────────────────────
  if (step === "language") {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Bạn muốn học ngôn ngữ nào?
          </h1>
          <p className="text-muted-foreground">
            Chọn một ngôn ngữ để bắt đầu hành trình của bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {programs.map((program) => {
            const flag = LANG_FLAGS[program.languageId] || "🌐";
            const langLabel = LANG_LABELS[program.languageId] || program.title;
            const isSelected = selectedProgramId === program.id;

            return (
              <button
                key={program.id}
                onClick={() => setSelectedProgramId(program.id)}
                className={`p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="text-5xl mb-4">{flag}</div>
                <h3 className="font-bold text-lg text-foreground">{langLabel}</h3>
                <p className="text-sm text-muted-foreground mt-1">{program.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button
            disabled={!selectedProgramId}
            onClick={() => setStep("goal")}
            className="h-11 px-8 font-bold"
          >
            Tiếp tục <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Goal ────────────────────────────────────────────────────────────
  if (step === "goal") {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Mục tiêu học tập của bạn là gì?
          </h1>
          <p className="text-muted-foreground">
            Lingora sẽ đề xuất lộ trình phù hợp với từng mục tiêu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {GOALS.map((goal) => {
            const isSelected = selectedGoal === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : goal.bg + " " + goal.color}`}>
                  <goal.icon className="size-6" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {goal.label}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{goal.description}</p>
                </div>
                {isSelected && <CheckCircle2 className="size-5 text-primary ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep("language")}>
            <ArrowLeft className="size-4 mr-2" /> Quay lại
          </Button>
          <Button
            disabled={!selectedGoal}
            onClick={() => setStep("level")}
            className="h-11 px-8 font-bold"
          >
            Tiếp tục <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Level ───────────────────────────────────────────────────────────
  if (step === "level") {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Trình độ hiện tại của bạn?
          </h1>
          <p className="text-muted-foreground">
            Không sao nếu bạn chưa chắc chắn — bạn có thể thay đổi sau.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {LEVELS.map((level) => {
            const isSelected = selectedLevel === level.id;
            return (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div>
                  <h3 className={`font-bold text-base ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {level.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">{level.desc}</p>
                </div>
                {isSelected && <CheckCircle2 className="size-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep("goal")}>
            <ArrowLeft className="size-4 mr-2" /> Quay lại
          </Button>
          <Button
            disabled={!selectedLevel}
            onClick={() => setStep("daily")}
            className="h-11 px-8 font-bold"
          >
            Tiếp tục <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Daily Goal ──────────────────────────────────────────────────────
  if (step === "daily") {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Bạn muốn học bao nhiêu phút mỗi ngày?
          </h1>
          <p className="text-muted-foreground">
            Học đều đặn mỗi ngày hiệu quả hơn học dồn một lần. Hãy đặt mục tiêu thực tế!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {DAILY_GOALS.map((goal) => {
            const isSelected = selectedDailyMinutes === goal.minutes;
            return (
              <button
                key={goal.minutes}
                onClick={() => setSelectedDailyMinutes(goal.minutes)}
                className={`flex flex-col items-center p-4 rounded-2xl border-2 text-center transition-all relative ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {goal.recommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-extrabold bg-primary text-primary-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                    GỢI Ý
                  </span>
                )}
                <span className="text-2xl mb-1">{goal.icon}</span>
                <span className={`font-extrabold text-lg ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {goal.label}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">{goal.desc}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep("level")}>
            <ArrowLeft className="size-4 mr-2" /> Quay lại
          </Button>
          <Button
            onClick={handleEnrollAndFinish}
            disabled={isPending}
            className="h-11 px-8 font-bold bg-primary"
          >
            {isPending ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Đang thiết lập...</>
            ) : (
              <><Zap className="size-4 mr-2" /> Bắt đầu học ngay!</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Done ────────────────────────────────────────────────────────────
  if (step === "done") {
    const prog = programs.find((p) => p.id === selectedProgramId);
    const goal = GOALS.find((g) => g.id === selectedGoal);
    const level = LEVELS.find((l) => l.id === selectedLevel);

    return (
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-10 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Sẵn sàng rồi! Chào mừng đến Lingora 🎉
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Hành trình học {LANG_LABELS[prog?.languageId || ""] || prog?.title} của bạn bắt đầu từ hôm nay.
          </p>
        </div>

        {/* Summary card */}
        <Card className="max-w-md mx-auto text-left border-primary/10">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
              Lộ trình học của bạn
            </h3>
            <div className="space-y-2">
              {[
                { label: "Ngôn ngữ", value: LANG_LABELS[prog?.languageId || ""] || prog?.title, icon: "🌐" },
                { label: "Mục tiêu", value: goal?.label, icon: "🎯" },
                { label: "Trình độ", value: level?.label, icon: "📊" },
                { label: "Mục tiêu hàng ngày", value: `${selectedDailyMinutes} phút/ngày`, icon: "⏱️" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span>{item.icon}</span>{item.label}
                  </span>
                  <span className="font-semibold text-foreground">{item.value || "-"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          className="h-12 px-10 font-bold text-base"
          onClick={() => router.push("/dashboard")}
        >
          Bắt đầu học bài đầu tiên <ArrowRight className="size-5 ml-2" />
        </Button>
      </div>
    );
  }

  return null;
}
