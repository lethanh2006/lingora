import { ZodError } from "zod";

import { vocabularyTopicInputSchema } from "@/features/vocabulary/schemas/vocabulary.schema";
import { createVocabularyAdminService } from "@/features/vocabulary/vocabulary-admin.service";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const input = vocabularyTopicInputSchema.parse(await request.json());
    const topic = await createVocabularyAdminService(getAdminDb()).createTopic(input);
    return Response.json({ topic }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Dữ liệu chủ đề không hợp lệ", 400);
    }
    console.error("Failed to create vocabulary topic", error);
    return jsonError("Không thể tạo chủ đề", 500);
  }
}
