"use client";

import React, { useState } from "react";
import { Loader2, Check, Globe, BookOpen, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type EnrollmentPrefsFormProps = {
  programId: string;
  currentGoalType: string | null;
  currentLevelId: string | null;
  currentDailyMinutes: number;
};

const GOALS = [
  { id: "communication", label: "Giao tiếp hàng ngày", icon: Globe },
  { id: "foundation", label: "Học nền tảng", icon: BookOpen },
  { id: "exam_prep", label: "Luyện thi chứng chỉ", icon: Award },
];

const LEVELS = [
  { id: "a1", label: "A1 – Mới bắt đầu" },
  { id: "a2", label: "A2 – Sơ cấp" },
  { id: "b1", label: "B1 – Trung cấp" },
  { id: "b2", label: "B2 – Trên trung cấp" },
  { id: "c1", label: "C1 – Nâng cao" },
];

const DAILY_OPTIONS = [5, 10, 15, 30, 60];

export function EnrollmentPrefsForm({
  programId,
  currentGoalType,
  currentLevelId,
  currentDailyMinutes,
}: EnrollmentPrefsFormProps) {
  const [goalType, setGoalType] = useState(currentGoalType || "");
  const [levelId, setLevelId] = useState(currentLevelId || "");
  const [dailyMinutes, setDailyMinutes] = useState(currentDailyMinutes);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch(`/api/enrollments/${programId}/prefs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType: goalType || undefined,
          targetLevelId: levelId || undefined,
          dailyGoalMinutes: dailyMinutes,
        }),
      });

      if (!res.ok) {
        throw new Error("Không thể cập nhật cài đặt.");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Goal */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">Mục tiêu học tập</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {GOALS.map((g) => {
            const isSelected = goalType === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGoalType(g.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                <g.icon className="size-4 shrink-0" />
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Level */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground">Trình độ hiện tại</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LEVELS.map((l) => {
            const isSelected = levelId === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLevelId(l.id)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                {l.label}
                {isSelected && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Goal */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="size-4" />
          Mục tiêu học hàng ngày
        </label>
        <div className="flex flex-wrap gap-2">
          {DAILY_OPTIONS.map((mins) => {
            const isSelected = dailyMinutes === mins;
            return (
              <button
                key={mins}
                onClick={() => setDailyMinutes(mins)}
                className={`h-9 px-4 rounded-lg border-2 text-sm font-bold transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {mins} phút
              </button>
            );
          })}
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg flex items-center gap-2">
          <Check className="size-4" /> Đã lưu cài đặt thành công!
        </p>
      )}

      <Button onClick={handleSave} disabled={loading} className="h-10 font-semibold">
        {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Đang lưu...</> : "Lưu thay đổi"}
      </Button>
    </div>
  );
}
