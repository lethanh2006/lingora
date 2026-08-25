import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, LibraryBig, Plus, Users, WholeWord } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quản trị từ vựng – Lingora" };

export default async function AdminPage() {
  const user = await requireAdmin();
  const db = getAdminDb();
  const [topics, wordsCount, usersCount] = await Promise.all([
    createVocabularyRepository(db).listTopics({ includeHidden: true }),
    db.collection(COLLECTIONS.vocabularyWords).count().get(),
    db.collection(COLLECTIONS.users).count().get(),
  ]);
  const visibleTopics = topics.filter((topic) => topic.isVisible);

  const stats = [
    { label: "Chủ đề đang hiển thị", value: visibleTopics.length, icon: LibraryBig },
    { label: "Tổng số từ", value: wordsCount.data().count, icon: WholeWord },
    { label: "Người dùng", value: usersCount.data().count, icon: Users },
  ];

  return (
    <div className="min-w-0 space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Quản trị nội dung</p>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">Xin chào, {user.displayName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Quản lý đúng hai thứ: chủ đề và từ vựng. Không cần biên dịch, duyệt hay xuất bản.
          </p>
        </div>
        <Link href="/admin/topics" className={buttonVariants({ size: "lg" })}>
          <Plus className="size-4" />
          Thêm chủ đề
        </Link>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="min-w-0">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex-col items-start gap-2 space-y-0 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between">
            <CardTitle className="text-lg">Chủ đề gần đây</CardTitle>
            <Link href="/admin/topics" className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/5 hover:underline">
              Quản lý tất cả <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {topics.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <p className="font-semibold">Chưa có chủ đề nào</p>
                <p className="mt-1 text-sm text-muted-foreground">Tạo chủ đề đầu tiên rồi thêm từ vựng vào đó.</p>
              </div>
            ) : (
              <div className="divide-y">
                {topics.slice(0, 6).map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/admin/topics/${topic.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition hover:text-primary"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">{topic.icon}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{topic.title}</p>
                        <p className="text-xs text-muted-foreground">{topic.wordCount} từ · {topic.isVisible ? "Đang hiển thị" : "Đang ẩn"}</p>
                      </div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-primary/20 bg-primary/5">
          <CardHeader>
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Eye className="size-5" />
            </span>
            <CardTitle className="pt-3 text-lg">Lưu là hiển thị</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Mọi chủ đề và từ đang bật “Hiển thị” dùng chung dữ liệu với giao diện người học.</p>
            <Link href="/learn" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
              Xem giao diện học
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
