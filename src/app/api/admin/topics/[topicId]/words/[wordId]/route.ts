import { ZodError } from "zod";

import { documentIdSchema, stableIdSchema } from "@/features/content/schemas/content.schema";
import { vocabularyWordInputSchema } from "@/features/vocabulary/schemas/vocabulary.schema";
import { createVocabularyAdminService } from "@/features/vocabulary/vocabulary-admin.service";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

async function requireAdminRequest(request: Request) {
  if (!hasValidOrigin(request)) return false;
  const user = await getCurrentUser();
  return user?.role === "admin";
}

async function parseIds(params: Promise<{ topicId: string; wordId: string }>) {
  const raw = await params;
  return {
    topicId: stableIdSchema.parse(raw.topicId),
    wordId: documentIdSchema.parse(raw.wordId),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ topicId: string; wordId: string }> },
) {
  if (!(await requireAdminRequest(request))) return jsonError("Forbidden", 403);

  try {
    const { topicId, wordId } = await parseIds(params);
    const input = vocabularyWordInputSchema.parse(await request.json());
    const word = await createVocabularyAdminService(getAdminDb()).updateWord(topicId, wordId, input);
    if (!word) return jsonError("Không tìm thấy từ vựng", 404);
    return Response.json({ word });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Dữ liệu từ vựng không hợp lệ", 400);
    }
    console.error("Failed to update vocabulary word", error);
    return jsonError("Không thể cập nhật từ vựng", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ topicId: string; wordId: string }> },
) {
  if (!(await requireAdminRequest(request))) return jsonError("Forbidden", 403);

  try {
    const { topicId, wordId } = await parseIds(params);
    const deleted = await createVocabularyAdminService(getAdminDb()).deleteWord(topicId, wordId);
    if (!deleted) return jsonError("Không tìm thấy từ vựng", 404);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return jsonError("ID từ vựng không hợp lệ", 400);
    console.error("Failed to delete vocabulary word", error);
    return jsonError("Không thể xóa từ vựng", 500);
  }
}
