"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Plus, Trash2, WholeWord, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VocabularyTopicDto } from "@/features/vocabulary/schemas/vocabulary.schema";
import { cn } from "@/lib/utils";

type TopicFormState = Pick<
  VocabularyTopicDto,
  "title" | "description" | "languageCode" | "icon" | "accent" | "order" | "isVisible"
>;

const emptyForm: TopicFormState = {
  title: "",
  description: "",
  languageCode: "en",
  icon: "📚",
  accent: "emerald",
  order: 0,
  isVisible: true,
};

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : "Không thể lưu thay đổi";
}

export function TopicManager({ topics }: { topics: VocabularyTopicDto[] }) {
  const router = useRouter();
  const nextTopicOrder = topics.reduce(
    (nextOrder, topic) => Math.max(nextOrder, topic.order + 1),
    0,
  );
  const [form, setForm] = useState<TopicFormState>({ ...emptyForm, order: nextTopicOrder });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listNotice, setListNotice] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(topics.length === 0);
  const formCardRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const formOpenerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function resetForm(order = nextTopicOrder) {
    setEditingId(null);
    setForm({ ...emptyForm, order });
  }

  function revealForm(opener: HTMLButtonElement) {
    formOpenerRef.current = opener;
    setFormOpen(true);
    requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      titleInputRef.current?.focus({ preventScroll: true });
    });
  }

  function openCreateForm(opener: HTMLButtonElement) {
    resetForm();
    setError(null);
    setNotice(null);
    revealForm(opener);
  }

  function restoreFormOpenerFocus() {
    requestAnimationFrame(() => {
      if (formOpenerRef.current?.isConnected) {
        formOpenerRef.current.focus();
        return;
      }
      document.querySelector<HTMLButtonElement>("#open-topic-editor")?.focus();
    });
  }

  function closeForm() {
    resetForm();
    setError(null);
    setNotice(null);
    setFormOpen(false);
    restoreFormOpenerFocus();
  }

  function editTopic(topic: VocabularyTopicDto, opener: HTMLButtonElement) {
    setEditingId(topic.id);
    setForm({
      title: topic.title,
      description: topic.description,
      languageCode: topic.languageCode,
      icon: topic.icon,
      accent: topic.accent,
      order: topic.order,
      isVisible: topic.isVisible,
    });
    setNotice(null);
    setError(null);
    revealForm(opener);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(editingId ? `/api/admin/topics/${editingId}` : "/api/admin/topics", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const wasEditing = editingId !== null;
      setNotice(wasEditing ? "Đã cập nhật chủ đề. Người học sẽ thấy thay đổi ngay." : "Đã tạo chủ đề mới.");
      resetForm(Math.max(nextTopicOrder, form.order + 1));
      setFormOpen(false);
      restoreFormOpenerFocus();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu chủ đề");
    } finally {
      setPending(false);
    }
  }

  async function toggleVisibility(topic: VocabularyTopicDto) {
    setPending(true);
    setListError(null);
    setListNotice(null);
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.title,
          description: topic.description,
          languageCode: topic.languageCode,
          icon: topic.icon,
          accent: topic.accent,
          order: topic.order,
          isVisible: !topic.isVisible,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setListNotice(topic.isVisible ? "Đã ẩn chủ đề." : "Đã hiển thị chủ đề.");
      router.refresh();
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "Không thể đổi trạng thái");
    } finally {
      setPending(false);
    }
  }

  async function deleteTopic(topic: VocabularyTopicDto) {
    if (!window.confirm(`Xóa chủ đề “${topic.title}” và toàn bộ ${topic.wordCount} từ?`)) return;
    setPending(true);
    setListError(null);
    setListNotice(null);
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      if (editingId === topic.id) {
        resetForm();
        setFormOpen(false);
      }
      setListNotice("Đã xóa chủ đề.");
      requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
      router.refresh();
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "Không thể xóa chủ đề");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {!formOpen && (
        <Button
          id="open-topic-editor"
          type="button"
          className="h-11 w-full xl:hidden"
          aria-expanded={false}
          aria-controls="topic-editor-form"
          onClick={(event) => openCreateForm(event.currentTarget)}
        >
          <Plus className="size-4" />
          Tạo chủ đề mới
        </Button>
      )}

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

      <Card
        id="topic-editor-form"
        ref={formCardRef}
        className={cn(
          "h-fit min-w-0 max-w-full scroll-mt-36 xl:sticky xl:top-24 xl:scroll-mt-24",
          !formOpen && "hidden xl:block",
        )}
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex min-w-0 items-center gap-2 text-lg">
              {editingId ? <Pencil className="size-5 shrink-0 text-primary" /> : <Plus className="size-5 shrink-0 text-primary" />}
              <span className="break-words">{editingId ? "Sửa chủ đề" : "Tạo chủ đề mới"}</span>
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" className="h-11 shrink-0 xl:hidden" onClick={closeForm} disabled={pending}>
              <X className="size-4" />
              Đóng
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
          <form className="min-w-0" onSubmit={submit} aria-busy={pending}>
            <fieldset className="min-w-0 space-y-4 border-0 p-0" disabled={pending}>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="topic-title" className="text-sm font-medium">Tên chủ đề</label>
              <Input ref={titleInputRef} id="topic-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Đồ ăn tiếng Anh" required />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="topic-description" className="text-sm font-medium">Mô tả ngắn</label>
              <textarea id="topic-description" className="min-h-24 w-full max-w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Người học sẽ học gì trong chủ đề này?" />
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="topic-language" className="text-sm font-medium">Ngôn ngữ</label>
                <select id="topic-language" className="h-11 w-full min-w-0 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" value={form.languageCode} onChange={(event) => setForm({ ...form, languageCode: event.target.value as TopicFormState["languageCode"] })}>
                  <option value="en">Tiếng Anh</option><option value="ja">Tiếng Nhật</option><option value="zh">Tiếng Trung</option>
                </select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="topic-icon" className="text-sm font-medium">Biểu tượng</label>
                <Input id="topic-icon" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} maxLength={16} />
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="topic-accent" className="text-sm font-medium">Màu</label>
                <select id="topic-accent" className="h-11 w-full min-w-0 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" value={form.accent} onChange={(event) => setForm({ ...form, accent: event.target.value as TopicFormState["accent"] })}>
                  <option value="emerald">Xanh lá</option><option value="blue">Xanh dương</option><option value="violet">Tím</option><option value="amber">Vàng</option><option value="rose">Hồng</option><option value="cyan">Xanh ngọc</option>
                </select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="topic-order" className="text-sm font-medium">Thứ tự</label>
                <Input id="topic-order" type="number" min={0} value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} />
              </div>
            </div>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border p-3 text-sm font-medium">
              <input type="checkbox" checked={form.isVisible} onChange={(event) => setForm({ ...form, isVisible: event.target.checked })} className="size-4 accent-[var(--primary)]" />
              Hiển thị cho người học
            </label>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
            <div className="flex gap-2">
              <Button className="h-11 flex-1" disabled={pending}>{pending ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo chủ đề"}</Button>
              {editingId && <Button type="button" variant="outline" className="h-11" onClick={closeForm} disabled={pending}>Hủy</Button>}
            </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>

      <div ref={listRef} tabIndex={-1} aria-label="Danh sách chủ đề" className="min-w-0 space-y-4 outline-none">
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
        {topics.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-background p-10 text-center">
            <p className="font-semibold">Chưa có chủ đề</p>
            <p className="mt-1 text-sm text-muted-foreground">Mở biểu mẫu để tạo chủ đề đầu tiên.</p>
          </div>
        ) : topics.map((topic) => (
          <Card key={topic.id} className={cn("min-w-0 max-w-full", !topic.isVisible && "opacity-70")}>
            <CardContent className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-muted text-2xl sm:size-14 sm:text-3xl">{topic.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="min-w-0 max-w-full break-words font-bold">{topic.title}</h2>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${topic.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{topic.isVisible ? "Đang hiển thị" : "Đang ẩn"}</span>
                </div>
                <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{topic.description || "Chưa có mô tả"}</p>
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary"><WholeWord className="size-3.5" /> {topic.wordCount} từ đang hiển thị</p>
              </div>
              <div className="grid w-full min-w-0 grid-cols-3 gap-2 lg:flex lg:w-auto lg:shrink-0 lg:flex-wrap">
                <Link href={`/admin/topics/${topic.id}`} className={cn(buttonVariants({ size: "sm" }), "col-span-3 h-11 w-full lg:col-span-1 lg:w-auto")}>Quản lý từ</Link>
                <Button className="h-11 w-full min-w-11 lg:w-11 lg:px-0" size="sm" variant="outline" onClick={(event) => editTopic(topic, event.currentTarget)} disabled={pending} aria-label={`Sửa ${topic.title}`}><Pencil className="size-4" /></Button>
                <Button className="h-11 w-full min-w-11 lg:w-11 lg:px-0" size="sm" variant="outline" onClick={() => toggleVisibility(topic)} disabled={pending} aria-label={topic.isVisible ? `Ẩn ${topic.title}` : `Hiện ${topic.title}`}>{topic.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
                <Button size="sm" variant="outline" className="h-11 w-full min-w-11 text-destructive hover:text-destructive lg:w-11 lg:px-0" onClick={() => deleteTopic(topic)} disabled={pending} aria-label={`Xóa ${topic.title}`}><Trash2 className="size-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
