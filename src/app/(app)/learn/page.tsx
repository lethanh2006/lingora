import type { Metadata } from "next";
import { Languages } from "lucide-react";

import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { ProgramCard } from "@/features/catalog/components/program-card";
import { createCatalogRepository } from "@/features/catalog/catalog.repository";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Chương trình học" };

export default async function LearnPage() {
  await requireUser();
  const programs = await createCatalogRepository(getAdminDb()).listPublishedPrograms();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-primary">Chương trình học</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Bạn muốn học ngôn ngữ nào?</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Chọn một lộ trình phù hợp. Trình độ và nội dung của từng chương trình được quản lý độc lập.
        </p>
      </header>

      {programs.length === 0 ? (
        <CatalogEmptyState
          icon={Languages}
          title="Chưa có chương trình sẵn sàng"
          description="Các chương trình đang được biên soạn và kiểm duyệt. Hãy quay lại sau."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {programs.map((program) => <ProgramCard key={program.id} program={program} />)}
        </div>
      )}
    </div>
  );
}
