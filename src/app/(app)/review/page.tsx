"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Volume2, Eye, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RubyText } from "@/features/content/components/ruby-text";

type ReviewItemWithLexeme = {
  id: string;
  uid: string;
  programId: string;
  languageId: string;
  targetType: "lexeme";
  targetId: string;
  state: "new" | "learning" | "review" | "mastered" | "suspended";
  dueAt: any;
  intervalDays: number;
  ease: number;
  correctStreak: number;
  lapseCount: number;
  lexeme: {
    lexemeId: string;
    term: string;
    meaningVi: string;
    pronunciation: string | null;
    example: string | null;
    mediaRefs: string[];
  } | null;
};

export default function ReviewPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewItemWithLexeme[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showRuby, setShowRuby] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadDueReviews() {
      try {
        const res = await fetch("/api/reviews/due");
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDueReviews();
  }, []);

  const currentItem = items[currentIdx];

  // Text to Speech helper
  const handleSpeak = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentItem?.lexeme?.term) return;
    const textCleaned = currentItem.lexeme.term.replace(/([^\s[\]]+)\[([^[\]]+)\]/g, "$1");
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(textCleaned);
    if (currentItem.languageId === "ja") utterance.lang = "ja-JP";
    else if (currentItem.languageId === "zh") utterance.lang = "zh-CN";
    else utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [currentItem]);

  // Automatically speak when a new card is loaded
  useEffect(() => {
    if (currentItem) {
      // Wait a tiny bit to make sure user context is loaded
      const timer = setTimeout(() => {
        handleSpeak();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, currentItem, handleSpeak]);

  const handleAnswer = useCallback(async (rating: "again" | "hard" | "good" | "easy") => {
    if (!currentItem || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${currentItem.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      if (res.ok) {
        setShowMeaning(false);
        if (currentIdx < items.length - 1) {
          setCurrentIdx((idx) => idx + 1);
        } else {
          // Finished all
          setItems([]);
          setCurrentIdx(0);
        }
      } else {
        console.error("Failed to submit rating");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [currentItem, submitting, currentIdx, items.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || items.length === 0 || currentIdx >= items.length || submitting) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!showMeaning) {
          setShowMeaning(true);
        }
      } else if (showMeaning) {
        if (e.key === "1") {
          handleAnswer("again");
        } else if (e.key === "2") {
          handleAnswer("hard");
        } else if (e.key === "3") {
          handleAnswer("good");
        } else if (e.key === "4") {
          handleAnswer("easy");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, items, currentIdx, showMeaning, submitting, handleAnswer]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang tải phiên ôn tập...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-6">
        <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
          <CheckCircle2 className="size-10" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">Tuyệt vời! Bạn đã hoàn thành hết!</h1>
          <p className="text-muted-foreground">
            Hôm nay không còn từ vựng nào đến hạn ôn tập. Hãy tiếp tục học bài mới để tích lũy thêm kiến thức nhé.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard" className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors">
            Quay về Dashboard
          </Link>
          <Link href="/learn" className="h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors">
            Học bài mới
          </Link>
        </div>
      </div>
    );
  }

  const hasRubyOption = currentItem.languageId === "ja" || currentItem.languageId === "zh";

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
          <span>Thoát ôn tập</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
            Tiến độ: {currentIdx + 1} / {items.length}
          </span>
          {hasRubyOption && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setShowRuby((prev) => !prev)}
            >
              {currentItem.languageId === "ja" ? "あ Furigana" : "Pīnyīn"}: {showRuby ? "Bật" : "Tắt"}
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((currentIdx) / items.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <Card className="min-h-[320px] flex flex-col justify-between shadow-lg border-2 border-primary/5 hover:border-primary/10 transition-all duration-300 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center flex-grow py-12 relative">
          {/* Audio Button */}
          <button
            onClick={handleSpeak}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Nghe phát âm"
          >
            <Volume2 className="size-6" />
          </button>

          {/* Word Term */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-wide select-none">
              {currentItem.lexeme ? (
                <RubyText
                  text={currentItem.lexeme.term}
                  enabled={showRuby}
                  languageId={currentItem.languageId}
                />
              ) : (
                <span className="text-red-500">Từ vựng bị xoá</span>
              )}
            </h2>
            {currentItem.lexeme?.pronunciation && (
              <p className="text-lg text-muted-foreground font-mono">
                /{currentItem.lexeme.pronunciation}/
              </p>
            )}
          </div>

          {/* Answer reveal section */}
          {showMeaning && currentItem.lexeme && (
            <div className="mt-8 pt-8 border-t border-dashed w-full max-w-md text-center space-y-4 animate-fade-in">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  Ý nghĩa
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {currentItem.lexeme.meaningVi}
                </p>
              </div>

              {currentItem.lexeme.example && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Ví dụ
                  </p>
                  <p className="text-base italic text-muted-foreground">
                    <RubyText
                      text={currentItem.lexeme.example}
                      enabled={showRuby}
                      languageId={currentItem.languageId}
                    />
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Action Controls */}
        <div className="bg-muted/30 border-t p-6">
          {!showMeaning ? (
            <Button
              className="w-full h-12 text-base font-semibold shadow-sm"
              onClick={() => setShowMeaning(true)}
            >
              <Eye className="size-5 mr-2" />
              Hiển thị ý nghĩa [Space / Enter]
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground text-center">
                Bạn nhớ từ này ở mức độ nào?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-12 border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 text-red-600 font-semibold"
                  onClick={() => handleAnswer("again")}
                  disabled={submitting}
                >
                  <div className="text-center">
                    <div className="text-xs font-normal text-muted-foreground mb-0.5">[Phím 1]</div>
                    Xem lại
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/20 text-orange-600 font-semibold"
                  onClick={() => handleAnswer("hard")}
                  disabled={submitting}
                >
                  <div className="text-center">
                    <div className="text-xs font-normal text-muted-foreground mb-0.5">[Phím 2]</div>
                    Khó
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/20 text-blue-600 font-semibold"
                  onClick={() => handleAnswer("good")}
                  disabled={submitting}
                >
                  <div className="text-center">
                    <div className="text-xs font-normal text-muted-foreground mb-0.5">[Phím 3]</div>
                    Đạt
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-green-200 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/20 text-green-600 font-semibold"
                  onClick={() => handleAnswer("easy")}
                  disabled={submitting}
                >
                  <div className="text-center">
                    <div className="text-xs font-normal text-muted-foreground mb-0.5">[Phím 4]</div>
                    Dễ
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
