import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { createAssessmentRepository } from "@/features/assessment/assessment.repository.ts";
import { createAttemptService } from "@/features/assessment/services/attempt.service.ts";

const startAttemptInputSchema = z.object({
  blueprintId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  try {
    const body = await request.text();
    const { blueprintId } = startAttemptInputSchema.parse(JSON.parse(body));

    const db = getAdminDb();
    const assessmentRepository = createAssessmentRepository(db);
    const blueprint = await assessmentRepository.getPublishedBlueprint(blueprintId);
    if (!blueprint) return jsonError("Published blueprint not found", 404);

    const formVersion = await assessmentRepository.getLatestPublishedFormVersion(blueprintId);
    if (!formVersion) {
      return jsonError("No published exam form versions found for this blueprint", 404);
    }

    const blueprintVersion = formVersion.blueprintVersion;

    const attemptService = createAttemptService(db);
    const { attempt, formVersion: finalFormVersion } = await attemptService.startAttempt(
      user.uid,
      blueprint,
      blueprintVersion
    );

    return Response.json({ attempt, formVersion: finalFormVersion });
  } catch (error) {
    console.error("Failed to start exam attempt", error);
    return jsonError("Unable to start exam attempt", 500);
  }
}
