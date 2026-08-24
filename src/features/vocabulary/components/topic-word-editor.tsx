"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Trash2, Volume2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { playPronunciation } from "@/features/vocabulary/components/pronunciation-player";
import type {
  VocabularyTopicDto,
  VocabularyWordDto,
} from "@/features/vocabulary/schemas/vocabulary.schema";

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
  const [form, setForm] = useState<WordFormState>(() => emptyWord(words.length));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setForm(emptyWord(words.length));
  }

  function editWord(word: VocabularyWordDto) {
    setEditingId(word.id);
    setForm(wordToForm(word));
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      setNotice(editingId ? "Đã cập nhật từ vựng." : "Đã thêm từ mới. Các trò chơi đã dùng được từ này.");
      resetForm();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu từ vựng");
    } finally {
      setPending(false);
    }
  }

  async function updateWord(word: VocabularyWordDto, input: WordFormState) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}/words/${word.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(await responseError(response));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật từ vựng");
    } finally {
      setPending(false);
    }
  }

  async function deleteWord(word: VocabularyWordDto) {
    if (!window.confirm(`Xóa từ “${word.term}”?`)) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}/words/${word.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      if (editingId === word.id) resetForm();
      setNotice("Đã xóa từ vựng.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xóa từ vựng");
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-3xl">{topic.icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{topic.isVisible ? "Đang hiển thị" : "Đang ẩn"}</p>
            <h1 className="text-2xl font-bold tracking-tight">{topic.title}</h1>
            <p className="text-sm text-muted-foreground">{words.length} từ trong chủ đề</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/topics" className={buttonVariants({ variant: "outline" })}><ArrowLeft className="size-4" /> Chủ đề</Link>
          {topic.isVisible && <Link href={`/learn/${topic.id}`} className={buttonVariants()}>Xem như người học</Link>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {editingId ? <Pencil className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
              {editingId ? "Sửa từ vựng" : "Thêm từ vựng"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveWord}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label htmlFor="word-term" className="text-sm font-medium">Từ / cụm từ *</label><Input id="word-term" value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} required /></div>
                <div className="space-y-1.5"><label htmlFor="word-meaning" className="text-sm font-medium">Nghĩa tiếng Việt *</label><Input id="word-meaning" value={form.meaning} onChange={(event) => setForm({ ...form, meaning: event.target.value })} required /></div>
              </div>
              <div className="space-y-1.5"><label htmlFor="word-pronunciation" className="text-sm font-medium">Phiên âm</label><Input id="word-pronunciation" value={form.pronunciation} onChange={(event) => setForm({ ...form, pronunciation: event.target.value })} placeholder="Ví dụ: /həˈləʊ/ hoặc nǐ hǎo" /></div>
              <div className="space-y-1.5"><label htmlFor="word-example" className="text-sm font-medium">Câu ví dụ</label><textarea id="word-example" className="min-h-20 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" value={form.example} onChange={(event) => setForm({ ...form, example: event.target.value })} /></div>
              <div className="space-y-1.5"><label htmlFor="word-example-meaning" className="text-sm font-medium">Nghĩa câu ví dụ</label><textarea id="word-example-meaning" className="min-h-20 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" value={form.exampleMeaning} onChange={(event) => setForm({ ...form, exampleMeaning: event.target.value })} /></div>
              <div className="space-y-1.5"><label htmlFor="word-audio" className="text-sm font-medium">URL âm thanh (không bắt buộc)</label><Input id="word-audio" type="url" value={form.audioUrl} onChange={(event) => setForm({ ...form, audioUrl: event.target.value })} placeholder="Sẽ tự điền khi chọn gợi ý tiếng Nhật" /></div>
              <div className="space-y-1.5"><label htmlFor="word-image" className="text-sm font-medium">URL hình ảnh (không bắt buộc)</label><Input id="word-image" type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label htmlFor="word-order" className="text-sm font-medium">Thứ tự</label><Input id="word-order" type="number" min={0} value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} /></div>
                <label className="mt-6 flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium"><input type="checkbox" checked={form.isVisible} onChange={(event) => setForm({ ...form, isVisible: event.target.checked })} className="size-4 accent-[var(--primary)]" /> Hiển thị</label>
              </div>
              {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              {notice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
              <div className="flex gap-2"><Button className="flex-1" disabled={pending}>{pending ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm từ"}</Button>{editingId && <Button type="button" variant="outline" onClick={resetForm}>Hủy</Button>}</div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {words.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-background p-10 text-center"><p className="font-semibold">Chưa có từ vựng</p><p className="mt-1 text-sm text-muted-foreground">Thêm ít nhất 4 từ để trò ghép cặp hoạt động tốt.</p></div>
          ) : words.map((word) => (
            <Card key={word.id} className={!word.isVisible ? "opacity-60" : undefined}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="text-lg font-bold">{word.term}</p>{word.pronunciation && <span className="text-xs text-muted-foreground">{word.pronunciation}</span>}<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${word.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{word.isVisible ? "Hiện" : "Ẩn"}</span></div>
                  <p className="text-sm font-medium text-primary">{word.meaning}</p>
                  {word.example && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{word.example}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => speak(word)} aria-label={`Phát âm ${word.term}`}><Volume2 className="size-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => editWord(word)} aria-label={`Sửa ${word.term}`}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => updateWord(word, { ...wordToForm(word), isVisible: !word.isVisible })} disabled={pending} aria-label={word.isVisible ? `Ẩn ${word.term}` : `Hiện ${word.term}`}>{word.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteWord(word)} disabled={pending} aria-label={`Xóa ${word.term}`}><Trash2 className="size-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
