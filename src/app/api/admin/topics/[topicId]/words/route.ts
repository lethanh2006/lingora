import { ZodError } from "zod";

import { stableIdSchema } from "@/features/content/schemas/content.schema";
import { vocabularyWordInputSchema } from "@/features/vocabulary/schemas/vocabulary.schema";
import { createVocabularyAdminService } from "@/features/vocabulary/vocabulary-admin.service";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const { topicId: rawTopicId } = await params;
    const topicId = stableIdSchema.parse(rawTopicId);
    const input = vocabularyWordInputSchema.parse(await request.json());
    const word = await createVocabularyAdminService(getAdminDb()).createWord(topicId, input);
    if (!word) return jsonError("Không tìm thấy chủ đề", 404);
    return Response.json({ word }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Dữ liệu từ vựng không hợp lệ", 400);
    }
    console.error("Failed to create vocabulary word", error);
    return jsonError("Không thể thêm từ vựng", 500);
  }
}
