"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  RefreshCw,
  RotateCcw,
  Volume2,
  X,
  ArrowRight,
  Keyboard,
  Shuffle,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  PracticeMode,
  VocabularyTopicDto,
  VocabularyWordDto,
} from "@/features/vocabulary/schemas/vocabulary.schema";
import { playPronunciation } from "@/features/vocabulary/components/pronunciation-player";
import { getVocabularyLanguageCopy } from "@/features/vocabulary/vocabulary-language";

import { buildPracticeDeck, shuffleWithSeed } from "../practice-deck";

type GameResult = {
  correctAnswers: number;
  totalAnswers: number;
  studiedWordIds: string[];
  masteredWordIds: string[];
};

type PracticePayload = GameResult & {
  topicId: string;
  mode: PracticeMode;
  durationSeconds: number;
};

const modeCopy = {
  flashcards: {
    label: "Lật thẻ",
    instruction:
      "Đoán nghĩa trước khi lật thẻ, rồi tự đánh giá mức độ ghi nhớ.",
  },
  matching: {
    label: "Ghép từ",
    instruction: "Chọn một từ ở bên trái và nghĩa đúng ở bên phải.",
  },
  fill: {
    label: "Điền từ",
    instruction: "Nhìn nghĩa tiếng Việt và nhập từ phù hợp.",
  },
} as const;

export function PracticePlayer({
  topic,
  words,
  mode,
  masteredWordIds = [],
}: {
  topic: VocabularyTopicDto;
  words: VocabularyWordDto[];
  mode: PracticeMode;
  masteredWordIds?: string[];
}) {
  const router = useRouter();
  const [retryIds, setRetryIds] = useState<string[] | null>(null);
  const [initialMasteredIds] = useState(masteredWordIds);
  const [round, setRound] = useState(1);
  const [result, setResult] = useState<GameResult | null>(null);
  const [payload, setPayload] = useState<PracticePayload | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const startedAt = useRef(0);
  const finishing = useRef(false);
  const saving = useRef(false);
  const activeWords = useMemo(
    () =>
      retryIds
        ? shuffleWithSeed(
            words.filter((word) => retryIds.includes(word.id)),
            `retry:${round}`,
          )
        : buildPracticeDeck(words, mode, round, initialMasteredIds),
    [words, mode, round, retryIds, initialMasteredIds],
  );

  useEffect(() => {
    startedAt.current = Date.now();
  }, [round]);

  async function saveResult(nextPayload: PracticePayload) {
    if (saving.current) return;
    saving.current = true;
    setSaveState("saving");
    try {
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPayload),
      });
      if (!response.ok) throw new Error("Không thể lưu kết quả");
      setSaveState("saved");
      router.refresh();
    } catch {
      setSaveState("error");
    } finally {
      saving.current = false;
    }
  }

  function completeGame(nextResult: GameResult) {
    if (finishing.current) return;
    finishing.current = true;
    const nextPayload: PracticePayload = {
      ...nextResult,
      topicId: topic.id,
      mode,
      durationSeconds: Math.min(
        7_200,
        Math.max(1, Math.round((Date.now() - startedAt.current) / 1_000)),
      ),
    };
    setResult(nextResult);
    setPayload(nextPayload);
    void saveResult(nextPayload);
  }

  function restart(onlyMissed = false) {
    setRetryIds(
      onlyMissed && result
        ? result.studiedWordIds.filter(
            (id) => !result.masteredWordIds.includes(id),
          )
        : null,
    );
    finishing.current = false;
    startedAt.current = Date.now();
    setResult(null);
    setPayload(null);
    setSaveState("idle");
    setRound((value) => value + 1);
  }

  if (result) {
    const score = Math.round(
      (result.correctAnswers / result.totalAnswers) * 100,
    );
    const missedWords = words.filter(
      (word) =>
        result.studiedWordIds.includes(word.id) &&
        !result.masteredWordIds.includes(word.id),
    );
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <Card className="overflow-hidden border-primary/20 text-center">
          <div className="bg-primary/10 px-6 py-10">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
              <CheckCircle2 className="size-8" />
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight">
              Thêm một bước tiến bộ!
            </h1>
            <p className="mt-2 text-muted-foreground">
              {modeCopy[mode].label} · {topic.title}
            </p>
          </div>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted p-3">
                <p className="text-2xl font-bold">{score}%</p>
                <p className="text-xs text-muted-foreground">Điểm phiên</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="text-2xl font-bold">
                  {result.correctAnswers}/{result.totalAnswers}
                </p>
                <p className="text-xs text-muted-foreground">Chính xác</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="text-2xl font-bold">
                  {result.masteredWordIds.length}
                </p>
                <p className="text-xs text-muted-foreground">Từ ghi nhớ tốt</p>
              </div>
            </div>
            {saveState === "saving" && (
              <p role="status" className="text-sm text-muted-foreground">
                Đang lưu tiến độ...
              </p>
            )}
            {saveState === "saved" && (
              <p role="status" className="text-sm font-medium text-emerald-700">
                Tiến độ đã được lưu.
              </p>
            )}
            {saveState === "error" && (
              <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                Chưa lưu được kết quả.{" "}
                <button
                  className="font-bold underline"
                  onClick={() => payload && saveResult(payload)}
                >
                  Thử lại
                </button>
              </div>
            )}
            {missedWords.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-left">
                <h2 className="text-sm font-bold">
                  Dành thêm chút thời gian cho {missedWords.length} từ này
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missedWords.map((word) => (
                    <span
                      key={word.id}
                      className="rounded-lg border border-amber-200/60 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <strong>{word.term}</strong>
                      <span className="ml-1.5 text-muted-foreground">
                        {word.meaning}
                      </span>
                    </span>
                  ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={saveState === "saving"}
                  onClick={() => restart(true)}
                >
                  <RefreshCw className="size-4" />
                  Ôn {missedWords.length} từ chưa nhớ
                </Button>
              </div>
            )}
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Button
                onClick={() => restart()}
                disabled={saveState === "saving"}
              >
                <RotateCcw className="size-4" /> Luyện lượt mới
              </Button>
              <Link
                href={`/learn/${topic.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Về chủ đề
              </Link>
              <Link
                href="/review"
                className={buttonVariants({ variant: "outline" })}
              >
                Chọn trò khác
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/learn/${topic.id}`}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Quay lại chủ đề
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {modeCopy[mode].label}: {topic.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modeCopy[mode].instruction}
          </p>
        </div>
        <span className="hidden text-4xl sm:block" aria-hidden="true">
          {topic.icon}
        </span>
      </header>
      <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/7 px-3 py-1.5 text-[11px] font-medium text-primary">
        <Shuffle className="size-3" />
        {retryIds
          ? `Ôn lại ${activeWords.length} từ chưa nhớ`
          : `${activeWords.length} từ trong lượt này · Ưu tiên từ chưa ghi nhớ`}
      </p>
      {mode === "flashcards" && (
        <FlashcardGame
          key={round}
          words={activeWords}
          languageCode={topic.languageCode}
          onComplete={completeGame}
        />
      )}
      {mode === "matching" && (
        <MatchingGame
          key={round}
          words={activeWords}
          onComplete={completeGame}
        />
      )}
      {mode === "fill" && (
        <FillGame
          key={round}
          words={activeWords}
          languageCode={topic.languageCode}
          onComplete={completeGame}
        />
      )}
    </div>
  );
}

