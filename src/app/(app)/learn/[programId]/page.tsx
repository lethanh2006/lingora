import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Blocks, GalleryHorizontalEnd, TextCursorInput } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpeakButton } from "@/features/vocabulary/components/speak-button";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

const games = [
  { mode: "flashcards", title: "Lật thẻ", description: "Nhìn từ, đoán nghĩa rồi lật thẻ để kiểm tra.", icon: GalleryHorizontalEnd },
  { mode: "matching", title: "Ghép từ", description: "Ghép mỗi từ với nghĩa tiếng Việt tương ứng.", icon: Blocks },
  { mode: "fill", title: "Điền từ", description: "Nhìn nghĩa và chủ động gõ lại từ cần nhớ.", icon: TextCursorInput },
] as const;

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  await requireUser();
  const { programId: topicId } = await params;
  const repository = createVocabularyRepository(getAdminDb());
  const [topic, words] = await Promise.all([repository.getTopic(topicId), repository.listWords(topicId)]);
  if (!topic) notFound();

  return (
    <div className="space-y-8">
      <header>
        <Link href="/learn" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Tất cả chủ đề</Link>
        <div className="mt-4 flex items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 text-4xl">{topic.icon}</span>
          <div><p className="text-sm font-semibold text-primary">{topic.wordCount} từ vựng</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{topic.title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{topic.description}</p></div>
        </div>
      </header>

      {words.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-background p-10 text-center"><p className="font-semibold">Chủ đề chưa có từ vựng</p><p className="mt-1 text-sm text-muted-foreground">Hãy quay lại sau khi quản trị viên thêm nội dung.</p></div>
      ) : (
        <>
          <section className="space-y-4"><div><p className="text-sm font-semibold text-primary">Chọn cách luyện</p><h2 className="mt-1 text-2xl font-bold">Ba trò chơi từ cùng danh sách từ</h2></div><div className="grid gap-4 md:grid-cols-3">{games.map(({ mode, title, description, icon: Icon }) => <Card key={mode} className="group transition hover:border-primary/30 hover:shadow-md"><CardHeader><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><CardTitle className="pt-3 text-lg">{title}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="min-h-10 text-sm text-muted-foreground">{description}</p><Link href={`/learn/${topic.id}/practice/${mode}`} className={`${buttonVariants()} w-full`}>Bắt đầu</Link></CardContent></Card>)}</div></section>

          <section className="space-y-4"><div><p className="text-sm font-semibold text-primary">Danh sách từ</p><h2 className="mt-1 text-2xl font-bold">Xem trước nội dung</h2></div><div className="grid gap-3 sm:grid-cols-2">{words.map((word, index) => <Card key={word.id}><CardContent className="flex items-start gap-3 p-4"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-1"><p className="text-lg font-bold">{word.term}</p><SpeakButton text={word.term} languageCode={topic.languageCode} /></div>{word.pronunciation && <p className="text-xs text-muted-foreground">{word.pronunciation}</p>}<p className="mt-1 text-sm font-semibold text-primary">{word.meaning}</p>{word.example && <p className="mt-2 text-xs leading-5 text-muted-foreground">{word.example}</p>}</div></CardContent></Card>)}</div></section>
        </>
      )}
    </div>
  );
}
