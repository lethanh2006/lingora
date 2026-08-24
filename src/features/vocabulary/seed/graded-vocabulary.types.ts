import type {
  VocabularyTopic,
  VocabularyWord,
} from "../schemas/vocabulary.schema.ts";

export type GradedVocabularyWordData = Pick<
  VocabularyWord,
  "term" | "meaning"
> & {
  id: string;
  pronunciation: string;
  example?: string;
  exampleMeaning?: string;
  audioUrl?: string;
};

export type GradedVocabularyTopicData = Pick<
  VocabularyTopic,
  "id" | "title" | "description" | "languageCode" | "icon" | "accent" | "order"
> & {
  framework: "CEFR" | "JLPT" | "HSK";
  level: string;
  sourceName: string;
  sourceUrl: string;
  sourceLicense: string;
  sourceVersion: string;
  words: readonly GradedVocabularyWordData[];
};
