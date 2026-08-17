import type { Metadata } from "next";
import Link from "next/link";
import { Link2, ExternalLink, Calendar, Hash } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Source Registry – Admin" };

export default async function AdminSourcesPage() {
  await requireAdmin();
  const db = getAdminDb();

  const [sourcesSnap, attributionsSnap] = await Promise.all([
    db.collection(COLLECTIONS.contentSources).orderBy("__name__", "asc").get(),
    db.collection(COLLECTIONS.sourceAttributions).orderBy("__name__", "asc").get(),
  ]);

  const sources = sourcesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || "(không tiêu đề)",
      type: data.type || "-",
      authors: (data.authors || []).join(", ") || "-",
      publishedYear: data.publishedYear || "-",
      publisher: data.publisher || "-",
      url: data.url || null,
      licenseId: data.licenseId || null,
      createdAt: data.createdAt
        ? new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds)
            .toDate()
            .toLocaleDateString("vi-VN")
        : "-",
    };
  });

  const attributions = attributionsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      sourceId: data.sourceId || "-",
      displayText: data.displayText || "-",
      licenseText: data.licenseText || "-",
    };
  });

  const SOURCE_TYPE_COLORS: Record<string, string> = {
    book:     "bg-blue-100 text-blue-700",
    journal:  "bg-violet-100 text-violet-700",
    website:  "bg-emerald-100 text-emerald-700",
    dataset:  "bg-amber-100 text-amber-700",
    original: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
          <Link2 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Source Registry</h1>
          <p className="text-sm text-muted-foreground">
            {sources.length} nguồn tham khảo • {attributions.length} attribution records
          </p>
        </div>
      </div>

      {/* Sources List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Nguồn tham khảo (Content Sources)</h2>
        <Card>
          <CardContent className="p-0">
            {sources.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Link2 className="size-8 mx-auto mb-3 opacity-30" />
                <p>Chưa có nguồn tham khảo nào.</p>
              </div>
            ) : (
              <div className="divide-y">
                {sources.map((src) => {
                  const typeCls = SOURCE_TYPE_COLORS[src.type] || "bg-slate-100 text-slate-700";
                  return (
                    <div
                      key={src.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeCls}`}>
                            {src.type}
                          </span>
                          <h3 className="font-semibold text-foreground text-sm truncate">
                            {src.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Hash className="size-3" /> {src.id}
                          </span>
                          {src.authors !== "-" && <span>Tác giả: {src.authors}</span>}
                          {src.publisher !== "-" && <span>{src.publisher}</span>}
                          {src.publishedYear !== "-" && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" /> {src.publishedYear}
                            </span>
                          )}
                        </div>
                        {src.licenseId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            License: {src.licenseId}
                          </span>
                        )}
                      </div>
                      {src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <ExternalLink className="size-3.5" />
                          Truy cập
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attributions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Attributions (Public records)</h2>
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Các bản ghi attribution công khai (dùng hiển thị cho học viên)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {attributions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <p>Chưa có attribution record nào.</p>
              </div>
            ) : (
              <div className="divide-y">
                {attributions.map((attr) => (
                  <div key={attr.id} className="p-4 hover:bg-muted/30 transition-colors space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{attr.id}</span>
                      <span className="text-muted-foreground">→ Source:</span>
                      <span className="font-semibold font-mono text-foreground">{attr.sourceId}</span>
                    </div>
                    <p className="text-sm text-foreground">{attr.displayText}</p>
                    {attr.licenseText && (
                      <p className="text-xs text-muted-foreground italic">{attr.licenseText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
