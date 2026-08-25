"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Volume2,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { applyWordSuggestion } from "@/features/vocabulary/apply-word-suggestion";
import { JapaneseWordSuggestionField } from "@/features/vocabulary/components/japanese-word-suggestion-field";
import { playPronunciation } from "@/features/vocabulary/components/pronunciation-player";
import { VocabularyTransferActions } from "@/features/vocabulary/components/vocabulary-transfer-actions";
import type {
  VocabularyTopicDto,
  VocabularyWordDto,
} from "@/features/vocabulary/schemas/vocabulary.schema";
import { getVocabularyLanguageCopy } from "@/features/vocabulary/vocabulary-language";
import { cn } from "@/lib/utils";

type WordFormState = {
  term: string;
  meaning: string;
  pronunciation: string;
  example: string;
  exampleMeaning: string;
  audioUrl: string;
  imageUrl: string;
  order: number;
  isVisible: boolean;
};

function emptyWord(order: number): WordFormState {
  return {
    term: "",
    meaning: "",
    pronunciation: "",
    example: "",
    exampleMeaning: "",
    audioUrl: "",
    imageUrl: "",
    order,
    isVisible: true,
  };
}

function wordToForm(word: VocabularyWordDto): WordFormState {
  return {
    term: word.term,
    meaning: word.meaning,
    pronunciation: word.pronunciation ?? "",
    example: word.example ?? "",
    exampleMeaning: word.exampleMeaning ?? "",
    audioUrl: word.audioUrl ?? "",
    imageUrl: word.imageUrl ?? "",
    order: word.order,
    isVisible: word.isVisible,
  };
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : "Không thể lưu thay đổi";
}