function FlashcardGame({
  words,
  languageCode,
  onComplete,
}: {
  words: VocabularyWordDto[];
  languageCode: VocabularyTopicDto["languageCode"];
  onComplete: (result: GameResult) => void;
}) {
  const deck = useMemo(() => words.slice(0, 20), [words]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const word = deck[index];
  const cardRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  function rate(known: boolean) {
    const nextKnownIds = known ? [...knownIds, word.id] : knownIds;
    if (known) setKnownIds(nextKnownIds);
    if (index === deck.length - 1) {
      onComplete({
        correctAnswers: nextKnownIds.length,
        totalAnswers: deck.length,
        studiedWordIds: deck.map((item) => item.id),
        masteredWordIds: nextKnownIds,
      });
      return;
    }
    setIndex((value) => value + 1);
    setFlipped(false);
  }

  const onKeyboard = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("input, textarea, select, [contenteditable=true]"))
      return;
    if (event.code === "Space" && !target?.closest("button, a")) {
      event.preventDefault();
      setFlipped((value) => !value);
    } else if (
      flipped &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      rate(event.key === "ArrowRight");
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyboard(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Thẻ {index + 1}/{deck.length}
        </span>
        <span>{knownIds.length} từ đã nhớ</span>
      </div>
      <div
        role="progressbar"
        aria-label="Tiến độ lật thẻ"
        aria-valuemin={0}
        aria-valuemax={deck.length}
        aria-valuenow={index}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(index / deck.length) * 100}%` }}
        />
      </div>
      <div className="[perspective:1200px]">
        <button
          ref={cardRef}
          type="button"
          onClick={() => setFlipped((value) => !value)}
          aria-label={
            flipped
              ? `${word.meaning}. ${word.example ?? ""} ${word.exampleMeaning ?? ""}. Nhấn để xem lại từ.`
              : `${word.term}. ${word.pronunciation ?? ""}. Lật thẻ để xem nghĩa.`
          }
          aria-pressed={flipped}
          className={`relative h-80 w-full rounded-3xl text-left shadow-lg outline-none transition-transform duration-500 [transform-style:preserve-3d] focus-visible:ring-2 focus-visible:ring-ring ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
        >
          <div
            aria-hidden={flipped}
            className="absolute inset-0 flex flex-col items-center overflow-y-auto [justify-content:safe_center] rounded-3xl border-2 border-primary/15 bg-card p-8 text-center [backface-visibility:hidden]"
          >
            <span className="absolute right-5 top-5 text-xs font-semibold text-muted-foreground">
              Nhấn để lật
            </span>
            <p
              lang={languageCode}
              className="max-w-full break-words text-4xl font-bold sm:text-5xl"
            >
              {word.term}
            </p>
            {word.pronunciation && (
              <p className="mt-3 text-lg text-muted-foreground">
                {word.pronunciation}
              </p>
            )}
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Eye className="size-4" /> Xem nghĩa
            </span>
          </div>
          <div
            aria-hidden={!flipped}
            className="absolute inset-0 flex flex-col items-center overflow-y-auto [justify-content:safe_center] rounded-3xl border-2 border-primary/20 bg-primary/5 p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <p className="max-w-full break-words text-3xl font-bold text-primary">
              {word.meaning}
            </p>
            {word.example && (
              <p className="mt-5 text-base font-medium">{word.example}</p>
            )}
            {word.exampleMeaning && (
              <p className="mt-1 text-sm text-muted-foreground">
                {word.exampleMeaning}
              </p>
            )}
            <span className="mt-6 text-xs font-semibold text-muted-foreground">
              Nhấn để xem lại mặt trước
            </span>
          </div>
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void playPronunciation({
              text: word.term,
              languageCode,
              audioUrl: word.audioUrl,
            })
          }
        >
          <Volume2 className="size-4" /> Nghe phát âm
        </Button>
        {flipped && (
          <>
            <Button
              type="button"
              variant="outline"
              className="border-amber-300 text-amber-700"
              onClick={() => rate(false)}
            >
              <RefreshCw className="size-4" /> Chưa nhớ
            </Button>
            <Button type="button" onClick={() => rate(true)}>
              <Check className="size-4" /> Đã nhớ
            </Button>
          </>
        )}
      </div>
      <p className="hidden items-center justify-center gap-2 text-[11px] text-muted-foreground sm:flex">
        <Keyboard className="size-3.5" /> Space: lật thẻ{" "}
        <span aria-hidden="true">·</span> ←: chưa nhớ{" "}
        <span aria-hidden="true">·</span> →: đã nhớ
      </p>
    </div>
  );
}

