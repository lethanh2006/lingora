import { ZodError, z } from "zod";

import { stableIdSchema } from "@/features/content/schemas/content.schema";
import { vocabularyWordInputSchema } from "@/features/vocabulary/schemas/vocabulary.schema";
import {
  MAX_WORD_IMPORT_ROWS,
  VocabularyImportError,
  createVocabularyImportService,
} from "@/features/vocabulary/vocabulary-import.service";
import {
  CsvError,
  parseVocabularyWordsCsv,
  serializeVocabularyWordsCsv,
} from "@/features/vocabulary/vocabulary-csv";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { writeAuditLog } from "@/lib/audit-log";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

const MAX_FILE_BYTES = 2_000_000;
const modeSchema = z.enum(["preview", "apply"]);

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

async function parseTopicId(params: Promise<{ topicId: string }>) {
  return stableIdSchema.parse((await params).topicId);
}

function importError(error: unknown) {
  if (error instanceof CsvError || error instanceof VocabularyImportError) {
    return jsonError(error.message, 400);
  }
  if (error instanceof ZodError) return jsonError("Dữ liệu từ vựng trong CSV không hợp lệ", 400);
  if (error instanceof SyntaxError) return jsonError("Không đọc được tệp CSV", 400);
  return null;
}

async function parseImportRequest(request: Request) {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_FILE_BYTES) {
    throw new VocabularyImportError("Tệp CSV không được vượt quá 2 MB");
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new VocabularyImportError("Vui lòng chọn một tệp CSV");
  if (file.size > MAX_FILE_BYTES) {
    throw new VocabularyImportError("Tệp CSV không được vượt quá 2 MB");
  }
  const mode = modeSchema.parse(formData.get("mode"));
  const inputs = vocabularyWordInputSchema.array().max(MAX_WORD_IMPORT_ROWS).parse(
    parseVocabularyWordsCsv(await file.text()),
  );
  if (inputs.length === 0) throw new VocabularyImportError("Tệp CSV chưa có từ vựng nào");
  return { mode, inputs };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const user = await requireAdmin();
  if (!user) return jsonError("Forbidden", 403);
  try {
    const topicId = await parseTopicId(params);
    const repository = createVocabularyRepository(getAdminDb());
    const [topic, words] = await Promise.all([
      repository.getTopic(topicId, { includeHidden: true }),
      repository.listWords(topicId, { includeHidden: true }),
    ]);
    if (!topic) return jsonError("Không tìm thấy chủ đề", 404);
    const csv = serializeVocabularyWordsCsv(words.map((word) => ({
      term: word.term,
      meaning: word.meaning,
      pronunciation: word.pronunciation ?? "",
      example: word.example ?? "",
      exampleMeaning: word.exampleMeaning ?? "",
      audioUrl: word.audioUrl ?? "",
      imageUrl: word.imageUrl ?? "",
      order: word.order,
      isVisible: word.isVisible,
    })));
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="lingora-words-${topic.id}-${date}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) return jsonError("ID chủ đề không hợp lệ", 400);
    console.error("Failed to export vocabulary words", error);
    return jsonError("Không thể export từ vựng", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await requireAdmin();
  if (!user) return jsonError("Forbidden", 403);

  try {
    const topicId = await parseTopicId(params);
    const { mode, inputs } = await parseImportRequest(request);
    const db = getAdminDb();
    const service = createVocabularyImportService(db);
    const summary = mode === "preview"
      ? await service.previewWords(topicId, inputs)
      : await service.importWords(topicId, inputs);
    if (!summary) return jsonError("Không tìm thấy chủ đề", 404);
    if (mode === "apply") {
      void writeAuditLog(db, {
        actorUid: user.uid,
        action: "import_vocabulary_words",
        entityType: "vocabularyTopic",
        entityId: topicId,
        metadata: summary,
      });
    }
    return Response.json({ mode, summary });
  } catch (error) {
    const response = importError(error);
    if (response) return response;
    console.error("Failed to import vocabulary words", error);
    return jsonError("Không thể import từ vựng", 500);
  }
}
