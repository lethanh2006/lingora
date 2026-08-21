import { ZodError } from "zod";

import {
  vocabularyTopicInputSchema,
} from "@/features/vocabulary/schemas/vocabulary.schema";
import { stableIdSchema } from "@/features/content/schemas/content.schema";
import { createVocabularyAdminService } from "@/features/vocabulary/vocabulary-admin.service";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

async function requireAdminRequest(request: Request) {
  if (!hasValidOrigin(request)) return false;
  const user = await getCurrentUser();
  return user?.role === "admin";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  if (!(await requireAdminRequest(request))) return jsonError("Forbidden", 403);

  try {
    const { topicId: rawTopicId } = await params;
    const topicId = stableIdSchema.parse(rawTopicId);
    const input = vocabularyTopicInputSchema.parse(await request.json());
    const topic = await createVocabularyAdminService(getAdminDb()).updateTopic(topicId, input);
    if (!topic) return jsonError("Không tìm thấy chủ đề", 404);
    return Response.json({ topic });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Dữ liệu chủ đề không hợp lệ", 400);
    }
    console.error("Failed to update vocabulary topic", error);
    return jsonError("Không thể cập nhật chủ đề", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  if (!(await requireAdminRequest(request))) return jsonError("Forbidden", 403);

  try {
    const { topicId: rawTopicId } = await params;
    const topicId = stableIdSchema.parse(rawTopicId);
    const deleted = await createVocabularyAdminService(getAdminDb()).deleteTopic(topicId);
    if (!deleted) return jsonError("Không tìm thấy chủ đề", 404);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return jsonError("ID chủ đề không hợp lệ", 400);
    console.error("Failed to delete vocabulary topic", error);
    return jsonError("Không thể xóa chủ đề", 500);
  }
}
