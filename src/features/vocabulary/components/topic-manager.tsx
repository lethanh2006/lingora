"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Plus, Trash2, WholeWord } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VocabularyTopicDto } from "@/features/vocabulary/schemas/vocabulary.schema";

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
  const [form, setForm] = useState<TopicFormState>({ ...emptyForm, order: topics.length });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function editTopic(topic: VocabularyTopicDto) {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, order: topics.length });
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
      setNotice(editingId ? "Đã cập nhật chủ đề. Người học sẽ thấy thay đổi ngay." : "Đã tạo chủ đề mới.");
      resetForm();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu chủ đề");
    } finally {
      setPending(false);
    }
  }

  async function toggleVisibility(topic: VocabularyTopicDto) {
    setPending(true);
    setError(null);
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
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đổi trạng thái");
    } finally {
      setPending(false);
    }
  }

  async function deleteTopic(topic: VocabularyTopicDto) {
    if (!window.confirm(`Xóa chủ đề “${topic.title}” và toàn bộ ${topic.wordCount} từ?`)) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      if (editingId === topic.id) resetForm();
      setNotice("Đã xóa chủ đề.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xóa chủ đề");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Card className="h-fit xl:sticky xl:top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {editingId ? <Pencil className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
            {editingId ? "Sửa chủ đề" : "Tạo chủ đề mới"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <label htmlFor="topic-title" className="text-sm font-medium">Tên chủ đề</label>
              <Input id="topic-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Đồ ăn tiếng Anh" required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="topic-description" className="text-sm font-medium">Mô tả ngắn</label>
              <textarea id="topic-description" className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Người học sẽ học gì trong chủ đề này?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="topic-language" className="text-sm font-medium">Ngôn ngữ</label>
                <select id="topic-language" className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.languageCode} onChange={(event) => setForm({ ...form, languageCode: event.target.value as TopicFormState["languageCode"] })}>
                  <option value="en">Tiếng Anh</option><option value="ja">Tiếng Nhật</option><option value="zh">Tiếng Trung</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="topic-icon" className="text-sm font-medium">Biểu tượng</label>
                <Input id="topic-icon" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} maxLength={16} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="topic-accent" className="text-sm font-medium">Màu</label>
                <select id="topic-accent" className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.accent} onChange={(event) => setForm({ ...form, accent: event.target.value as TopicFormState["accent"] })}>
                  <option value="emerald">Xanh lá</option><option value="blue">Xanh dương</option><option value="violet">Tím</option><option value="amber">Vàng</option><option value="rose">Hồng</option><option value="cyan">Xanh ngọc</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="topic-order" className="text-sm font-medium">Thứ tự</label>
                <Input id="topic-order" type="number" min={0} value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} />
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium">
              <input type="checkbox" checked={form.isVisible} onChange={(event) => setForm({ ...form, isVisible: event.target.checked })} className="size-4 accent-[var(--primary)]" />
              Hiển thị cho người học
            </label>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
            <div className="flex gap-2">
              <Button className="flex-1" disabled={pending}>{pending ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo chủ đề"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Hủy</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {topics.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-background p-10 text-center">
            <p className="font-semibold">Chưa có chủ đề</p>
            <p className="mt-1 text-sm text-muted-foreground">Dùng biểu mẫu bên cạnh để tạo chủ đề đầu tiên.</p>
          </div>
        ) : topics.map((topic) => (
          <Card key={topic.id} className={!topic.isVisible ? "opacity-70" : undefined}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-3xl">{topic.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-bold">{topic.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${topic.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{topic.isVisible ? "Đang hiển thị" : "Đang ẩn"}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{topic.description || "Chưa có mô tả"}</p>
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary"><WholeWord className="size-3.5" /> {topic.wordCount} từ đang hiển thị</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={`/admin/topics/${topic.id}`} className={buttonVariants({ size: "sm" })}>Quản lý từ</Link>
                <Button size="sm" variant="outline" onClick={() => editTopic(topic)} disabled={pending} aria-label={`Sửa ${topic.title}`}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => toggleVisibility(topic)} disabled={pending} aria-label={topic.isVisible ? `Ẩn ${topic.title}` : `Hiện ${topic.title}`}>{topic.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteTopic(topic)} disabled={pending} aria-label={`Xóa ${topic.title}`}><Trash2 className="size-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
