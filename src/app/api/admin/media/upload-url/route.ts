import { z, ZodError } from "zod";
import { createMediaService } from "@/features/content/services/media-service";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";
import { documentIdSchema } from "@/features/content/schemas/content.schema";

const uploadUrlRequestSchema = z
  .object({
    id: documentIdSchema,
    fileName: z.string().trim().min(1).max(255),
    contentType: z.string().regex(/^(audio|image)\/[a-z0-9.+-]+$/),
    sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    contentId: documentIdSchema,
  })
  .strict();

const MAX_REQUEST_BYTES = 2_048;

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request body too large", 413);
    }

    const payload = uploadUrlRequestSchema.parse(JSON.parse(body));
    const mediaService = createMediaService(getAdminDb(), getAdminStorage());

    const result = await mediaService.generateUploadUrl(payload);

    return Response.json({
      ok: true,
      uploadUrl: result.uploadUrl,
      storagePath: result.storagePath,
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request payload", 400);
    }

    console.error("Failed to generate upload URL", error);
    return jsonError("Internal Server Error", 500);
  }
}
