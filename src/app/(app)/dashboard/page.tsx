import { BookOpen, Clock3, Flame } from "lucide-react";
import Link from "next/link";

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

  // Fetch student progress
  const progressSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection("lessonProgress")
    .get();

  let completedLessons = 0;
  let totalTimeSpentSeconds = 0;

  progressSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.status === "completed") {
      completedLessons++;
    }
    totalTimeSpentSeconds += data.timeSpentSeconds || 0;
  });

  const totalTimeSpentMinutes = Math.round(totalTimeSpentSeconds / 60);

  // Fetch daily stats to compute streak
  const dailyStatsSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection("dailyStats")
    .get();

  const dates = dailyStatsSnap.docs.map((doc) => doc.id);
  const streak = calculateStreak(dates);

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
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bắt đầu lộ trình đầu tiên</CardTitle>
          <CardDescription>Khám phá chương trình và chọn khóa học phù hợp với mục tiêu của bạn.</CardDescription>
        </CardHeader>
        <CardContent><Link href="/learn" className={buttonVariants()}>Xem chương trình học</Link></CardContent>
      </Card>
    </div>
  );
}
