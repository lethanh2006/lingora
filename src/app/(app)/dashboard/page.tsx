import { Brain, Flame, Gamepad2, Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopicCard } from "@/features/vocabulary/components/topic-card";
import { createVocabularyProgressService, getVietnamDateId } from "@/features/vocabulary/vocabulary-progress.service";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { calculatePracticeStreak } from "@/features/vocabulary/vocabulary-stats";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getAdminDb();
  const progressService = createVocabularyProgressService(db);
  const [topics, progressItems, practiceDays] = await Promise.all([
    createVocabularyRepository(db).listTopics(),
    progressService.listProgress(user.uid),
    progressService.listActivePracticeDateIds(user.uid),
  ]);
  const progressByTopic = new Map(progressItems.map((progress) => [progress.topicId, progress]));
  const masteredWordIds = new Set(progressItems.flatMap((progress) => progress.masteredWordIds));
  const sessionsCompleted = progressItems.reduce((total, progress) => total + progress.sessionsCompleted, 0);
  const streak = calculatePracticeStreak(practiceDays, getVietnamDateId());
  const hasProgress = sessionsCompleted > 0;

  const stats = [
    { label: "Chuỗi ngày luyện", value: `${streak} ngày`, icon: Flame },
    { label: "Từ đã ghi nhớ", value: String(masteredWordIds.size), icon: Brain },
    { label: "Phiên đã luyện", value: String(sessionsCompleted), icon: Gamepad2 },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-primary">Trang chủ</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Xin chào, {user.displayName}</h1>
        <p className="mt-2 text-muted-foreground">Mỗi ngày một chủ đề, mỗi phiên vài từ mới.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 to-background">
        <CardContent className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Sparkles className="size-6" /></span>
            <div>
              <h2 className="text-xl font-bold">{hasProgress ? "Tiếp tục luyện từ" : "Bắt đầu từ con số 0"}</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                {hasProgress ? "Chọn chủ đề bên dưới hoặc đổi trò chơi để củng cố các từ đã gặp." : "Tài khoản mới chưa có dữ liệu hoàn thành sẵn. Chọn một chủ đề và bắt đầu bằng trò lật thẻ."}
              </p>
            </div>
          </div>
          <Link href={topics[0] ? `/learn/${topics[0].id}` : "/learn"} className={buttonVariants({ size: "lg" })}>{hasProgress ? "Học tiếp" : "Chọn chủ đề"}</Link>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-primary">Học theo chủ đề</p><h2 className="mt-1 text-2xl font-bold">Chủ đề dành cho bạn</h2></div>
          <Link href="/learn" className="text-sm font-semibold text-primary hover:underline">Xem tất cả</Link>
        </div>
        {topics.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-background p-10 text-center"><p className="font-semibold">Chưa có chủ đề đang hiển thị</p><p className="mt-1 text-sm text-muted-foreground">Quản trị viên có thể tạo chủ đề trong trang quản trị.</p>{user.role === "admin" && <Link href="/admin/topics" className={`${buttonVariants()} mt-4`}>Tạo chủ đề</Link>}</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">{topics.slice(0, 6).map((topic) => <TopicCard key={topic.id} topic={topic} progress={progressByTopic.get(topic.id)} />)}</div>
        )}
      </section>
    </div>
  );
}
