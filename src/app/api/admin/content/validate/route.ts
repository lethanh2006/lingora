import { ZodError } from "zod";

import { createValidationService } from "@/features/content/services/validation-service";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { stableIdSchema } from "@/features/content/schemas/content.schema";

const MAX_REQUEST_BYTES = 1_024;

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request body too large", 413);
    }

    const payload = JSON.parse(body);
    const lessonId = stableIdSchema.parse(payload.lessonId);

    const result = await createValidationService(getAdminDb()).validateLesson(lessonId);

    return Response.json({ ok: true, errors: result.errors, warnings: result.warnings });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request payload", 400);
    }

    console.error("Failed to validate content", error);
    return jsonError("Internal Server Error", 500);
  }
}