function MatchingGame({
  words,
  onComplete,
}: {
  words: VocabularyWordDto[];
  onComplete: (result: GameResult) => void;
}) {
  const pairs = useMemo(() => words.slice(0, 6), [words]);
  const meanings = useMemo(() => shuffleWithSeed(pairs, "meanings"), [pairs]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [locked, setLocked] = useState(false);

  function evaluate(termId: string, meaningId: string) {
    if (locked) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setSelectedTerm(termId);
    setSelectedMeaning(meaningId);
    if (termId === meaningId) {
      const nextMatched = [...matchedIds, termId];
      setMatchedIds(nextMatched);
      setFeedback("correct");
      setSelectedTerm(null);
      setSelectedMeaning(null);
      window.setTimeout(() => setFeedback(null), 350);
      if (nextMatched.length === pairs.length) {
        const masteredWordIds = nextMatched.filter(
          (id) => !missedIds.includes(id),
        );
        window.setTimeout(
          () =>
            onComplete({
              correctAnswers: pairs.length,
              totalAnswers: nextAttempts,
              studiedWordIds: pairs.map((word) => word.id),
              masteredWordIds,
            }),
          450,
        );
      }
      return;
    }

    setFeedback("wrong");
    setLocked(true);
    setMissedIds((current) => [...new Set([...current, termId, meaningId])]);
    window.setTimeout(() => {
      setSelectedTerm(null);
      setSelectedMeaning(null);
      setFeedback(null);
      setLocked(false);
    }, 550);
  }

  function chooseTerm(id: string) {
    if (locked || matchedIds.includes(id)) return;
    if (selectedMeaning) evaluate(id, selectedMeaning);
    else setSelectedTerm(id);
  }

  function chooseMeaning(id: string) {
    if (locked || matchedIds.includes(id)) return;
    if (selectedTerm) evaluate(selectedTerm, id);
    else setSelectedMeaning(id);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">
          Đã ghép {matchedIds.length}/{pairs.length}
        </CardTitle>
        <span
          role="status"
          className={`text-sm font-bold ${feedback === "wrong" ? "text-destructive" : "text-primary"}`}
        >
          {feedback === "correct"
            ? "Chính xác!"
            : feedback === "wrong"
              ? "Chưa đúng, thử lại"
              : `${attempts} lượt chọn`}
        </span>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:gap-5">
        <div className="space-y-3">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Từ
          </p>
          {pairs.map((word) => (
            <button
              type="button"
              key={word.id}
              disabled={matchedIds.includes(word.id)}
              onClick={() => chooseTerm(word.id)}
              className={`min-h-16 w-full rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${matchedIds.includes(word.id) ? "border-emerald-300 bg-emerald-50 text-emerald-700 opacity-60" : selectedTerm === word.id ? (feedback === "wrong" ? "border-red-400 bg-red-50" : "border-primary bg-primary/10") : "bg-background hover:border-primary/40"}`}
            >
              {word.term}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nghĩa
          </p>
          {meanings.map((word) => (
            <button
              type="button"
              key={word.id}
              disabled={matchedIds.includes(word.id)}
              onClick={() => chooseMeaning(word.id)}
              className={`min-h-16 w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${matchedIds.includes(word.id) ? "border-emerald-300 bg-emerald-50 text-emerald-700 opacity-60" : selectedMeaning === word.id ? (feedback === "wrong" ? "border-red-400 bg-red-50" : "border-primary bg-primary/10") : "bg-background hover:border-primary/40"}`}
            >
              {word.meaning}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,!?;:'"“”‘’]/g, "")
    .replace(/\s+/g, " ");
}

function blankExample(example: string | null, term: string) {
  if (!example) return null;
  const index = example.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  if (index < 0) return null;
  return `${example.slice(0, index)}_____ ${example.slice(index + term.length)}`.replace(
    "_____  ",
    "_____ ",
  );
}

function FillGame({
  words,
  languageCode,
  onComplete,
}: {
  words: VocabularyWordDto[];
  languageCode: VocabularyTopicDto["languageCode"];
  onComplete: (result: GameResult) => void;
}) {
  const questions = useMemo(() => words.slice(0, 10), [words]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (feedback) nextButtonRef.current?.focus();
    else inputRef.current?.focus();
  }, [index, feedback]);
  const word = questions[index];
  const example = blankExample(word.example, word.term);
  const languageCopy = getVocabularyLanguageCopy(languageCode);

  function checkAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || feedback) return;
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(word.term);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setCorrectIds((current) => [...current, word.id]);
  }

  function nextQuestion() {
    const nextCorrectIds =
      feedback === "correct" && !correctIds.includes(word.id)
        ? [...correctIds, word.id]
        : correctIds;
    if (index === questions.length - 1) {
      onComplete({
        correctAnswers: nextCorrectIds.length,
        totalAnswers: questions.length,
        studiedWordIds: questions.map((item) => item.id),
        masteredWordIds: nextCorrectIds,
      });
      return;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setFeedback(null);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">
          Câu {index + 1}/{questions.length}
        </CardTitle>
        <span className="text-sm font-semibold text-primary">
          {correctIds.length} câu đúng
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-muted p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nhập từ có nghĩa
          </p>
          <p className="mt-2 text-3xl font-bold text-primary">{word.meaning}</p>
          {word.pronunciation && (
            <p className="mt-2 text-sm text-muted-foreground">
              {languageCopy.pronunciationShortLabel}: {word.pronunciation}
            </p>
          )}
          {example && <p className="mt-5 text-sm font-medium">{example}</p>}
        </div>
        <form className="space-y-3" onSubmit={checkAnswer}>
          <Input
            ref={inputRef}
            aria-label="Đáp án của bạn"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={Boolean(feedback)}
            placeholder={languageCopy.answerPlaceholder}
            className={`h-14 text-center text-lg font-semibold ${feedback === "correct" ? "border-emerald-400 bg-emerald-50" : feedback === "wrong" ? "border-red-400 bg-red-50" : ""}`}
          />
          {!feedback ? (
            <Button className="w-full" size="lg" disabled={!answer.trim()}>
              Kiểm tra
            </Button>
          ) : (
            <div
              role="status"
              className={`rounded-xl p-3 text-center text-sm font-semibold ${feedback === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {feedback === "correct" ? (
                <span className="inline-flex items-center gap-1">
                  <Check className="size-4" /> Chính xác!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <X className="size-4" /> Đáp án đúng: {word.term}
                </span>
              )}
            </div>
          )}
        </form>
        {feedback && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                void playPronunciation({
                  text: word.term,
                  languageCode,
                  audioUrl: word.audioUrl,
                })
              }
            >
              <Volume2 className="size-4" /> Nghe từ
            </Button>
            <Button ref={nextButtonRef} onClick={nextQuestion}>
              {index === questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
