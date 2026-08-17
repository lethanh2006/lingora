import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion, ArrowRight, Clock, CheckCircle2, XCircle, Layers } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Quản lý đề thi – Admin" };

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-700",
  approved:  "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
  archived:  "bg-rose-100 text-rose-700",
};

export default async function AdminExamsPage() {
  await requireAdmin();
  const db = getAdminDb();

  const [blueprintsSnap, formVersionsSnap] = await Promise.all([
    db.collection(COLLECTIONS.examBlueprints).orderBy("__name__", "asc").get(),
    db.collection(COLLECTIONS.examFormVersions).orderBy("publishedAt", "desc").limit(20).get(),
  ]);

  const blueprints = blueprintsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || "(không tiêu đề)",
      levelId: data.levelId || "-",
      programId: data.programId || "-",
      status: data.status || "draft",
      durationSeconds: data.durationSeconds || 0,
      sectionsCount: data.sections?.length || 0,
    };
  });

  const formVersions = formVersionsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      blueprintId: data.blueprintId || "-",
      blueprintVersion: data.blueprintVersion || 1,
      status: data.status || "draft",
      questionsCount: data.orderedQuestionVersionIds?.length || 0,
      publishedAt: data.publishedAt
        ? new Timestamp(data.publishedAt.seconds, data.publishedAt.nanoseconds)
            .toDate()
            .toLocaleString("vi-VN")
        : "-",
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
          <FileQuestion className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Quản lý đề thi
          </h1>
          <p className="text-sm text-muted-foreground">
            {blueprints.length} blueprints • {formVersions.length} form versions
          </p>
        </div>
      </div>

      {/* Blueprints */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Exam Blueprints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blueprints.length === 0 ? (
            <Card className="md:col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                <FileQuestion className="size-8 mx-auto mb-3 opacity-30" />
                <p>Chưa có blueprint nào.</p>
              </CardContent>
            </Card>
          ) : (
            blueprints.map((bp) => {
              const durationMins = Math.round(bp.durationSeconds / 60);
              const statusCls = STATUS_COLORS[bp.status] || STATUS_COLORS.draft;
              return (
                <Card key={bp.id} className="hover:shadow-md transition-all border-2 border-primary/5">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">{bp.title}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{bp.id}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusCls}`}>
                        {bp.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-muted rounded font-semibold uppercase">{bp.levelId}</span>
                      <span className="px-2 py-0.5 bg-muted rounded font-semibold">{bp.programId}</span>
                      <span className="px-2 py-0.5 bg-muted rounded font-semibold">{durationMins} phút</span>
                      <span className="px-2 py-0.5 bg-muted rounded font-semibold">{bp.sectionsCount} phần</span>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3">
                      <Link
                        href={`/exams/${bp.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold"
                        target="_blank"
                      >
                        Xem trang thi <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Form Versions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Layers className="size-5 text-primary" />
          Exam Form Versions (20 gần nhất)
        </h2>
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Các phiên bản đề thi đã biên dịch
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {formVersions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Layers className="size-8 mx-auto mb-3 opacity-30" />
                <p>Chưa có form version nào.</p>
              </div>
            ) : (
              <div className="divide-y">
                {formVersions.map((fv) => {
                  const statusCls = STATUS_COLORS[fv.status] || STATUS_COLORS.draft;
                  return (
                    <div
                      key={fv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusCls}`}>
                            {fv.status}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Blueprint: <strong className="text-foreground font-mono">{fv.blueprintId}</strong>
                          </span>
                          <span className="text-xs text-muted-foreground">v{fv.blueprintVersion}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">{fv.id}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                        <span>{fv.questionsCount} câu hỏi</span>
                        <span>{fv.publishedAt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
