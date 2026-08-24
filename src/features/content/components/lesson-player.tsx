"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Volume2,
  Award,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { normalizeText } from "../adapters/language-adapter";
import { RubyText } from "./ruby-text";

type VocabularyEntry = {
  term: string;
  meaningVi: string;
  pronunciation?: string;
  example?: string;
};

type OptionEntry = {
  id: string;
  text: string;
};

type TokenEntry = {
  id: string;
  text: string;
};

type GapAnswer = {
  gapId: string;
  acceptedAnswers: string[];
  caseSensitive?: boolean;
  kanaEquivalence?: boolean;
  traditionalEquivalence?: boolean;
  tonePolicy?: "ignore" | "require" | "numbers";
};

type ScoringDefinition = {
  correctOptionId?: string;
  correctTokenIds?: string[];
  answers?: GapAnswer[];
};

type Activity = {
  id: string;
  type: string;
  instruction: string;
  prompt: string;
  body?: string;
  entries?: VocabularyEntry[];
  options?: OptionEntry[];
  template?: string;
  tokens?: TokenEntry[];
  transcript?: string;
  scoringDefinition: ScoringDefinition;
};

type Vocabulary = {
  lexemeId: string;
  term: string;
  meaningVi: string;
  pronunciation?: string;
  example?: string;
};

export type LessonPlayerProps = {
  lessonRevision: {
    id: string;
    lessonId: string;
    courseId: string;
    programId: string;
    languageId?: string;
    title: string;
    summary: string;
    objectives: string[];
    estimatedMinutes: number;
    activities: Activity[];
    vocabulary: Vocabulary[];
  };
};

type ActivityProgressState = {
  completed: boolean;
  score?: number | null;
  attempts?: number;
  lastResponse?: unknown;
};

