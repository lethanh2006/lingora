import type {
  PracticeMode,
  VocabularyWordDto,
} from "./schemas/vocabulary.schema.ts";

export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (const character of seed)
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    const target = Math.floor(random * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function buildPracticeDeck(
  words: VocabularyWordDto[],
  mode: PracticeMode,
  round: number,
  masteredIds: readonly string[] = [],
) {
  const limit = { flashcards: 20, matching: 6, fill: 10 }[mode];
  const mastered = new Set(masteredIds);
  const prioritized = [...words].sort(
    (left, right) =>
      Number(mastered.has(left.id)) - Number(mastered.has(right.id)),
  );
  if (!prioritized.length) return [];
  const offset = ((round - 1) * limit) % prioritized.length;
  const rotated = [
    ...prioritized.slice(offset),
    ...prioritized.slice(0, offset),
  ];
  return shuffleWithSeed(
    rotated.slice(0, limit),
    `${words[0].topicId}:${mode}:${round}`,
  );
}
