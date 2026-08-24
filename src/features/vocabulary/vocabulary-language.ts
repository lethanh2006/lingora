import type { VocabularyTopicDto } from "./schemas/vocabulary.schema.ts";

export const vocabularyLanguageCopy = {
  en: {
    name: "Tiếng Anh",
    termLabel: "Từ / cụm từ tiếng Anh",
    termPlaceholder: "Nhập từ hoặc cụm từ tiếng Anh",
    pronunciationLabel: "IPA (Anh-Mỹ)",
    pronunciationShortLabel: "IPA",
    pronunciationPlaceholder: "Ví dụ: /həˈloʊ/",
    exampleLabel: "Câu ví dụ tiếng Anh",
    answerPlaceholder: "Nhập từ tiếng Anh...",
    audioPlaceholder: "Để trống để dùng giọng đọc tiếng Anh của trình duyệt",
  },
  ja: {
    name: "Tiếng Nhật",
    termLabel: "Từ / cụm từ tiếng Nhật",
    termPlaceholder: "Nhập kanji, kana hoặc romaji",
    pronunciationLabel: "Cách đọc (kana)",
    pronunciationShortLabel: "Kana",
    pronunciationPlaceholder: "Ví dụ: たべる",
    exampleLabel: "Câu ví dụ tiếng Nhật",
    answerPlaceholder: "Nhập từ tiếng Nhật...",
    audioPlaceholder: "Tự điền khi nguồn có audio; nếu thiếu sẽ dùng giọng đọc trình duyệt",
  },
  zh: {
    name: "Tiếng Trung",
    termLabel: "Từ / cụm từ tiếng Trung",
    termPlaceholder: "Nhập chữ Hán giản thể",
    pronunciationLabel: "Pinyin",
    pronunciationShortLabel: "Pinyin",
    pronunciationPlaceholder: "Ví dụ: nǐ hǎo",
    exampleLabel: "Câu ví dụ tiếng Trung",
    answerPlaceholder: "Nhập từ tiếng Trung...",
    audioPlaceholder: "Để trống để dùng giọng đọc tiếng Trung của trình duyệt",
  },
} as const satisfies Record<
  VocabularyTopicDto["languageCode"],
  {
    name: string;
    termLabel: string;
    termPlaceholder: string;
    pronunciationLabel: string;
    pronunciationShortLabel: string;
    pronunciationPlaceholder: string;
    exampleLabel: string;
    answerPlaceholder: string;
    audioPlaceholder: string;
  }
>;

export function getVocabularyLanguageCopy(
  languageCode: VocabularyTopicDto["languageCode"],
) {
  return vocabularyLanguageCopy[languageCode];
}
