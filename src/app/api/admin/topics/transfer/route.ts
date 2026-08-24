import { ZodError, z } from "zod";

import { vocabularyTopicInputSchema } from "@/features/vocabulary/schemas/vocabulary.schema";
import {
  MAX_TOPIC_IMPORT_ROWS,
  VocabularyImportError,
  createVocabularyImportService,
} from "@/features/vocabulary/vocabulary-import.service";
import {
  CsvError,
  parseVocabularyTopicsCsv,
  serializeVocabularyTopicsCsv,
} from "@/features/vocabulary/vocabulary-csv";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { writeAuditLog } from "@/lib/audit-log";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasValidOrigin, jsonError } from "@/lib/http";

const MAX_FILE_BYTES = 1_000_000;
const modeSchema = z.enum(["preview", "apply"]);

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

function importError(error: unknown) {
  if (error instanceof CsvError || error instanceof VocabularyImportError) {
    return jsonError(error.message, 400);
  }
  if (error instanceof ZodError) return jsonError("Dữ liệu chủ đề trong CSV không hợp lệ", 400);
  if (error instanceof SyntaxError) return jsonError("Không đọc được tệp CSV", 400);
  return null;
}

async function parseImportRequest(request: Request) {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_FILE_BYTES) {
    throw new VocabularyImportError("Tệp CSV không được vượt quá 1 MB");
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new VocabularyImportError("Vui lòng chọn một tệp CSV");
  if (file.size > MAX_FILE_BYTES) {
    throw new VocabularyImportError("Tệp CSV không được vượt quá 1 MB");
  }
  const mode = modeSchema.parse(formData.get("mode"));
  const inputs = vocabularyTopicInputSchema.array().max(MAX_TOPIC_IMPORT_ROWS).parse(
    parseVocabularyTopicsCsv(await file.text()),
  );
  if (inputs.length === 0) throw new VocabularyImportError("Tệp CSV chưa có chủ đề nào");
  return { mode, inputs };
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return jsonError("Forbidden", 403);
  const topics = await createVocabularyRepository(getAdminDb()).listTopics({ includeHidden: true });
  const csv = serializeVocabularyTopicsCsv(
    topics.map((topic) => ({
      title: topic.title,
      description: topic.description,
      languageCode: topic.languageCode,
      icon: topic.icon,
      accent: topic.accent,
      order: topic.order,
      isVisible: topic.isVisible,
    })),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="lingora-topics-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid origin", 403);
  const user = await requireAdmin();
  if (!user) return jsonError("Forbidden", 403);

  try {
    const { mode, inputs } = await parseImportRequest(request);
    const db = getAdminDb();
    const service = createVocabularyImportService(db);
    const summary = mode === "preview"
      ? await service.previewTopics(inputs)
      : await service.importTopics(inputs);
    if (mode === "apply") {
      void writeAuditLog(db, {
        actorUid: user.uid,
        action: "import_vocabulary_topics",
        entityType: "vocabularyTopics",
        entityId: "bulk",
        metadata: summary,
      });
    }
    return Response.json({ mode, summary });
  } catch (error) {
    const response = importError(error);
    if (response) return response;
    console.error("Failed to import vocabulary topics", error);
    return jsonError("Không thể import chủ đề", 500);
  }
}
