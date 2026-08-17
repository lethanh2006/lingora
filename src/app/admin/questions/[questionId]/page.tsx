import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import {
  ArrowLeft,
  HelpCircle,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  Tag,
  Target,
  BarChart2,
  ShieldCheck,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { questionSchema, questionVersionSchema } from "@/features/assessment/schemas/assessment.schema";

export const metadata: Metadata = { title: "Chi tiết câu hỏi – Admin" };

interface QuestionDetailPageProps {
  params: Promise<{ questionId: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-700",
  approved:  "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
  archived:  "bg-rose-100 text-rose-700",
};

export default async function AdminQuestionDetailPage({ params }: QuestionDetailPageProps) {
  await requireAdmin();
  const { questionId } = await params;
  const db = getAdminDb();

  const questionSnap = await db.collection(COLLECTIONS.questions).doc(questionId).get();
  if (!questionSnap.exists) notFound();

  let question;
  try {
    question = questionSchema.parse(questionSnap.data());
  } catch {
    notFound();
  }

  // Fetch all versions of this question
  const versionsSnap = await db
    .collection(COLLECTIONS.questionVersions)
    .where("questionId", "==", questionId)
    .orderBy("version", "desc")
    .get();

  const versions: Array<Record<string, any> & { id: string; createdAtStr: string }> =
    versionsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAtStr: data.createdAt
          ? new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds)
              .toDate()
              .toLocaleString("vi-VN")
          : "-",
      };
    });

  const latestVersion = versions[0] as (Record<string, any> & { id: string; createdAtStr: string }) | undefined;


  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/questions"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách câu hỏi
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
          <HelpCircle className="size-6" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-foreground">Câu hỏi: {questionId}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[question.status] || STATUS_COLORS.draft}`}>
              {question.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            Latest version: <strong>{question.latestVersionId}</strong>
          </p>
        </div>
      </div>

      {/* Latest Version Card */}
      {latestVersion && (
        <Card className="border-2 border-primary/5 shadow-sm">
          <CardHeader className="border-b bg-muted/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">
                Phiên bản hiện tại — v{latestVersion.version}
              </CardTitle>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[latestVersion.status] || STATUS_COLORS.draft}`}>
                {latestVersion.status}
              </span>
            </div>
            <CardDescription>ID: {latestVersion.id}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {[
                { label: "Skill", value: latestVersion.skill, icon: Target },
                { label: "Loại tương tác", value: latestVersion.interactionType, icon: HelpCircle },
                { label: "Độ khó", value: latestVersion.difficulty, icon: BarChart2 },
                { label: "Level", value: latestVersion.levelId?.toUpperCase(), icon: BookOpen },
                { label: "Program", value: latestVersion.programId, icon: Tag },
                { label: "Section Type", value: latestVersion.sectionType, icon: ShieldCheck },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="p-3 rounded-xl bg-muted/30 border space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <Icon className="size-3.5" />
                    {label}
                  </div>
                  <div className="font-bold text-foreground font-mono text-xs">{value || "-"}</div>
                </div>
              ))}
            </div>

            {/* Prompt blocks */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Câu hỏi (Prompt Blocks)
              </h3>
              <div className="space-y-2">
                {(latestVersion.promptBlocks || []).map((block: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border text-sm">
                    <span className="text-xs font-bold text-muted-foreground uppercase mr-2">[{block.type}]</span>
                    {block.content}
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            {latestVersion.options?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Các lựa chọn
                </h3>
                <div className="space-y-2">
                  {latestVersion.options.map((opt: any) => {
                    const scoringDef = latestVersion.scoringDefinition;
                    let isCorrect = false;
                    if (scoringDef?.correctOptionId === opt.id) isCorrect = true;
                    if (scoringDef?.correctOptionIds?.includes(opt.id)) isCorrect = true;
                    if (scoringDef?.correctTokenIds?.includes(opt.id)) isCorrect = true;

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                          isCorrect
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-card text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{opt.id}</span>
                          <span>{opt.text}</span>
                        </div>
                        {isCorrect && (
                          <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                            ĐÁP ÁN ĐÚNG
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scoring Definition (raw) */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Scoring Definition
              </h3>
              <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto">
                {JSON.stringify(latestVersion.scoringDefinition, null, 2)}
              </pre>
            </div>

            {/* Explanation */}
            {latestVersion.explanation && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Giải thích
                </h3>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-900">
                  {latestVersion.explanation}
                </div>
              </div>
            )}

            {/* Topics & Objectives */}
            <div className="grid grid-cols-2 gap-4">
              {latestVersion.topicIds?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Topics</h3>
                  <div className="flex flex-wrap gap-1">
                    {latestVersion.topicIds.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {latestVersion.objectiveIds?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Objectives</h3>
                  <div className="flex flex-wrap gap-1">
                    {latestVersion.objectiveIds.map((o: string) => (
                      <span key={o} className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{o}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      {versions.length > 1 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Lịch sử phiên bản ({versions.length} phiên bản)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {versions.map((ver, idx) => (
                <div key={ver.id} className="flex items-center justify-between p-4 text-sm">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">v{ver.version}</span>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          LATEST
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[ver.status] || STATUS_COLORS.draft}`}>
                        {ver.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{ver.id}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{ver.createdAtStr}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
