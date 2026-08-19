import type { Metadata } from "next";
import { Link2 } from "lucide-react";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { SourceManager } from "@/features/content/components/source-manager";

export const metadata: Metadata = { title: "Source Registry – Admin" };

export default async function AdminSourcesPage() {
  await requireAdmin();
  const db = getAdminDb();

  const sourcesSnap = await db
    .collection(COLLECTIONS.contentSources)
    .orderBy("__name__", "asc")
    .get();

  const sources = sourcesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || "",
      publisher: data.publisher || "",
      canonicalUrl: data.canonicalUrl || "",
      licenseCode: data.licenseCode || "",
      licenseUrl: data.licenseUrl || "",
      attributionText: data.attributionText || "",
    };
  });

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
            Quản lý nguồn tài liệu tham khảo và ghi nhận bản quyền (Attribution)
          </p>
        </div>
      </div>

      <SourceManager initialSources={sources} />
    </div>
  );
}
