import { japaneseWordSuggestionService } from "@/features/vocabulary/japanese-word-suggestion.service";
import { createVocabularyRepository } from "@/features/vocabulary/vocabulary.repository";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";

import { createWordSuggestionRouteHandlers } from "./handler";

export const dynamic = "force-dynamic";

const handlers = createWordSuggestionRouteHandlers({
  getCurrentUser,
  getTopic: (topicId) =>
    createVocabularyRepository(getAdminDb()).getTopic(topicId, { includeHidden: true }),
  service: japaneseWordSuggestionService,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
