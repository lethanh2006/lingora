import { ZodError } from "zod";

import { practiceSessionInputSchema } from "@/features/vocabulary/schemas/vocabulary.schema";
import { createVocabularyProgressService } from "@/features/vocabulary/vocabulary-progress.service";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

const MAX_REQUEST_BYTES = 24 * 1_024;

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthenticated", 401);

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Dữ liệu phiên luyện quá lớn", 413);
    }
    const input = practiceSessionInputSchema.parse(JSON.parse(body));
    const db = getAdminDb();
    const repository = createVocabularyRepository(db);
    const [topic, words] = await Promise.all([
      repository.getTopic(input.topicId),
      repository.listWords(input.topicId),
    ]);
    if (!topic) return jsonError("Chủ đề không tồn tại hoặc đang bị ẩn", 404);

    const allowedWordIds = new Set(words.map((word) => word.id));
    if (input.studiedWordIds.some((wordId) => !allowedWordIds.has(wordId))) {
      return jsonError("Phiên luyện chứa từ không thuộc chủ đề", 400);
    }
    if (input.totalAnswers < input.studiedWordIds.length) {
      return jsonError("Tổng số lượt trả lời không hợp lệ", 400);
    }

    const progress = await createVocabularyProgressService(db).recordSession(user.uid, input);
    return Response.json({ ok: true, progress });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonError("Dữ liệu phiên luyện không hợp lệ", 400);
    }
    console.error("Failed to record vocabulary practice", error);
    return jsonError("Không thể lưu kết quả luyện tập", 500);
  }
}