export function TopicWordEditor({
  topic,
  words,
}: {
  topic: VocabularyTopicDto;
  words: VocabularyWordDto[];
}) {
  const router = useRouter();
  const nextWordOrder = words.reduce(
    (nextOrder, word) => Math.max(nextOrder, word.order + 1),
    0,
  );
  const [form, setForm] = useState<WordFormState>(() => emptyWord(nextWordOrder));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listNotice, setListNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(words.length === 0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const formCardRef = useRef<HTMLDivElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);
  const formOpenerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const showJapaneseSuggestions = topic.languageCode === "ja" && editingId === null;
  const languageCopy = getVocabularyLanguageCopy(topic.languageCode);

  function resetForm(order = nextWordOrder) {
    setEditingId(null);
    setForm(emptyWord(order));
    setAdvancedOpen(false);
  }

  function revealForm(opener: HTMLButtonElement) {
    formOpenerRef.current = opener;
    setFormOpen(true);
    requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      const termInput =
        termInputRef.current ??
        formCardRef.current?.querySelector<HTMLInputElement>("#word-term");
      termInput?.focus({ preventScroll: true });
    });
  }

  function restoreFormOpenerFocus() {
    requestAnimationFrame(() => {
      if (formOpenerRef.current?.isConnected) {
        formOpenerRef.current.focus();
        return;
      }
      document.querySelector<HTMLButtonElement>("#open-word-editor")?.focus();
    });
  }

  function openCreateForm(opener: HTMLButtonElement) {
    resetForm();
    setError(null);
    setNotice(null);
    revealForm(opener);
  }

  function closeForm() {
    resetForm();
    setError(null);
    setNotice(null);
    setFormOpen(false);
    restoreFormOpenerFocus();
  }

  function editWord(word: VocabularyWordDto, opener: HTMLButtonElement) {
    setEditingId(word.id);
    setForm(wordToForm(word));
    setAdvancedOpen(Boolean(word.audioUrl || word.imageUrl));
    setError(null);
    setNotice(null);
    revealForm(opener);
  }

  async function saveWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const endpoint = editingId
        ? `/api/admin/topics/${topic.id}/words/${editingId}`
        : `/api/admin/topics/${topic.id}/words`;
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const wasEditing = editingId !== null;
      setNotice(wasEditing ? "Đã cập nhật từ vựng." : "Đã thêm từ mới. Các trò chơi đã dùng được từ này.");
      resetForm(Math.max(nextWordOrder, form.order + 1));
      setFormOpen(false);
      restoreFormOpenerFocus();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu từ vựng");
    } finally {
      setPending(false);
    }
  }

  async function updateWord(word: VocabularyWordDto, input: WordFormState) {
    setPending(true);
    setListError(null);
    setListNotice(null);
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}/words/${word.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setListNotice(input.isVisible ? "Đã hiển thị từ vựng." : "Đã ẩn từ vựng.");
      router.refresh();
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "Không thể cập nhật từ vựng");
    } finally {
      setPending(false);
    }
  }

  async function deleteWord(word: VocabularyWordDto) {
    if (!window.confirm(`Xóa từ “${word.term}”?`)) return;
    setPending(true);
    setListError(null);
    setListNotice(null);
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}/words/${word.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      if (editingId === word.id) closeForm();
      setListNotice("Đã xóa từ vựng.");
      requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
      router.refresh();
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "Không thể xóa từ vựng");
    } finally {
      setPending(false);
    }
  }

  function speak(word: VocabularyWordDto) {
    void playPronunciation({
      text: word.term,
      languageCode: topic.languageCode,
      audioUrl: word.audioUrl,
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl sm:size-14 sm:text-3xl">
            {topic.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {topic.isVisible ? "Đang hiển thị" : "Đang ẩn"}
            </p>
            <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl">
              {topic.title}
            </h1>
            <p className="text-sm text-muted-foreground">{words.length} từ trong chủ đề</p>
          </div>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[320px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <div className="min-w-0 min-[320px]:col-span-2 sm:w-auto">
            <VocabularyTransferActions
              endpoint={`/api/admin/topics/${topic.id}/words/transfer`}
              itemLabel="từ vựng"
            />
          </div>
          <Link
            href="/admin/topics"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 w-full min-w-0 sm:w-auto",
              !topic.isVisible && "min-[320px]:col-span-2",
            )}
          >
            <ArrowLeft className="size-4 shrink-0" />
            Chủ đề
          </Link>
          {topic.isVisible && (
            <Link
              href={`/learn/${topic.id}`}
              className={cn(buttonVariants(), "h-11 w-full min-w-0 sm:w-auto")}
            >
              Xem như người học
            </Link>
          )}
        </div>
      </div>

      {!formOpen && error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive xl:hidden">
          {error}
        </p>
      )}
      {!formOpen && notice && (
        <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 xl:hidden">
          {notice}
        </p>
      )}
      {!formOpen && (
        <Button
          id="open-word-editor"
          type="button"
          className="h-11 w-full xl:hidden"
          aria-expanded={false}
          aria-controls="word-editor-form"
          onClick={(event) => openCreateForm(event.currentTarget)}
        >
          <Plus className="size-4" />
          Thêm từ vựng
        </Button>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
        <Card
          id="word-editor-form"
          ref={formCardRef}
          className={cn(
            "h-fit min-w-0 max-w-full scroll-mt-36 xl:sticky xl:top-24 xl:scroll-mt-24",
            !formOpen && "hidden xl:block",
          )}
        >
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex min-w-0 items-center gap-2 text-lg">
                {editingId ? (
                  <Pencil className="size-5 shrink-0 text-primary" />
                ) : (
                  <Plus className="size-5 shrink-0 text-primary" />
                )}
                <span className="break-words">
                  {editingId ? "Sửa từ vựng" : "Thêm từ vựng"}
                </span>
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 shrink-0 xl:hidden"
                onClick={closeForm}
                disabled={pending}
              >
                <X className="size-4" />
                Đóng
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
            <form className="min-w-0" onSubmit={saveWord} aria-busy={pending}>
              <fieldset className="min-w-0 space-y-4 border-0 p-0" disabled={pending}>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {showJapaneseSuggestions ? (
                  <div className="min-w-0 sm:col-span-2">
                    <JapaneseWordSuggestionField
                      topicId={topic.id}
                      value={form.term}
                      disabled={pending}
                      onValueChange={(term) => {
                        setForm((current) => ({ ...current, term }));
                        setNotice(null);
                      }}
                      onApply={(detail) => {
                        setForm((current) => applyWordSuggestion(current, detail));
                        if (detail.audioUrl) setAdvancedOpen(true);
                        setError(null);
                        setNotice(
                          !detail.meaning
                            ? "Đã điền cách đọc và dữ liệu nguồn nhưng chưa dịch được nghĩa tiếng Việt. Vui lòng nhập nghĩa trước khi lưu."
                            : detail.audioUrl
                              ? "Đã tự điền cách đọc, nghĩa, ví dụ và audio. Hãy kiểm tra trước khi lưu."
                              : "Đã tự điền dữ liệu. Từ này chưa có file audio nên sẽ dùng giọng đọc trình duyệt.",
                        );
                      }}
                    />
                  </div>
                ) : (
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="word-term" className="text-sm font-medium">
                      {languageCopy.termLabel} *
                    </label>
                    <Input
                      ref={termInputRef}
                      id="word-term"
                      value={form.term}
                      onChange={(event) => setForm({ ...form, term: event.target.value })}
                      placeholder={languageCopy.termPlaceholder}
                      required
                    />
                  </div>
                )}
                <div className={cn("min-w-0 space-y-1.5", showJapaneseSuggestions && "sm:col-span-2")}>
                  <label htmlFor="word-meaning" className="text-sm font-medium">
                    Nghĩa tiếng Việt *
                  </label>
                  <Input
                    id="word-meaning"
                    value={form.meaning}
                    onChange={(event) => setForm({ ...form, meaning: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="word-pronunciation" className="text-sm font-medium">
                  {languageCopy.pronunciationLabel}
                </label>
                <Input
                  id="word-pronunciation"
                  value={form.pronunciation}
                  onChange={(event) => setForm({ ...form, pronunciation: event.target.value })}
                  placeholder={languageCopy.pronunciationPlaceholder}
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="word-example" className="text-sm font-medium">
                  {languageCopy.exampleLabel}
                </label>
                <textarea
                  id="word-example"
                  className="min-h-20 w-full min-w-0 max-w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  value={form.example}
                  onChange={(event) => setForm({ ...form, example: event.target.value })}
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="word-example-meaning" className="text-sm font-medium">
                  Nghĩa câu ví dụ
                </label>
                <textarea
                  id="word-example-meaning"
                  className="min-h-20 w-full min-w-0 max-w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  value={form.exampleMeaning}
                  onChange={(event) => setForm({ ...form, exampleMeaning: event.target.value })}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full justify-between border px-3"
                aria-expanded={advancedOpen}
                aria-controls="word-advanced-options"
                onClick={() => setAdvancedOpen((current) => !current)}
              >
                Tùy chọn nâng cao
                <ChevronDown
                  className={cn("size-4 transition-transform", advancedOpen && "rotate-180")}
                />
              </Button>
              <div
                id="word-advanced-options"
                className={cn("min-w-0 space-y-4", !advancedOpen && "hidden")}
              >
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="word-audio" className="text-sm font-medium">
                    URL âm thanh (không bắt buộc)
                  </label>
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] gap-2">
                    <Input
                      id="word-audio"
                      type="url"
                      value={form.audioUrl}
                      onChange={(event) => setForm({ ...form, audioUrl: event.target.value })}
                      placeholder={languageCopy.audioPlaceholder}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-11"
                      disabled={!form.term.trim()}
                      aria-label="Nghe thử cách phát âm"
                      title="Nghe thử"
                      onClick={() =>
                        void playPronunciation({
                          text: form.term,
                          languageCode: topic.languageCode,
                          audioUrl: form.audioUrl,
                        })
                      }
                    >
                      <Volume2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="word-image" className="text-sm font-medium">
                    URL hình ảnh (không bắt buộc)
                  </label>
                  <Input
                    id="word-image"
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="word-order" className="text-sm font-medium">
                    Thứ tự
                  </label>
                  <Input
                    id="word-order"
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(event) => setForm({ ...form, order: Number(event.target.value) })}
                  />
                </div>
                <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium min-[360px]:self-end">
                  <input
                    type="checkbox"
                    checked={form.isVisible}
                    onChange={(event) => setForm({ ...form, isVisible: event.target.checked })}
                    className="size-4 accent-[var(--primary)]"
                  />
                  Hiển thị
                </label>
              </div>
              {error && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {notice && (
                <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {notice}
                </p>
              )}
              <div className="flex flex-col gap-2 min-[360px]:flex-row">
                <Button className="h-11 w-full shrink-0 min-[360px]:w-auto min-[360px]:flex-1" disabled={pending}>
                  {pending ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm từ"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" className="h-11 w-full shrink-0 min-[360px]:w-auto" onClick={closeForm} disabled={pending}>
                    Hủy
                  </Button>
                )}
              </div>
              </fieldset>
            </form>
          </CardContent>
        </Card>

        <div ref={listRef} tabIndex={-1} aria-label="Danh sách từ vựng" className="min-w-0 space-y-3 outline-none">
          {listError && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {listError}
            </p>
          )}
          {listNotice && (
            <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {listNotice}
            </p>
          )}
          {words.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-background p-6 text-center sm:p-10">
              <p className="font-semibold">Chưa có từ vựng</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Thêm ít nhất 4 từ để trò ghép cặp hoạt động tốt.
              </p>
            </div>
          ) : (
            words.map((word) => (
              <Card
                key={word.id}
                className={cn("min-w-0 max-w-full", !word.isVisible && "opacity-60")}
              >
                <CardContent className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="min-w-0 max-w-full break-words text-lg font-bold">
                        {word.term}
                      </p>
                      {word.pronunciation && (
                        <span className="min-w-0 max-w-full break-words text-xs text-muted-foreground">
                          {word.pronunciation}
                        </span>
                      )}
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          word.isVisible
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {word.isVisible ? "Hiện" : "Ẩn"}
                      </span>
                    </div>
                    <p className="break-words text-sm font-medium text-primary">{word.meaning}</p>
                    {word.example && (
                      <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                        {word.example}
                      </p>
                    )}
                  </div>
                  <div className="grid w-full shrink-0 grid-cols-4 gap-2 sm:flex sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 w-full min-w-11 px-0 sm:w-11"
                      onClick={() => speak(word)}
                      aria-label={`Phát âm ${word.term}`}
                    >
                      <Volume2 className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 w-full min-w-11 px-0 sm:w-11"
                      onClick={(event) => editWord(word, event.currentTarget)}
                      disabled={pending}
                      aria-label={`Sửa ${word.term}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 w-full min-w-11 px-0 sm:w-11"
                      onClick={() =>
                        updateWord(word, {
                          ...wordToForm(word),
                          isVisible: !word.isVisible,
                        })
                      }
                      disabled={pending}
                      aria-label={word.isVisible ? `Ẩn ${word.term}` : `Hiện ${word.term}`}
                    >
                      {word.isVisible ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 w-full min-w-11 px-0 text-destructive hover:text-destructive sm:w-11"
                      onClick={() => deleteWord(word)}
                      disabled={pending}
                      aria-label={`Xóa ${word.term}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
