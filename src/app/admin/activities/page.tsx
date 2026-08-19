import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus, Edit3 } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Quản lý Hoạt động – Admin" };

export default async function AdminActivitiesPage() {
  await requireAdmin();
  const db = getAdminDb();

  const activitiesSnap = await db
    .collection(COLLECTIONS.contentActivities)
    .orderBy("updatedAt", "desc")
    .limit(200)
    .get();

  const activities = activitiesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type || "-",
      instruction: data.instruction || "",
      skill: data.skill || "-",
      difficulty: data.difficulty || "-",
      required: data.required !== false,
      updatedAt: data.updatedAt
        ? new Timestamp(data.updatedAt.seconds, data.updatedAt.nanoseconds)
            .toDate()
            .toLocaleDateString("vi-VN")
        : "-",
    };
  });

  const TYPE_COLORS: Record<string, string> = {
    explanation:      "bg-emerald-100 text-emerald-800",
    vocabulary_card:  "bg-blue-100 text-blue-800",
    single_choice:    "bg-indigo-100 text-indigo-800",
    gap_fill:         "bg-amber-100 text-amber-800",
    reorder_tokens:   "bg-pink-100 text-pink-800",
    listening_choice: "bg-violet-100 text-violet-800",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Layers className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Quản lý Hoạt động (Activities)
            </h1>
            <p className="text-sm text-muted-foreground">
              {activities.length} hoạt động tương tác trong kho học liệu.
            </p>
          </div>
        </div>
        <Link href="/admin/activities/new">
          <Button className="flex items-center gap-1.5 shadow-sm">
            <Plus className="size-4" />
            Tạo hoạt động mới
          </Button>
        </Link>
      </div>

      {/* Activities List */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Danh sách Hoạt động soạn thảo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Layers className="size-10 mx-auto mb-3 opacity-30" />
              <p>Chưa có hoạt động nào.</p>
              <p className="text-xs mt-1">Nhấn "Tạo hoạt động mới" để bắt đầu thiết kế.</p>
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((act) => {
                const typeCls = TYPE_COLORS[act.type] || "bg-slate-100 text-slate-800";
                return (
                  <div
                    key={act.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${typeCls}`}>
                          {act.type}
                        </span>
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {act.instruction}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="font-mono text-foreground font-semibold">
                          ID: {act.id}
                        </span>
                        <span>
                          Kỹ năng: <strong className="text-foreground uppercase">{act.skill}</strong>
                        </span>
                        <span>
                          Độ khó: <strong className="text-foreground uppercase">{act.difficulty}</strong>
                        </span>
                        {act.required && (
                          <span className="text-rose-600 font-semibold">Bắt buộc</span>
                        )}
                        <span>Cập nhật: {act.updatedAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/admin/activities/${act.id}/edit`}>
                        <Button variant="outline" size="sm" className="h-8">
                          <Edit3 className="size-3.5 mr-1" />
                          Sửa
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
