import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "@/lib/firebase/collections";
import { createCatalogRepository } from "@/features/catalog/catalog.repository";
import { OnboardingWizard } from "@/features/enrollment/components/onboarding-wizard";

export const metadata: Metadata = { title: "Thiết lập học tập – Lingora" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const db = getAdminDb();

  // Check if user already has any active enrollment — if so, go straight to dashboard
  const existingEnrollmentsSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection(USER_SUBCOLLECTIONS.enrollments)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!existingEnrollmentsSnap.empty) {
    redirect("/dashboard");
  }

  // Fetch all published programs for the wizard
  const repository = createCatalogRepository(db);
  const programs = await repository.listPublishedPrograms();

  const wizardPrograms = programs.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    languageId: p.languageId,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/30 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-foreground">Lingora</span>
        </div>
      </header>

      {/* Wizard Container */}
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <OnboardingWizard programs={wizardPrograms} />
        </div>
      </div>
    </div>
  );
}
