import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { createAttemptService } from "@/features/assessment/services/attempt.service.ts";

const saveSectionAnswersInputSchema = z.object({
  answers: z.record(z.string(), z.any()),
  clientRevision: z.number().int().nonnegative(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ attemptId: string; sectionId: string }> }
) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  const { attemptId, sectionId } = await params;

  try {
    const body = await request.text();
    const { answers, clientRevision } = saveSectionAnswersInputSchema.parse(JSON.parse(body));

    const db = getAdminDb();
    const attemptService = createAttemptService(db);
    const updatedSection = await attemptService.saveSectionAnswers(
      user.uid,
      attemptId,
      sectionId,
      answers,
      clientRevision
    );

    return Response.json({ ok: true, section: updatedSection });
  } catch (error: any) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request payload", 400);
    }
    if (
      error.message?.includes("expired") ||
      error.message?.includes("finalized") ||
      error.message?.includes("conflict")
    ) {
      return jsonError(error.message, 409); // Conflict / Precondition failed
    }

    console.error("Failed to save section answers", error);
    return jsonError("Unable to save section answers", 500);
  }
}
