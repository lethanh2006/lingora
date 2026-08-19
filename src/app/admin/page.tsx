import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  HelpCircle,
  FileQuestion,
  Link2,
  ClipboardList,
  BookOpen,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin CMS – Lingora" };

export default async function AdminPage() {
  const user = await requireAdmin();
  const db = getAdminDb();

  // Fetch counts in parallel
  const [
    questionsSnap,
    blueprintsSnap,
    formVersionsSnap,
    sourcesSnap,
    auditSnap,
    lessonsSnap,
  ] = await Promise.all([
    db.collection(COLLECTIONS.questions).count().get(),
    db.collection(COLLECTIONS.examBlueprints).count().get(),
    db.collection(COLLECTIONS.examFormVersions).count().get(),
    db.collection(COLLECTIONS.contentSources).count().get(),
    db.collection(COLLECTIONS.auditLogs).orderBy("createdAt", "desc").limit(5).get(),
    db.collection(COLLECTIONS.contentLessons).count().get(),
  ]);

  const recentLogs = auditSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      action: data.action || "unknown",
      resourceType: data.entityType || "-",
      resourceId: data.entityId || "-",
      actorUid: data.actorUid || "-",
      createdAt: data.createdAt
        ? new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds)
            .toDate()
            .toLocaleString("vi-VN")
        : "-",
    };
  });

  const stats = [
    {
      label: "Câu hỏi",
      value: questionsSnap.data().count,
      icon: HelpCircle,
      href: "/admin/questions",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Đề thi (Blueprints)",
      value: blueprintsSnap.data().count,
      icon: FileQuestion,
      href: "/admin/exams",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Form Versions",
      value: formVersionsSnap.data().count,
      icon: Activity,
      href: "/admin/exams",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Bài học",
      value: lessonsSnap.data().count,
      icon: BookOpen,
      href: "/admin/content",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Nguồn tham khảo",
      value: sourcesSnap.data().count,
      icon: Link2,
      href: "/admin/sources",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Admin CMS Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Đăng nhập với <strong>{user.email}</strong>
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className={`size-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/admin/questions", label: "Ngân hàng câu hỏi", desc: "Xem và tạo câu hỏi mới", icon: HelpCircle },
          { href: "/admin/exams", label: "Quản lý đề thi", desc: "Blueprint & Form versions", icon: FileQuestion },
          { href: "/admin/sources", label: "Source Registry", desc: "Quản lý nguồn tham khảo", icon: Link2 },
          { href: "/admin/audit-logs", label: "Audit Logs", desc: "Nhật ký hoạt động hệ thống", icon: ClipboardList },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <item.icon className="size-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              Hoạt động gần đây
            </CardTitle>
            <Link
              href="/admin/audit-logs"
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="size-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Chưa có hoạt động nào được ghi nhận.
            </p>
          ) : (
            <div className="divide-y">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded text-foreground font-semibold">
                      {log.action}
                    </span>{" "}
                    <span className="text-muted-foreground">trên</span>{" "}
                    <span className="font-semibold text-foreground">
                      {log.resourceType}/{log.resourceId}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">{log.createdAt}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
