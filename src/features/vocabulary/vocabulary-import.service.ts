import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "../../lib/firebase/collections.ts";
import {
  vocabularyTopicSchema,
  vocabularyWordSchema,
  type VocabularyTopicDto,
  type VocabularyTopicInput,
  type VocabularyWordDto,
  type VocabularyWordInput,
} from "./schemas/vocabulary.schema.ts";
import { slugifyTopicTitle } from "./vocabulary-admin.service.ts";
import { toTopicDto, toWordDto } from "./vocabulary.repository.ts";

export const MAX_TOPIC_IMPORT_ROWS = 200;
export const MAX_WORD_IMPORT_ROWS = 400;

export class VocabularyImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VocabularyImportError";
  }
}

export type VocabularyImportSummary = {
  total: number;
  created: number;
  updated: number;
};

type TopicPlanItem = {
  action: "create" | "update";
  id: string;
  input: VocabularyTopicInput;
  existing?: VocabularyTopicDto;
};

type WordPlanItem = {
  action: "create" | "update";
  input: VocabularyWordInput;
  existing?: VocabularyWordDto;
};

export function normalizeVocabularyImportKey(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function uniqueImportInputs<Input>(
  inputs: readonly Input[],
  keyOf: (input: Input) => string,
  labelOf: (input: Input) => string,
) {
  const keys = new Set<string>();
  for (const input of inputs) {
    const key = keyOf(input);
    if (keys.has(key)) {
      throw new VocabularyImportError(`Tệp import có dữ liệu trùng: “${labelOf(input)}”`);
    }
    keys.add(key);
  }
}

function uniqueExistingByKey<Item>(items: readonly Item[], keyOf: (item: Item) => string) {
  const byKey = new Map<string, Item | null>();
  for (const item of items) {
    const key = keyOf(item);
    byKey.set(key, byKey.has(key) ? null : item);
  }
  return byKey;
}

function nextTopicId(baseId: string, occupiedIds: Set<string>) {
  if (!occupiedIds.has(baseId)) return baseId;
  for (let suffix = 2; suffix <= 10_000; suffix += 1) {
    const candidate = `${baseId}-${suffix}`;
    if (!occupiedIds.has(candidate)) return candidate;
  }
  throw new VocabularyImportError("Không thể tạo ID chủ đề duy nhất");
}

export function planTopicImport(
  existingTopics: readonly VocabularyTopicDto[],
  inputs: readonly VocabularyTopicInput[],
): TopicPlanItem[] {
  if (inputs.length > MAX_TOPIC_IMPORT_ROWS) {
    throw new VocabularyImportError(`Mỗi lần chỉ được import tối đa ${MAX_TOPIC_IMPORT_ROWS} chủ đề`);
  }

  const keyOf = (value: Pick<VocabularyTopicInput, "title">) =>
    normalizeVocabularyImportKey(value.title);
  uniqueImportInputs(inputs, keyOf, (input) => input.title);
  const existingByTitle = uniqueExistingByKey(existingTopics, keyOf);
  const occupiedIds = new Set(existingTopics.map((topic) => topic.id));

  const plan = inputs.map((input): TopicPlanItem => {
    const existing = existingByTitle.get(keyOf(input));
    if (existing === null) {
      throw new VocabularyImportError(
        `Có nhiều chủ đề cùng tên “${input.title}”; hãy đổi tên trước khi import`,
      );
    }
    if (existing) return { action: "update", id: existing.id, input, existing };

    const id = nextTopicId(slugifyTopicTitle(input.title), occupiedIds);
    occupiedIds.add(id);
    return { action: "create", id, input };
  });

  if (existingTopics.length + plan.filter((item) => item.action === "create").length > 200) {
    throw new VocabularyImportError("Sau import không được vượt quá 200 chủ đề");
  }
  return plan;
}

function wordImportKey(value: { term: string; pronunciation?: string | null }) {
  return `${normalizeVocabularyImportKey(value.term)}\u0000${normalizeVocabularyImportKey(value.pronunciation ?? "")}`;
}

export function planWordImport(
  existingWords: readonly VocabularyWordDto[],
  inputs: readonly VocabularyWordInput[],
): WordPlanItem[] {
  if (inputs.length > MAX_WORD_IMPORT_ROWS) {
    throw new VocabularyImportError(`Mỗi lần chỉ được import tối đa ${MAX_WORD_IMPORT_ROWS} từ`);
  }

  uniqueImportInputs(inputs, wordImportKey, (input) =>
    input.pronunciation ? `${input.term} (${input.pronunciation})` : input.term,
  );
  const existingByWord = uniqueExistingByKey(existingWords, wordImportKey);
  const plan = inputs.map((input): WordPlanItem => {
    const existing = existingByWord.get(wordImportKey(input));
    if (existing === null) {
      throw new VocabularyImportError(
        `Có nhiều bản ghi cùng từ và cách đọc “${input.term}”; hãy xử lý trùng trước khi import`,
      );
    }
    return existing ? { action: "update", input, existing } : { action: "create", input };
  });

  if (existingWords.length + plan.filter((item) => item.action === "create").length > 500) {
    throw new VocabularyImportError("Sau import, một chủ đề không được vượt quá 500 từ");
  }
  return plan;
}

function summarize(plan: readonly { action: "create" | "update" }[]): VocabularyImportSummary {
  const created = plan.filter((item) => item.action === "create").length;
  return { total: plan.length, created, updated: plan.length - created };
}

function optionalText(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function createVocabularyImportService(db: Firestore) {
  const topicsCollection = db.collection(COLLECTIONS.vocabularyTopics);
  const wordsCollection = db.collection(COLLECTIONS.vocabularyWords);

  return {
    async previewTopics(inputs: readonly VocabularyTopicInput[]) {
      const snapshot = await topicsCollection.limit(MAX_TOPIC_IMPORT_ROWS).get();
      const existing = snapshot.docs.map((document) =>
        toTopicDto(vocabularyTopicSchema.parse(document.data())),
      );
      return summarize(planTopicImport(existing, inputs));
    },

    async importTopics(inputs: readonly VocabularyTopicInput[]) {
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(topicsCollection.limit(MAX_TOPIC_IMPORT_ROWS));
        const existingRecords = snapshot.docs.map((document) =>
          vocabularyTopicSchema.parse(document.data()),
        );
        const existingDtos = existingRecords.map(toTopicDto);
        const existingById = new Map(existingRecords.map((topic) => [topic.id, topic]));
        const plan = planTopicImport(existingDtos, inputs);
        const now = Timestamp.now();

        for (const item of plan) {
          const existing = existingById.get(item.id);
          const topic = vocabularyTopicSchema.parse({
            schemaVersion: 1,
            id: item.id,
            ...item.input,
            wordCount: existing?.wordCount ?? 0,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
          transaction.set(topicsCollection.doc(item.id), topic);
        }
        return summarize(plan);
      });
    },

    async previewWords(topicId: string, inputs: readonly VocabularyWordInput[]) {
      const [topicSnapshot, wordsSnapshot] = await Promise.all([
        topicsCollection.doc(topicId).get(),
        wordsCollection.where("topicId", "==", topicId).limit(501).get(),
      ]);
      if (!topicSnapshot.exists) return null;
      const existing = wordsSnapshot.docs.map((document) =>
        toWordDto(vocabularyWordSchema.parse(document.data())),
      );
      return summarize(planWordImport(existing, inputs));
    },

    async importWords(topicId: string, inputs: readonly VocabularyWordInput[]) {
      const topicReference = topicsCollection.doc(topicId);
      const wordsQuery = wordsCollection.where("topicId", "==", topicId).limit(501);

      return db.runTransaction(async (transaction) => {
        const [topicSnapshot, wordsSnapshot] = await Promise.all([
          transaction.get(topicReference),
          transaction.get(wordsQuery),
        ]);
        if (!topicSnapshot.exists) return null;

        const topic = vocabularyTopicSchema.parse(topicSnapshot.data());
        const existingRecords = wordsSnapshot.docs.map((document) =>
          vocabularyWordSchema.parse(document.data()),
        );
        const existingDtos = existingRecords.map(toWordDto);
        const existingById = new Map(existingRecords.map((word) => [word.id, word]));
        const plan = planWordImport(existingDtos, inputs);
        const now = Timestamp.now();
        const finalWords = new Map(existingRecords.map((word) => [word.id, word]));

        for (const item of plan) {
          const reference = item.existing
            ? wordsCollection.doc(item.existing.id)
            : wordsCollection.doc();
          const existing = item.existing ? existingById.get(item.existing.id) : undefined;
          const word = vocabularyWordSchema.parse({
            schemaVersion: 1,
            id: reference.id,
            topicId,
            ...item.input,
            pronunciation: optionalText(item.input.pronunciation),
            example: optionalText(item.input.example),
            exampleMeaning: optionalText(item.input.exampleMeaning),
            audioUrl: optionalText(item.input.audioUrl),
            imageUrl: optionalText(item.input.imageUrl),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
          transaction.set(reference, word);
          finalWords.set(word.id, word);
        }

        const visibleCount = [...finalWords.values()].filter((word) => word.isVisible).length;
        transaction.set(topicReference, vocabularyTopicSchema.parse({
          ...topic,
          wordCount: visibleCount,
          updatedAt: now,
        }));
        return summarize(plan);
      });
    },
  };
}

export type VocabularyImportService = ReturnType<typeof createVocabularyImportService>;
