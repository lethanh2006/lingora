import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Plus, Eye, ExternalLink, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ngân hàng câu hỏi – Admin" };

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  draft:    { label: "Draft",    cls: "bg-slate-100 text-slate-700",  icon: Clock },
  approved: { label: "Approved", cls: "bg-blue-100 text-blue-700",    icon: CheckCircle2 },
  published:{ label: "Published",cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  archived: { label: "Archived", cls: "bg-rose-100 text-rose-700",    icon: XCircle },
};

export default async function AdminQuestionsPage() {
  await requireAdmin();
  const db = getAdminDb();

  const questionsSnap = await db
    .collection(COLLECTIONS.questions)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const questionVersionsSnap = await db
    .collection(COLLECTIONS.questionVersions)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  // Build a lookup of latest question versions by questionId
  const latestVersionByQuestionId: Record<string, any> = {};
  for (const doc of questionVersionsSnap.docs) {
    const data = doc.data();
    const qId = data.questionId;
    if (!latestVersionByQuestionId[qId]) {
      latestVersionByQuestionId[qId] = { id: doc.id, ...data };
    }
  }

  const questions = questionsSnap.docs.map((doc) => {
    const data = doc.data();
    const latestVersion = latestVersionByQuestionId[doc.id];
    return {
      id: doc.id,
      status: data.status || "draft",
      latestVersionId: data.latestVersionId,
      createdAt: data.createdAt
        ? new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds)
            .toDate()
            .toLocaleDateString("vi-VN")
        : "-",
      // from version
      skill: latestVersion?.skill || "-",
      interactionType: latestVersion?.interactionType || "-",
      difficulty: latestVersion?.difficulty || "-",
      levelId: latestVersion?.levelId || "-",
      promptPreview: latestVersion?.promptBlocks?.[0]?.content?.slice(0, 80) || "(chưa có nội dung)",
    };
  });

  // Aggregate by interaction type
  const interactionCounts: Record<string, number> = {};
  for (const q of questions) {
    interactionCounts[q.interactionType] = (interactionCounts[q.interactionType] || 0) + 1;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <HelpCircle className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Ngân hàng câu hỏi
            </h1>
            <p className="text-sm text-muted-foreground">{questions.length} câu hỏi</p>
          </div>
        </div>
        {/* Future: Add new question button would go here */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground italic">Thêm câu hỏi qua seed script</span>
        </div>
      </div>

      {/* Type summary chips */}
      {Object.keys(interactionCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(interactionCounts).map(([type, count]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-semibold"
            >
              <span className="font-mono">{type}</span>
              <span className="font-bold">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Questions Table */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            <HelpCircle className="size-10 mx-auto mb-3 opacity-30" />
            <p>Chưa có câu hỏi nào trong ngân hàng.</p>
            <p className="mt-1 text-xs">Hãy chạy seed script để thêm câu hỏi mẫu.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Danh sách câu hỏi (50 gần nhất)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {questions.map((q) => {
                const statusCfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
                return (
                  <div
                    key={q.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusCfg.cls}`}>
                          <statusCfg.icon className="size-3" />
                          {statusCfg.label}
                        </span>
                        {/* Meta chips */}
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-semibold text-slate-700">
                          {q.interactionType}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-semibold text-slate-700">
                          {q.skill}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-semibold text-slate-700 uppercase">
                          {q.levelId} / {q.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-medium truncate">{q.promptPreview}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        ID: {q.id} • Tạo: {q.createdAt}
                      </p>
                    </div>

                    {/* Actions */}
                    <Link
                      href={`/admin/questions/${q.id}`}
                      className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      <Eye className="size-3.5" />
                      Chi tiết
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
