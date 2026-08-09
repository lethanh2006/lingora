import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Quản trị" };

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck /></span>
        <div><p className="text-sm text-muted-foreground">Đăng nhập với {user.email}</p><h1 className="text-3xl font-bold tracking-tight">Khu vực quản trị</h1></div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Admin foundation đã sẵn sàng</CardTitle>
          <CardDescription>Các công cụ quản lý courses, lessons và nội dung sẽ được thêm sau base.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
