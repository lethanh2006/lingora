import { BookOpen, Clock3, Flame } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

const stats = [
  { label: "Chuỗi ngày học", value: "0 ngày", icon: Flame },
  { label: "Bài đã hoàn thành", value: "0", icon: BookOpen },
  { label: "Thời gian học", value: "0 phút", icon: Clock3 },
];

export default async function DashboardPage() {
  const user = await requireUser();

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
