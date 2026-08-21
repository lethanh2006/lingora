import Link from "next/link";
import { Blocks, GalleryHorizontalEnd, Gamepad2, TextCursorInput } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

const modes = [
  { id: "flashcards", label: "Lật thẻ", icon: GalleryHorizontalEnd },
  { id: "matching", label: "Ghép từ", icon: Blocks },
  { id: "fill", label: "Điền từ", icon: TextCursorInput },
] as const;

export default async function PracticeHubPage() {
  await requireUser();
  const topics = await createVocabularyRepository(getAdminDb()).listTopics();

  return (
    <div className="space-y-8">
      <header><p className="text-sm font-semibold text-primary">Luyện tập</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Chọn chủ đề và trò chơi</h1><p className="mt-2 max-w-2xl text-muted-foreground">Không cần đề thi hay khóa học. Chọn cách bạn muốn ghi nhớ từ hôm nay.</p></header>
      {topics.length === 0 ? <div className="rounded-2xl border border-dashed bg-background p-10 text-center"><Gamepad2 className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">Chưa có chủ đề để luyện</p></div> : <div className="space-y-4">{topics.map((topic) => <Card key={topic.id}><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-3xl">{topic.icon}</span><div className="min-w-0 flex-1"><h2 className="font-bold">{topic.title}</h2><p className="mt-1 text-sm text-muted-foreground">{topic.wordCount} từ · {topic.description}</p></div><div className="grid grid-cols-3 gap-2">{modes.map(({ id, label, icon: Icon }) => <Link key={id} href={`/learn/${topic.id}/practice/${id}`} className={buttonVariants({ variant: id === "flashcards" ? "default" : "outline", size: "sm" })}><Icon className="size-4" /><span className="hidden sm:inline">{label}</span></Link>)}</div></CardContent></Card>)}</div>}
    </div>
  );
}
