import type { Metadata } from "next";
import { ClipboardList, Filter } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Audit Logs – Admin" };

const ACTION_COLORS: Record<string, string> = {
  publish_lesson:  "bg-emerald-100 text-emerald-800",
  publish_course:  "bg-blue-100 text-blue-800",
  rollback_course: "bg-amber-100 text-amber-800",
  validate:        "bg-slate-100 text-slate-800",
  upload_media:    "bg-violet-100 text-violet-800",
  start_attempt:   "bg-cyan-100 text-cyan-800",
  submit_attempt:  "bg-rose-100 text-rose-800",
};

export default async function AdminAuditLogsPage() {
  await requireAdmin();
  const db = getAdminDb();

  const logsSnap = await db
    .collection(COLLECTIONS.auditLogs)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const logs = logsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      action: data.action || "unknown",
      resourceType: data.resourceType || "-",
      resourceId: data.resourceId || "-",
      actorUid: data.actorUid || "system",
      actorEmail: data.actorEmail || null,
      metadata: data.metadata || null,
      success: data.success !== false,
      errorMessage: data.errorMessage || null,
      createdAt: data.createdAt
        ? new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds)
            .toDate()
            .toLocaleString("vi-VN")
        : "-",
    };
  });

  // Count by action type
  const actionCounts: Record<string, number> = {};
  for (const log of logs) {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <ClipboardList className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            {logs.length} bản ghi gần nhất
          </p>
        </div>
      </div>

      {/* Action type summary */}
      {Object.keys(actionCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mr-1">
            <Filter className="size-3.5" />
            Loại hành động:
          </span>
          {Object.entries(actionCounts).map(([action, count]) => {
            const cls = ACTION_COLORS[action] || "bg-slate-100 text-slate-700";
            return (
              <span key={action} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>
                <span>{action}</span>
                <span className="font-extrabold">{count}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Log table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nhật ký hoạt động (100 mục gần nhất)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <ClipboardList className="size-10 mx-auto mb-3 opacity-30" />
              <p>Chưa có hoạt động nào được ghi nhận.</p>
              <p className="text-xs mt-1">Các hành động publish, validate, submit sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const actionCls = ACTION_COLORS[log.action] || "bg-slate-100 text-slate-700";
                return (
                  <div
                    key={log.id}
                    className={`p-4 hover:bg-muted/30 transition-colors space-y-2 ${!log.success ? "bg-rose-50/30" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Action badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${actionCls}`}>
                        {log.action}
                      </span>
                      {/* Success indicator */}
                      {!log.success && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 uppercase">
                          FAILED
                        </span>
                      )}
                      {/* Resource */}
                      <span className="text-sm text-muted-foreground">
                        {log.resourceType}{" "}
                        <span className="font-mono text-foreground font-semibold">{log.resourceId}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>
                          Người thực hiện:{" "}
                          <strong className="text-foreground font-mono">
                            {log.actorEmail || log.actorUid}
                          </strong>
                        </span>
                        {log.errorMessage && (
                          <span className="text-rose-600 font-semibold">
                            Lỗi: {log.errorMessage}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0">{log.createdAt}</span>
                    </div>

                    {/* Metadata preview */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-semibold">
                          Chi tiết metadata
                        </summary>
                        <pre className="mt-2 p-2 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
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
