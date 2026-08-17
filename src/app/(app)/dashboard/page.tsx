import { AggregateField, Timestamp } from "firebase-admin/firestore";
import { BookOpen, Clock3, Flame, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Sort dates descending
  const sortedDates = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Get today and yesterday date strings in GMT+7
  const tzOffset = 7 * 60 * 60 * 1000;
  const todayStr = new Date(Date.now() + tzOffset).toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() + tzOffset - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const newestDateStr = sortedDates[0];
  if (newestDateStr !== todayStr && newestDateStr !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  // Start checking from the newest date in sortedDates
  const checkDate = new Date(newestDateStr);

  while (true) {
    const checkStr = checkDate.toISOString().split("T")[0];
    if (dates.includes(checkStr)) {
      streak++;
      // Subtract 1 day
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getAdminDb();

  // Fetch student progress using aggregation to avoid document scanning
  const progressColl = db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection("lessonProgress");

  const completedCountSnap = await progressColl
    .where("status", "==", "completed")
    .count()
    .get();

  const completedLessons = completedCountSnap.data().count;

  const timeSumSnap = await progressColl
    .aggregate({
      totalTime: AggregateField.sum("timeSpentSeconds"),
    })
    .get();

  const totalTimeSpentSeconds = timeSumSnap.data().totalTime || 0;

  const totalTimeSpentMinutes = Math.round(totalTimeSpentSeconds / 60);

  // Fetch daily stats to compute streak
  const dailyStatsSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection("dailyStats")
    .get();

  const dates = dailyStatsSnap.docs.map((doc) => doc.id);
  const streak = calculateStreak(dates);

  // Fetch active enrollment to support the continue-learning card
  const enrollmentsSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection("enrollments")
    .where("status", "==", "active")
    .limit(1)
    .get();

  let activeEnrollment = null;
  let activeProgram = null;

  if (enrollmentsSnap.empty) {
    // First time user — send to onboarding
    redirect("/onboarding");
  }

  if (!enrollmentsSnap.empty) {
    const doc = enrollmentsSnap.docs[0];
    activeEnrollment = { id: doc.id, ...doc.data() } as any;
    const programSnap = await db
      .collection(COLLECTIONS.programs)
      .doc(activeEnrollment.programId)
      .get();
    if (programSnap.exists) {
      activeProgram = { id: programSnap.id, ...programSnap.data() } as any;
    }
  }

  // Fetch due reviews count using cheap aggregate count query
  const now = Timestamp.now();
  const dueCountSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection("reviewItems")
    .where("dueAt", "<=", now)
    .count()
    .get();
  const dueReviewsCount = dueCountSnap.data().count;

  const stats = [
    { label: "Chuỗi ngày học", value: `${streak} ngày`, icon: Flame },
    { label: "Bài đã hoàn thành", value: String(completedLessons), icon: BookOpen },
    { label: "Thời gian học", value: `${totalTimeSpentMinutes} phút`, icon: Clock3 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Xin chào, {user.displayName}</h1>
        <p className="mt-2 text-muted-foreground">Sẵn sàng cho buổi học đầu tiên của bạn.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Due reviews notification card */}
        {dueReviewsCount > 0 ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="size-5" />
                Đến hạn ôn tập
              </CardTitle>
              <CardDescription>
                Bạn đang có <strong className="text-foreground">{dueReviewsCount} từ vựng</strong> cần ôn tập lại theo phương pháp lặp lại ngắt quãng (SRS).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/review" className={buttonVariants()}>
                Ôn tập ngay
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-500" />
                Đã ôn tập xong
              </CardTitle>
              <CardDescription>
                Tất cả từ vựng đều được ghi nhớ tốt. Hôm nay bạn không có từ nào đến hạn cần ôn tập.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/review" className={buttonVariants({ variant: "outline" })}>
                Xem danh sách từ
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Continue Learning card */}
        {activeEnrollment && activeProgram ? (
          <Card>
            <CardHeader>
              <CardTitle>Tiếp tục học tập</CardTitle>
              <CardDescription>
                Tiếp tục tiến trình của bạn trong chương trình{" "}
                <strong className="text-foreground">{activeProgram.title}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={
                  activeEnrollment.currentCourseId
                    ? `/learn/${activeEnrollment.programId}/courses/${activeEnrollment.currentCourseId}`
                    : `/learn/${activeEnrollment.programId}`
                }
                className={buttonVariants()}
              >
                Học tiếp
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Bắt đầu lộ trình đầu tiên</CardTitle>
              <CardDescription>
                Khám phá chương trình và chọn khóa học phù hợp với mục tiêu của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/learn" className={buttonVariants()}>
                Xem chương trình học
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
