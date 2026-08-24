import { ZodError } from "zod";

import { stableIdSchema } from "../../../../../../features/content/schemas/content.schema.ts";
import {
  WordSuggestionServiceError,
  type JapaneseWordSuggestionService,
} from "../../../../../../features/vocabulary/japanese-word-suggestion.service.ts";
import {
  wordSuggestionDetailInputSchema,
  wordSuggestionSearchInputSchema,
} from "../../../../../../features/vocabulary/schemas/word-suggestion.schema.ts";

type RouteContext = {
  params: Promise<{ topicId: string }>;
};

type AdminUser = {
  role: string;
};

type VocabularyTopic = {
  languageCode: string;
};

export type WordSuggestionRouteDependencies = {
  getCurrentUser: () => Promise<AdminUser | null>;
  getTopic: (topicId: string) => Promise<VocabularyTopic | null>;
  service: Pick<JapaneseWordSuggestionService, "search" | "getDetail">;
  logError?: (message: string, error: unknown) => void;
};

function jsonNoStore(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function jsonRouteError(message: string, status: number, code?: string): Response {
  return jsonNoStore(
    {
      error: message,
      ...(code ? { code } : {}),
    },
    status,
  );
}

function hasValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function serviceErrorResponse(
  error: unknown,
  logError: (message: string, error: unknown) => void,
): Response {
  if (error instanceof WordSuggestionServiceError) {
    if (error.code === "word_not_found") {
      return jsonRouteError(error.message, 404, error.code);
    }
    logError("Japanese word suggestion upstream failed", error);
    return jsonRouteError(error.message, 502, error.code);
  }

  if (error instanceof ZodError) {
    logError("Japanese word suggestion returned invalid data", error);
    return jsonRouteError(
      "Dịch vụ gợi ý trả về dữ liệu không hợp lệ.",
      502,
      "invalid_upstream_response",
    );
  }

  logError("Japanese word suggestion request failed", error);
  return jsonRouteError("Không thể lấy gợi ý từ vựng.", 500, "internal_error");
}

export function createWordSuggestionRouteHandlers(
  dependencies: WordSuggestionRouteDependencies,
) {
  const logError = dependencies.logError ?? console.error;

  async function requireAdmin(): Promise<Response | null> {
    try {
      const user = await dependencies.getCurrentUser();
      return user?.role === "admin"
        ? null
        : jsonRouteError("Forbidden", 403, "forbidden");
    } catch (error) {
      logError("Failed to authenticate word suggestion request", error);
      return jsonRouteError("Không thể xác thực tài khoản.", 500, "internal_error");
    }
  }

  async function parseTopicId(context: RouteContext): Promise<string | Response> {
    try {
      return stableIdSchema.parse((await context.params).topicId);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonRouteError("ID chủ đề không hợp lệ.", 400, "invalid_topic_id");
      }
      logError("Failed to read word suggestion route parameters", error);
      return jsonRouteError("Không thể đọc chủ đề.", 500, "internal_error");
    }
  }

  async function requireJapaneseTopic(topicId: string): Promise<Response | null> {
    try {
      const topic = await dependencies.getTopic(topicId);
      if (!topic) {
        return jsonRouteError("Không tìm thấy chủ đề.", 404, "topic_not_found");
      }
      if (topic.languageCode !== "ja") {
        return jsonRouteError(
          "Chức năng gợi ý chỉ hỗ trợ chủ đề tiếng Nhật.",
          400,
          "unsupported_language",
        );
      }
      return null;
    } catch (error) {
      logError("Failed to load vocabulary topic for word suggestions", error);
      return jsonRouteError("Không thể kiểm tra chủ đề.", 500, "internal_error");
    }
  }

  return {
    async GET(request: Request, context: RouteContext): Promise<Response> {
      const authError = await requireAdmin();
      if (authError) return authError;

      const topicId = await parseTopicId(context);
      if (topicId instanceof Response) return topicId;

      let query: string;
      try {
        ({ query } = wordSuggestionSearchInputSchema.parse({
          query: new URL(request.url).searchParams.get("q"),
        }));
      } catch (error) {
        if (error instanceof ZodError) {
          return jsonRouteError(
            "Từ khóa gợi ý không hợp lệ.",
            400,
            "invalid_query",
          );
        }
        logError("Failed to read word suggestion query", error);
        return jsonRouteError("Không thể đọc từ khóa gợi ý.", 500, "internal_error");
      }

      const topicError = await requireJapaneseTopic(topicId);
      if (topicError) return topicError;

      try {
        const suggestions = await dependencies.service.search(query);
        return jsonNoStore({ suggestions });
      } catch (error) {
        return serviceErrorResponse(error, logError);
      }
    },

    async POST(request: Request, context: RouteContext): Promise<Response> {
      if (!hasValidOrigin(request)) {
        return jsonRouteError("Invalid origin", 403, "invalid_origin");
      }

      const authError = await requireAdmin();
      if (authError) return authError;

      const topicId = await parseTopicId(context);
      if (topicId instanceof Response) return topicId;

      let input;
      try {
        input = wordSuggestionDetailInputSchema.parse(await request.json());
      } catch (error) {
        if (error instanceof ZodError || error instanceof SyntaxError) {
          return jsonRouteError(
            "Lựa chọn từ vựng không hợp lệ.",
            400,
            "invalid_selection",
          );
        }
        logError("Failed to read word suggestion detail input", error);
        return jsonRouteError("Không thể đọc lựa chọn từ vựng.", 500, "internal_error");
      }

      const topicError = await requireJapaneseTopic(topicId);
      if (topicError) return topicError;

      try {
        const detail = await dependencies.service.getDetail(input);
        return jsonNoStore({ detail });
      } catch (error) {
        return serviceErrorResponse(error, logError);
      }
    },
  };
}
