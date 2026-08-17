"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  Flag,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ChevronRight,
  BookOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Types matching assessment.schema
type QuestionSnapshot = {
  id: string;
  questionId: string;
  interactionType: "single_choice" | "gap_fill" | "reorder_tokens";
  promptBlocks: Array<{ type: string; content: string }>;
  options: Array<{ id: string; text: string }>;
};

type SectionSnapshot = {
  id: string;
  title: string;
  order: number;
  durationSeconds: number;
  questions: QuestionSnapshot[];
};

type Attempt = {
  id: string;
  uid: string;
  blueprintId: string;
  examFormVersionId: string;
  state: "in_progress" | "submitted" | "expired" | "graded";
  expiresAt: { seconds: number; nanoseconds: number };
  startedAt: { seconds: number; nanoseconds: number };
};

export default function AttemptTakingPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [sections, setSections] = useState<SectionSnapshot[]>([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);

  // Answer store: sectionId -> questionId -> answer structure
  // e.g. { "section-reading": { "qv-reading-1": { selectedOptionId: "opt-1" } } }
  const [answers, setAnswers] = useState<Record<string, Record<string, any>>>({});
  
  // Flagged questions: Record<questionId, boolean>
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // Version revision tracking to prevent stale overwrites
  const [revisions, setRevisions] = useState<Record<string, number>>({});

  // Time management
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  // Keep ref to answers for autosaving
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const revisionsRef = useRef(revisions);
  revisionsRef.current = revisions;

  // 1. Fetch initial attempt state
  useEffect(() => {
    async function fetchAttempt() {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`);
        if (!res.ok) {
          throw new Error("Failed to load attempt");
        }
        const data = await res.json();
        
        const attemptData = data.attempt as Attempt;
        if (attemptData.state !== "in_progress") {
          // If already completed or expired, redirect to results
          router.push(`/results/${attemptId}`);
          return;
        }

        setAttempt(attemptData);
        setSections(data.formVersion.publicSectionSnapshots || []);

        // Load section responses if there are any
        const initialAnswers: Record<string, Record<string, any>> = {};
        const initialRevisions: Record<string, number> = {};

        // Fetch section state from attempt document or subcollections
        // (For simplicity of this técnico slice, we fetch the active user sections from API/DB if existing)
        const activeSectionIds = (data.formVersion.publicSectionSnapshots || []).map(
          (s: SectionSnapshot) => s.id
        );

        for (const secId of activeSectionIds) {
          initialAnswers[secId] = {};
          initialRevisions[secId] = 0;
        }

        setAnswers(initialAnswers);
        setRevisions(initialRevisions);
        setLoading(false);
      } catch (err) {
        console.error(err);
        router.push("/exams");
      }
    }

    fetchAttempt();
  }, [attemptId, router]);

  // 2. Timer Loop
  useEffect(() => {
    if (!attempt) return;

    function calculateTime() {
      if (!attempt) return;
      const expiresAtMs = attempt.expiresAt.seconds * 1000 + Math.floor(attempt.expiresAt.nanoseconds / 1000000);
      const diff = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setTimeLeftSeconds(diff);

      if (diff <= 0) {
        // Auto submit
        handleAutoSubmit();
      }
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  // 3. Debounced Autosave on Answers Change
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = (sectionId: string) => {
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const secAnswers = answersRef.current[sectionId] || {};
        const currentRev = revisionsRef.current[sectionId] || 0;

        const res = await fetch(`/api/attempts/${attemptId}/sections/${sectionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: secAnswers,
            clientRevision: currentRev,
          }),
        });

        if (res.status === 409) {
          // Stale version warning
          setSaveStatus("error");
          console.warn("Revision conflict while saving section answers");
          return;
        }

        if (!res.ok) {
          throw new Error("Save error");
        }

        const data = await res.json();
        // Update server revision
        setRevisions((prev) => ({
          ...prev,
          [sectionId]: data.section.serverRevision,
        }));
        setSaveStatus("saved");
      } catch (err) {
        console.error("Autosave failed", err);
        setSaveStatus("error");
      }
    }, 2000); // 2 second debounce
  };

  const handleAutoSubmit = async () => {
    // Clear autosave
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    // Call submit
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      if (res.ok) {
        router.push(`/results/${attemptId}`);
      }
    } catch (err) {
      console.error(err);
      router.push(`/results/${attemptId}`);
    }
  };

  const handleManualSubmit = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn nộp bài thi ngay bây giờ không?")) {
      return;
    }

    setLoading(true);
    // Submit any pending changes first
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save final changes of current section
    const currentSection = sections[currentSectionIdx];
    if (currentSection) {
      try {
        await fetch(`/api/attempts/${attemptId}/sections/${currentSection.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: answers[currentSection.id] || {},
            clientRevision: revisions[currentSection.id] || 0,
          }),
        });
      } catch (e) {
        console.error("Final section save failed, continuing to submit...", e);
      }
    }

    await handleAutoSubmit();
  };

  // Formatter for timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Đang chuẩn bị phòng thi...</p>
      </div>
    );
  }

  const currentSection = sections[currentSectionIdx];
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  // Update response helper
  const updateAnswer = (questionId: string, val: any) => {
    setAnswers((prev) => {
      const sectionId = currentSection.id;
      const updated = {
        ...prev,
        [sectionId]: {
          ...(prev[sectionId] || {}),
          [questionId]: val,
        },
      };
      return updated;
    });
    triggerAutosave(currentSection.id);
  };

  // Toggle flagging helper
  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Sticky Header Control */}
      <header className="sticky top-0 z-40 flex items-center justify-between p-4 bg-card border-2 border-border/80 shadow-md rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary hidden md:block">
            <BookOpen className="size-6" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-foreground line-clamp-1">
              English A1 CEFR Mock Exam
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {saveStatus === "saving" && "Đang tự động lưu..."}
              {saveStatus === "saved" && "Đã lưu tất cả bài làm"}
              {saveStatus === "error" && "Lỗi tự động lưu!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer Display */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold shadow-inner ${
              timeLeftSeconds !== null && timeLeftSeconds < 120
                ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse"
                : "bg-slate-50 text-foreground"
            }`}
          >
            <Clock className="size-4" />
            <span>{timeLeftSeconds !== null ? formatTime(timeLeftSeconds) : "--:--"}</span>
          </div>

          <Button
            onClick={handleManualSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs sm:text-sm"
          >
            <Send className="size-4 mr-1.5" />
            Nộp bài
          </Button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Sections List */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Phần thi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {sections.map((sec, idx) => {
                const isActive = idx === currentSectionIdx;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setCurrentSectionIdx(idx)}
                    className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span>{sec.title}</span>
                    <ChevronRight className="size-4 opacity-60" />
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Questions Grid Navigator */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Câu hỏi trong phần
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex flex-wrap gap-2">
                {currentSection.questions.map((q, idx) => {
                  const secAnswers = answers[currentSection.id] || {};
                  const isAnswered = !!secAnswers[q.id];
                  const isFlagged = flaggedQuestions[q.id];

                  return (
                    <a
                      key={q.id}
                      href={`#q-${q.id}`}
                      className={`size-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all border relative ${
                        isFlagged
                          ? "bg-amber-100 border-amber-300 text-amber-800"
                          : isAnswered
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                          : "bg-card text-foreground"
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 border border-white" />
                      )}
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Center Column: Questions Sheet */}
        <main className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <span>{currentSection.title}</span>
            </h2>
            <div className="text-xs text-muted-foreground font-semibold bg-slate-100 px-3 py-1 rounded-full">
              {currentSection.questions.length} câu hỏi
            </div>
          </div>

          {currentSection.questions.map((question, qIdx) => {
            const secAnswers = answers[currentSection.id] || {};
            const userAns = secAnswers[question.id];
            const isFlagged = flaggedQuestions[question.id];

            return (
              <Card
                key={question.id}
                id={`q-${question.id}`}
                className="scroll-mt-24 border-2 border-primary/5 hover:border-primary/10 transition-all duration-300 shadow-md"
              >
                <CardHeader className="flex flex-row items-start justify-between pb-3 bg-slate-50/50 border-b">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                      Câu hỏi {qIdx + 1}
                    </span>
                    <CardTitle className="text-base font-bold text-foreground">
                      {question.promptBlocks.find((p) => p.type === "text")?.content}
                    </CardTitle>
                  </div>

                  {/* Flag button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFlag(question.id)}
                    className={`rounded-xl transition-all ${
                      isFlagged
                        ? "text-amber-500 hover:text-amber-600 bg-amber-50 hover:bg-amber-100"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Bookmark className={`size-4 ${isFlagged ? "fill-amber-500" : ""}`} />
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Dynamic Question Types Renderers */}
                  {question.interactionType === "single_choice" && (
                    <div className="space-y-3">
                      {question.options.map((opt) => {
                        const isSelected = userAns?.selectedOptionId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => updateAnswer(question.id, { selectedOptionId: opt.id })}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                              isSelected
                                ? "border-primary bg-primary/5 text-primary-foreground font-semibold"
                                : "border-border bg-card hover:bg-muted/50"
                            }`}
                          >
                            <div
                              className={`size-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                              }`}
                            >
                              {isSelected && <span className="size-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm text-foreground">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {question.interactionType === "gap_fill" && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground font-medium mb-2">Điền từ thích hợp vào ô trống:</p>
                      <input
                        type="text"
                        value={userAns?.answers?.[0] || ""}
                        onChange={(e) => updateAnswer(question.id, { answers: [e.target.value] })}
                        placeholder="Nhập câu trả lời của bạn..."
                        className="w-full max-w-md h-10 px-4 rounded-xl border border-input focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  )}

                  {question.interactionType === "reorder_tokens" && (
                    <div className="space-y-6">
                      {/* Sub-helper inside client: Click to Order tokens */}
                      {(() => {
                        const userTokens = userAns?.selectedTokenIds || [];
                        // Get options not yet chosen
                        const unusedOptions = question.options.filter(
                          (opt) => !userTokens.includes(opt.id)
                        );

                        const addToken = (id: string) => {
                          const next = [...userTokens, id];
                          updateAnswer(question.id, { selectedTokenIds: next });
                        };

                        const removeToken = (id: string) => {
                          const next = userTokens.filter((token: string) => token !== id);
                          updateAnswer(question.id, { selectedTokenIds: next });
                        };

                        return (
                          <div className="space-y-4">
                            {/* Your Ordered result */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Thứ tự của bạn:
                              </p>
                              <div className="flex flex-wrap gap-2 min-h-12 p-3 border-2 border-dashed rounded-xl bg-slate-50/50">
                                {userTokens.map((tokenId: string) => {
                                  const opt = question.options.find((o) => o.id === tokenId);
                                  return (
                                    <button
                                      key={tokenId}
                                      onClick={() => removeToken(tokenId)}
                                      className="h-9 px-3 rounded-lg bg-primary text-primary-foreground font-semibold shadow-sm text-sm hover:bg-primary/95 transition-all active:scale-95"
                                    >
                                      {opt?.text}
                                    </button>
                                  );
                                })}
                                {userTokens.length === 0 && (
                                  <span className="text-xs text-muted-foreground italic flex items-center">
                                    Bấm các từ bên dưới để xếp câu
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Candidate tokens */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Từ có sẵn:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {unusedOptions.map((opt) => (
                                  <button
                                    key={opt.id}
                                    onClick={() => addToken(opt.id)}
                                    className="h-9 px-3 rounded-lg border bg-card hover:bg-muted font-semibold text-sm shadow-sm transition-all active:scale-95 text-foreground"
                                  >
                                    {opt.text}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Next/Prev Section navigation controls */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              disabled={currentSectionIdx === 0}
              onClick={() => setCurrentSectionIdx((idx) => idx - 1)}
              className="rounded-xl"
            >
              <ArrowLeft className="size-4 mr-2" />
              <span>Phần trước</span>
            </Button>

            {currentSectionIdx < sections.length - 1 ? (
              <Button
                onClick={() => setCurrentSectionIdx((idx) => idx + 1)}
                className="rounded-xl"
              >
                <span>Phần tiếp theo</span>
                <ArrowRight className="size-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleManualSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                <CheckCircle2 className="size-4 mr-2" />
                <span>Hoàn thành bài thi</span>
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