export function LessonPlayer({ lessonRevision }: LessonPlayerProps) {
  const router = useRouter();
  const { title, summary, objectives, activities, vocabulary } = lessonRevision;

  const [screen, setScreen] = useState<"intro" | "player" | "outro">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string> | string>>({});
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [reorderSelected, setReorderSelected] = useState<string[]>([]);
  const [speechActive, setSpeechActive] = useState(false);
  const [showRuby, setShowRuby] = useState(true);

  // Persistence States
  const [progressLoading, setProgressLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [timeSpent, setTimeSpent] = useState(0);
  const [completedRequiredCount, setCompletedRequiredCount] = useState(0);
  const [boundedActivityState, setBoundedActivityState] = useState<Record<string, ActivityProgressState>>({});

  const currentActivity = activities[currentIdx];

  // Fetch progress on load
  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch(`/api/progress?lessonId=${lessonRevision.lessonId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.progress) {
            const p = data.progress;
            setCompletedRequiredCount(p.completedRequiredCount || 0);
            setBoundedActivityState(p.boundedActivityState || {});

            // Resumes from the first incomplete activity index
            const firstIncompleteIdx = activities.findIndex(
              (act) => !p.boundedActivityState?.[act.id]?.completed
            );
            if (firstIncompleteIdx !== -1) {
              setCurrentIdx(firstIncompleteIdx);
            } else {
              setCurrentIdx(0);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải tiến trình bài học", err);
      } finally {
        setProgressLoading(false);
      }
    }
    loadProgress();
  }, [lessonRevision.lessonId, activities]);

  // Keep a timer for timeSpent
  useEffect(() => {
    if (screen !== "player") return;
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [screen]);

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onstart = () => setSpeechActive(true);
    utterance.onend = () => setSpeechActive(false);
    utterance.onerror = () => setSpeechActive(false);
    window.speechSynthesis.speak(utterance);
  };

  const triggerAutosave = useCallback(async (
    updatedState: typeof boundedActivityState,
    newCompletedCount: number,
    isFinished: boolean,
    lastActId: string | null
  ) => {
    setSaveStatus("saving");
    try {
      const isAllCompleted = activities.every((act) => !!updatedState[act.id]?.completed);
      const status = (isFinished || isAllCompleted) ? "completed" : "in_progress";

      // Snapshot study duration payload to send to database persistence
      const payloadTime = timeSpent;
      setTimeSpent(0); // Immediately reset timer to prevent double counting or race conditions

      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lessonRevision.lessonId,
          lessonRevisionId: lessonRevision.id,
          status,
          lastActivityId: lastActId,
          boundedActivityState: updatedState,
          completedRequiredCount: newCompletedCount,
          requiredActivityCount: activities.length,
          timeSpentSeconds: payloadTime,
        }),
      });

      if (res.ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
        // Restore time spent if the save failed
        setTimeSpent((prev) => prev + payloadTime);
      }
    } catch (err) {
      console.error("Autosave error", err);
      setSaveStatus("error");
    }
  }, [lessonRevision.id, lessonRevision.lessonId, activities, timeSpent]);

  const handleStart = () => {
    if (activities.length > 0) {
      setIsChecked(false);
      setIsCorrect(null);
      setReorderSelected([]);
      setScreen("player");
      setScore(0);
      setAnswers({});

      // Set initial progress in Firestore
      const initialProgressState = { ...boundedActivityState };
      triggerAutosave(initialProgressState, completedRequiredCount, false, activities[currentIdx].id);
    } else {
      alert("Bài học này chưa có hoạt động học tập nào");
    }
  };

  const handleCheck = useCallback(() => {
    if (!currentActivity) return;

    let correct = false;

    if (currentActivity.type === "explanation" || currentActivity.type === "vocabulary_card") {
      correct = true;
    } else if (currentActivity.type === "single_choice" || currentActivity.type === "listening_choice") {
      const selected = answers[currentActivity.id] as string;
      const target = currentActivity.scoringDefinition?.correctOptionId;
      correct = !currentActivity.scoringDefinition || selected === target;
    } else if (currentActivity.type === "gap_fill") {
      const userAnswers = (answers[currentActivity.id] || {}) as Record<string, string>;
      const answerDefs = currentActivity.scoringDefinition?.answers || [];
      correct = !currentActivity.scoringDefinition || answerDefs.every((def) => {
        const userText = (userAnswers[def.gapId] || "");
        const normUser = normalizeText(userText, lessonRevision.languageId || "", {
          caseSensitive: def.caseSensitive,
          kanaEquivalence: def.kanaEquivalence,
          traditionalEquivalence: def.traditionalEquivalence,
          tonePolicy: def.tonePolicy,
        });
        const acceptable = (def.acceptedAnswers || []).map((a: string) =>
          normalizeText(a, lessonRevision.languageId || "", {
            caseSensitive: def.caseSensitive,
            kanaEquivalence: def.kanaEquivalence,
            traditionalEquivalence: def.traditionalEquivalence,
            tonePolicy: def.tonePolicy,
          })
        );
        return acceptable.includes(normUser);
      });
    } else if (currentActivity.type === "reorder_tokens") {
      const target = currentActivity.scoringDefinition?.correctTokenIds || [];
      correct =
        !currentActivity.scoringDefinition ||
        (reorderSelected.length === target.length &&
          reorderSelected.every((val, index) => val === target[index]));
    }

    setIsCorrect(correct);
    setIsChecked(true);

    const actId = currentActivity.id;
    const currentActState = boundedActivityState[actId] || { completed: false, score: 0, attempts: 0 };
    const attempts = (currentActState.attempts || 0) + 1;

    const updatedState = {
      ...boundedActivityState,
      [actId]: {
        completed: correct,
        score: correct ? 1 : 0,
        attempts,
        lastResponse: answers[actId] || null,
      },
    };

    setBoundedActivityState(updatedState);

    const newCompletedCount = Object.values(updatedState).filter((s) => s.completed).length;
    setCompletedRequiredCount(newCompletedCount);

    if (correct) {
      setScore((s) => s + 1);
    }

    // Trigger save status updates on checking answers
    triggerAutosave(updatedState, newCompletedCount, false, actId);
  }, [currentActivity, answers, lessonRevision.languageId, reorderSelected, boundedActivityState, triggerAutosave]);

  const handleNext = useCallback(() => {
    const actId = currentActivity.id;
    let updatedState = { ...boundedActivityState };

    // Auto-complete non-question activities (explanation/vocabulary_card) on click Next
    if (currentActivity.type === "explanation" || currentActivity.type === "vocabulary_card") {
      updatedState = {
        ...boundedActivityState,
        [actId]: {
          completed: true,
          score: 1,
          attempts: 1,
          lastResponse: null,
        },
      };
      setBoundedActivityState(updatedState);
      const newCompletedCount = Object.values(updatedState).filter((s) => s.completed).length;
      setCompletedRequiredCount(newCompletedCount);
      triggerAutosave(updatedState, newCompletedCount, false, actId);
    }

    if (currentIdx < activities.length - 1) {
      setIsChecked(false);
      setIsCorrect(null);
      setReorderSelected([]);
      setCurrentIdx((idx) => idx + 1);
    } else {
      const finalCompletedCount = Object.values(updatedState).filter((s) => s.completed).length;
      triggerAutosave(updatedState, finalCompletedCount, true, actId);
      setScreen("outro");
    }
  }, [currentActivity, boundedActivityState, currentIdx, activities.length, triggerAutosave]);

  // Keyboard Navigation / Enter key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== "player" || !currentActivity) return;
      if (e.key === "Enter") {
        if (e.isComposing) return;

        if (!isChecked) {
          let hasAnswer = false;
          if (currentActivity.type === "explanation" || currentActivity.type === "vocabulary_card") {
            hasAnswer = true;
          } else if (currentActivity.type === "single_choice" || currentActivity.type === "listening_choice") {
            hasAnswer = !!answers[currentActivity.id];
          } else if (currentActivity.type === "gap_fill") {
            const userAnswers = (answers[currentActivity.id] || {}) as Record<string, string>;
            hasAnswer = Object.keys(userAnswers).length > 0 && Object.values(userAnswers).some(val => val.trim().length > 0);
          } else if (currentActivity.type === "reorder_tokens") {
            hasAnswer = reorderSelected.length > 0;
          }

          if (hasAnswer) {
            handleCheck();
          }
        } else {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, currentActivity, isChecked, answers, reorderSelected, handleCheck, handleNext]);

  const handleFinish = async () => {
    try {
      await fetch(`/api/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: lessonRevision.programId,
        }),
      });
    } catch (e) {
      console.error(e);
    }
    router.push(`/learn/${lessonRevision.programId}/courses/${lessonRevision.courseId}`);
  };

  if (progressLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang tải tiến trình học...</p>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-4">
        <Link
          href={`/learn/${lessonRevision.programId}/courses/${lessonRevision.courseId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" /> Quay lại khóa học
        </Link>

        <Card className="border-2 border-primary/10 overflow-hidden shadow-md">
          <div className="h-2 bg-primary" />
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase bg-primary/10 text-primary">
                Giới thiệu bài học
              </span>
              {completedRequiredCount > 0 && (
                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  Đã làm: {completedRequiredCount}/{activities.length} câu
                </span>
              )}
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight">{title}</CardTitle>
            <CardDescription className="text-base">{summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {objectives.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                  Mục tiêu bài học
                </h3>
                <ul className="grid gap-2 text-sm text-muted-foreground">
                  {objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {vocabulary.length > 0 && (
              <div className="space-y-2.5 pt-4 border-t">
                <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                  Từ vựng cần học ({vocabulary.length})
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {vocabulary.map((vocab) => (
                    <div
                      key={vocab.lexemeId}
                      className="p-3 rounded-xl border bg-muted/20 flex flex-col justify-between"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-foreground">{vocab.term}</span>
                        {vocab.pronunciation && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {vocab.pronunciation}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">{vocab.meaningVi}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button size="lg" className="w-full text-base font-bold shadow-lg" onClick={handleStart}>
              {completedRequiredCount > 0 ? "Học tiếp bài học" : "Bắt đầu học"}{" "}
              <ArrowRight className="size-5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "outro") {
    const pct = Math.round((score / activities.length) * 100);
    return (
      <div className="max-w-md mx-auto space-y-6 pt-8 text-center">
        <Card className="border-2 border-primary/20 overflow-hidden shadow-xl p-8 space-y-6">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
            <Award className="size-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Hoàn thành xuất sắc!</h2>
            <p className="text-muted-foreground">
              Bạn đã hoàn tất tất cả câu hỏi của bài học <strong>{title}</strong>.
            </p>
          </div>

          <div className="p-4 bg-muted/40 rounded-2xl grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Điểm số</p>
              <p className="text-2xl font-bold text-foreground">
                {score} / {activities.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tỷ lệ đúng</p>
              <p className="text-2xl font-bold text-primary">{pct}%</p>
            </div>
          </div>

          <Button size="lg" className="w-full text-base font-bold" onClick={handleFinish}>
            Quay lại bảng điều khiển
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (confirm("Bạn có chắc muốn thoát bài học này không?")) {
                router.push(`/learn/${lessonRevision.programId}/courses/${lessonRevision.courseId}`);
              }
            }}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          >
            Thoát
          </button>

          {(lessonRevision.languageId === "ja" || lessonRevision.languageId === "zh") && (
            <button
              onClick={() => setShowRuby(!showRuby)}
              className="text-xs px-2 py-1 rounded bg-muted/60 hover:bg-muted font-bold text-muted-foreground hover:text-foreground transition flex items-center gap-1 border"
            >
              <span>{lessonRevision.languageId === "ja" ? "あ Furigana" : "Pīnyīn"}</span>
              <span className={showRuby ? "text-green-600" : "text-red-500"}>
                {showRuby ? "BẬT" : "TẮT"}
              </span>
            </button>
          )}
        </div>

        <div className="flex-1 max-w-md bg-muted rounded-full h-3.5 overflow-hidden border">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / activities.length) * 100}%` }}
          />
        </div>

        <span className="text-xs font-mono text-muted-foreground shrink-0">
          {currentIdx + 1} / {activities.length}
        </span>
      </div>

      {/* Persistence indicator status badge */}
      <div className="flex justify-end h-4">
        {saveStatus === "saving" && (
          <span className="text-xs text-yellow-600 font-medium flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> Đang lưu...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check className="size-3" /> Đã lưu
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="size-3" /> Lưu lỗi
          </span>
        )}
      </div>

      <Card className="shadow-md overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div>
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xs font-bold text-primary uppercase tracking-wider">
                  {currentActivity.instruction}
                </p>
                <CardTitle className="text-xl mt-1">
                  <RubyText text={currentActivity.prompt} enabled={showRuby} languageId={lessonRevision.languageId || ""} />
                </CardTitle>
              </div>
              {currentActivity.type === "listening_choice" && (
                <Button
                  size="icon"
                  variant="outline"
                  className={speechActive ? "border-primary bg-primary/10 text-primary animate-pulse" : ""}
                  onClick={() => speakText(currentActivity.transcript || "")}
                >
                  <Volume2 className="size-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {currentActivity.type === "explanation" && (
              <div className="p-4 bg-muted/30 rounded-2xl whitespace-pre-wrap leading-relaxed text-sm text-foreground">
                <RubyText text={currentActivity.body || ""} enabled={showRuby} languageId={lessonRevision.languageId || ""} />
              </div>
            )}

            {currentActivity.type === "vocabulary_card" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {currentActivity.entries?.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border bg-background hover:shadow-sm transition cursor-pointer group"
                    onClick={() => speakText(entry.term)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold group-hover:text-primary transition">
                        <RubyText text={entry.term} enabled={showRuby} languageId={lessonRevision.languageId || ""} />
                      </span>
                      <Button size="icon" variant="ghost" className="size-8">
                        <Volume2 className="size-4 text-muted-foreground group-hover:text-primary" />
                      </Button>
                    </div>
                    {entry.pronunciation && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {entry.pronunciation}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-foreground mt-3">{entry.meaningVi}</p>
                    {entry.example && (
                      <p className="text-xs text-muted-foreground italic mt-2 pt-2 border-t">
                        &quot;<RubyText text={entry.example} enabled={showRuby} languageId={lessonRevision.languageId || ""} />&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(currentActivity.type === "single_choice" || currentActivity.type === "listening_choice") && (
              <div className="grid gap-3">
                {currentActivity.options?.map((opt) => {
                  const selected = (answers[currentActivity.id] as string) === opt.id;
                  const isAnswerCorrect =
                    currentActivity.scoringDefinition?.correctOptionId === opt.id;

                  let borderClass = "border-border hover:bg-muted/30";
                  if (selected && !isChecked) borderClass = "border-primary bg-primary/5 ring-2 ring-primary/20";
                  if (isChecked) {
                    if (isAnswerCorrect) {
                      borderClass = "border-green-500 bg-green-50/50 text-green-950 font-semibold";
                    } else if (selected) {
                      borderClass = "border-red-500 bg-red-50/50 text-red-950";
                    } else {
                      borderClass = "opacity-60 border-border";
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={isChecked}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [currentActivity.id]: opt.id }))
                      }
                      className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition flex items-center justify-between ${borderClass}`}
                    >
                      <span>
                        <RubyText text={opt.text} enabled={showRuby} languageId={lessonRevision.languageId || ""} />
                      </span>
                      {isChecked && isAnswerCorrect && (
                        <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                      )}
                      {isChecked && selected && !isAnswerCorrect && (
                        <XCircle className="size-4 text-red-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {currentActivity.type === "gap_fill" && (
              <div className="space-y-6">
                <div className="p-6 bg-muted/20 rounded-2xl text-center text-lg leading-relaxed font-medium">
                  {currentActivity.template?.split(/(\{\{[a-zA-Z0-9_-]+\}\})/).map((part, index) => {
                    const isGap = part.startsWith("{{") && part.endsWith("}}");
                    if (!isGap) return <RubyText key={index} text={part} enabled={showRuby} languageId={lessonRevision.languageId || ""} />;

                    const gapId = part.slice(2, -2);
                    const userAnswers = (answers[currentActivity.id] || {}) as Record<string, string>;
                    const val = userAnswers[gapId] || "";

                    const def = currentActivity.scoringDefinition?.answers?.find(
                      (a) => a.gapId === gapId
                    );
                    const isGapCorrect =
                      def &&
                      def.acceptedAnswers
                        .map((a: string) =>
                          normalizeText(a, lessonRevision.languageId || "", {
                            caseSensitive: def.caseSensitive,
                            kanaEquivalence: def.kanaEquivalence,
                            traditionalEquivalence: def.traditionalEquivalence,
                            tonePolicy: def.tonePolicy,
                          })
                        )
                        .includes(
                          normalizeText(val, lessonRevision.languageId || "", {
                            caseSensitive: def.caseSensitive,
                            kanaEquivalence: def.kanaEquivalence,
                            traditionalEquivalence: def.traditionalEquivalence,
                            tonePolicy: def.tonePolicy,
                          })
                        );

                    let inputClass = "border-b border-muted-foreground/60 focus:border-primary";
                    if (isChecked) {
                      inputClass = isGapCorrect
                        ? "border-green-500 text-green-700 font-bold bg-green-50 px-1 rounded"
                        : "border-red-500 text-red-700 font-bold bg-red-50 px-1 rounded";
                    }

                    return (
                      <input
                        key={index}
                        type="text"
                        disabled={isChecked}
                        placeholder="..."
                        className={`mx-1 w-24 text-center bg-transparent outline-none transition-colors ${inputClass}`}
                        value={val}
                        onChange={(e) => {
                          setAnswers((prev) => {
                            const curr = (prev[currentActivity.id] || {}) as Record<string, string>;
                            return {
                              ...prev,
                              [currentActivity.id]: {
                                ...curr,
                                [gapId]: e.target.value,
                              },
                            };
                          });
                        }}
                      />
                    );
                  })}
                </div>

                {isChecked && !isCorrect && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs space-y-1">
                    <p className="font-semibold">Đáp án đúng là:</p>
                    {currentActivity.scoringDefinition?.answers?.map((ans, i) => (
                      <p key={i}>
                        • Gap <strong>{ans.gapId}</strong>: {ans.acceptedAnswers.join(" hoặc ")}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentActivity.type === "reorder_tokens" && (
              <div className="space-y-6">
                <div className="min-h-[64px] p-4 rounded-2xl border-2 border-dashed bg-muted/10 flex flex-wrap gap-2 items-center">
                  {reorderSelected.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Click vào các từ phía dưới để sắp xếp...
                    </span>
                  ) : (
                    reorderSelected.map((tokId, index) => {
                      const tok = currentActivity.tokens?.find((t) => t.id === tokId);
                      return (
                        <button
                          key={index}
                          disabled={isChecked}
                          onClick={() => {
                            setReorderSelected((prev) => prev.filter((_, i) => i !== index));
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-semibold shadow-sm transition ${
                            isChecked
                              ? isCorrect
                                ? "bg-green-100 text-green-800 border-green-300"
                                : "bg-red-100 text-red-800 border-red-300"
                              : "bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          {tok && <RubyText text={tok.text} enabled={showRuby} languageId={lessonRevision.languageId || ""} />}
                        </button>
                      );
                    })
                  )}
                </div>

                {!isChecked && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentActivity.tokens?.map((tok) => {
                      const used = reorderSelected.includes(tok.id);
                      return (
                        <button
                          key={tok.id}
                          disabled={used}
                          onClick={() => {
                            setReorderSelected((prev) => [...prev, tok.id]);
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                            used
                              ? "opacity-30 pointer-events-none bg-muted text-muted-foreground"
                              : "bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          <RubyText text={tok.text} enabled={showRuby} languageId={lessonRevision.languageId || ""} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {isChecked && !isCorrect && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs">
                    Đáp án đúng:{" "}
                    <strong className="font-mono text-sm text-foreground">
                      {currentActivity.scoringDefinition?.correctTokenIds
                        ?.map((id) => {
                          const tokenText = currentActivity.tokens?.find((t) => t.id === id)?.text || "";
                          return tokenText.replace(/([^\s[\]]+)\[([^[\]]+)\]/g, "$1");
                        })
                        .join(" ")}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </div>

        <div className="p-4 border-t bg-muted/10 flex items-center justify-between gap-4">
          <div>
            {isChecked && (
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="size-5 text-green-600" />
                    <span className="text-sm font-bold text-green-700">Chính xác!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 text-red-600" />
                    <span className="text-sm font-bold text-red-700">Chưa đúng!</span>
                  </>
                )}
              </div>
            )}
          </div>

          {!isChecked ? (
            <Button className="px-6 font-bold shadow" onClick={handleCheck}>
              Kiểm tra
            </Button>
          ) : (
            <Button className="px-6 font-bold shadow" onClick={handleNext}>
              {currentIdx < activities.length - 1 ? "Tiếp theo" : "Hoàn thành"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
