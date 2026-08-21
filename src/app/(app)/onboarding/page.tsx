import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";

export default async function OnboardingPage() {
  await requireUser();
  redirect("/learn");
}
