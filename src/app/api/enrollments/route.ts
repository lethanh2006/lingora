import { ZodError } from "zod";

import {
  createEnrollmentInputSchema,
} from "@/features/enrollment/schemas/enrollment.schema";
import {
  createEnrollmentService,
  EnrollmentProgramUnavailableError,
} from "@/features/enrollment/enrollment.service";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

const MAX_REQUEST_BYTES = 1_024;

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request body too large", 413);
    }

    const input = createEnrollmentInputSchema.parse(JSON.parse(body));
    const result = await createEnrollmentService(getAdminDb()).enroll(
      user.uid,
      input.programId,
    );
    return Response.json({ ok: true, created: result.created });
  } catch (error) {
    if (error instanceof EnrollmentProgramUnavailableError) {
      return jsonError("Program unavailable", 404);
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid enrollment request", 400);
    }

    console.error("Failed to create enrollment", error);
    return jsonError("Unable to create enrollment", 500);
  }
}
