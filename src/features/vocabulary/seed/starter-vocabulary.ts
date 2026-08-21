import type { DocumentData } from "firebase-admin/firestore";

import { COLLECTIONS } from "../../../lib/firebase/collections.ts";
import type { FirestoreTimestampValue } from "../../content/schemas/content.schema.ts";
import {
  vocabularyTopicSchema,
  vocabularyWordSchema,
} from "../schemas/vocabulary.schema.ts";

export type VocabularySeedDocument = {
  collection: (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
  id: string;
  data: DocumentData;
};

export type VocabularySeedStore = {
  createIfMissing(document: VocabularySeedDocument): Promise<boolean>;
};

type StarterWord = {
  id: string;
  term: string;
  meaning: string;
  pronunciation: string;
  example: string;
  exampleMeaning: string;
};

const starterTopics = [
  {
    id: "chao-hoi-tieng-anh",
    title: "Chào hỏi tiếng Anh",
    description: "Những từ và cụm từ dùng khi gặp gỡ, giới thiệu và tạm biệt.",
    languageCode: "en" as const,
    icon: "👋",
    accent: "emerald" as const,
    words: [
      ["hello", "hello", "xin chào", "/həˈləʊ/", "Hello, nice to meet you.", "Xin chào, rất vui được gặp bạn."],
      ["hi", "hi", "chào (thân mật)", "/haɪ/", "Hi, how are you?", "Chào, bạn khỏe không?"],
      ["name", "name", "tên", "/neɪm/", "What is your name?", "Bạn tên là gì?"],
      ["welcome", "welcome", "chào mừng", "/ˈwel.kəm/", "Welcome to our class.", "Chào mừng bạn đến lớp."],
      ["thanks", "thank you", "cảm ơn", "/ˈθæŋk juː/", "Thank you for your help.", "Cảm ơn bạn đã giúp đỡ."],
      ["please", "please", "làm ơn", "/pliːz/", "Please sit down.", "Mời bạn ngồi."],
      ["goodbye", "goodbye", "tạm biệt", "/ˌɡʊdˈbaɪ/", "Goodbye, see you tomorrow.", "Tạm biệt, hẹn gặp ngày mai."],
      ["see-you", "see you", "hẹn gặp lại", "/siː juː/", "See you next week.", "Hẹn gặp bạn tuần sau."],
    ],
  },
  {
    id: "chao-hoi-tieng-nhat",
    title: "Chào hỏi tiếng Nhật",
    description: "Từ vựng nhập môn để chào hỏi và giao tiếp lịch sự bằng tiếng Nhật.",
    languageCode: "ja" as const,
    icon: "🌸",
    accent: "rose" as const,
    words: [
      ["konnichiwa", "こんにちは", "xin chào", "konnichiwa", "こんにちは、皆さん。", "Xin chào mọi người."],
      ["ohayou", "おはよう", "chào buổi sáng", "ohayou", "おはようございます。", "Chào buổi sáng."],
      ["konbanwa", "こんばんは", "chào buổi tối", "konbanwa", "こんばんは、先生。", "Chào buổi tối, thầy/cô."],
      ["namae", "名前", "tên", "namae", "お名前は何ですか？", "Bạn tên là gì?"],
      ["arigatou", "ありがとう", "cảm ơn", "arigatou", "ありがとうございます。", "Xin cảm ơn."],
      ["onegaishimasu", "お願いします", "làm ơn / nhờ bạn", "onegaishimasu", "よろしくお願いします。", "Rất mong được giúp đỡ."],
      ["sayounara", "さようなら", "tạm biệt", "sayounara", "先生、さようなら。", "Tạm biệt thầy/cô."],
      ["mata-ne", "またね", "hẹn gặp lại", "mata ne", "またね、明日。", "Hẹn gặp lại ngày mai."],
    ],
  },
  {
    id: "chao-hoi-tieng-trung",
    title: "Chào hỏi tiếng Trung",
    description: "Các từ cơ bản để chào hỏi, cảm ơn và tạm biệt bằng tiếng Trung.",
    languageCode: "zh" as const,
    icon: "🏮",
    accent: "amber" as const,
    words: [
      ["ni-hao", "你好", "xin chào", "nǐ hǎo", "你好，老师！", "Xin chào thầy/cô!"],
      ["zao", "早", "chào buổi sáng", "zǎo", "老师早！", "Chào buổi sáng thầy/cô!"],
      ["mingzi", "名字", "tên", "míngzi", "你叫什么名字？", "Bạn tên là gì?"],
      ["xiexie", "谢谢", "cảm ơn", "xièxie", "谢谢你的帮助。", "Cảm ơn sự giúp đỡ của bạn."],
      ["bu-keqi", "不客气", "không có gì", "bú kèqi", "不客气！", "Không có gì!"],
      ["qing", "请", "xin mời / làm ơn", "qǐng", "请坐。", "Mời ngồi."],
      ["zaijian", "再见", "tạm biệt", "zàijiàn", "再见，妈妈。", "Tạm biệt mẹ."],
      ["mingtian-jian", "明天见", "hẹn gặp ngày mai", "míngtiān jiàn", "我们明天见。", "Chúng ta gặp nhau ngày mai."],
    ],
  },
] satisfies Array<{
  id: string;
  title: string;
  description: string;
  languageCode: "en" | "ja" | "zh";
  icon: string;
  accent: "emerald" | "rose" | "amber";
  words: string[][];
}>;

export function createStarterVocabularySeed(
  timestamp: FirestoreTimestampValue,
): VocabularySeedDocument[] {
  const documents: VocabularySeedDocument[] = [];

  starterTopics.forEach((topic, topicIndex) => {
    const words = topic.words.map(
      ([id, term, meaning, pronunciation, example, exampleMeaning], wordIndex) =>
        ({ id, term, meaning, pronunciation, example, exampleMeaning, order: wordIndex }) satisfies StarterWord & { order: number },
    );

    documents.push({
      collection: COLLECTIONS.vocabularyTopics,
      id: topic.id,
      data: vocabularyTopicSchema.parse({
        schemaVersion: 1,
        id: topic.id,
        title: topic.title,
        description: topic.description,
        languageCode: topic.languageCode,
        icon: topic.icon,
        accent: topic.accent,
        order: topicIndex,
        isVisible: true,
        wordCount: words.length,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });

    words.forEach((word) => {
      const wordId = `${topic.id}-${word.id}`;
      documents.push({
        collection: COLLECTIONS.vocabularyWords,
        id: wordId,
        data: vocabularyWordSchema.parse({
          schemaVersion: 1,
          id: wordId,
          topicId: topic.id,
          term: word.term,
          meaning: word.meaning,
          pronunciation: word.pronunciation,
          example: word.example,
          exampleMeaning: word.exampleMeaning,
          imageUrl: null,
          order: word.order,
          isVisible: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      });
    });
  });

  return documents;
}

export async function seedStarterVocabulary(
  store: VocabularySeedStore,
  timestamp: FirestoreTimestampValue,
) {
  const result = { created: [] as string[], skipped: [] as string[] };
  for (const document of createStarterVocabularySeed(timestamp)) {
    const path = `${document.collection}/${document.id}`;
    if (await store.createIfMissing(document)) result.created.push(path);
    else result.skipped.push(path);
  }
  return result;
}
