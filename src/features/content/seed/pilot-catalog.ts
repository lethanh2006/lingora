import {
  languageSchema,
  programSchema,
  type Language,
  type Program,
} from "../schemas/content.schema.ts";
import { COLLECTIONS } from "../../../lib/firebase/collections.ts";

type SeedTimestamp = Language["createdAt"];

export type PilotSeedDocument =
  | {
      collection: typeof COLLECTIONS.languages;
      id: Language["id"];
      data: Language;
    }
  | {
      collection: typeof COLLECTIONS.programs;
      id: string;
      data: Program;
    };

export type PilotSeedStore = {
  createIfMissing(document: PilotSeedDocument): Promise<boolean>;
};

export type PilotSeedResult = {
  created: string[];
  skipped: string[];
};

export function createPilotCatalogSeed(timestamp: SeedTimestamp): PilotSeedDocument[] {
  const languages = [
    {
      schemaVersion: 1,
      id: "en",
      nameVi: "Tiếng Anh",
      nativeName: "English",
      locale: "en",
      writingSystems: ["latin"],
      direction: "ltr",
      enabled: true,
      order: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      schemaVersion: 1,
      id: "ja",
      nameVi: "Tiếng Nhật",
      nativeName: "日本語",
      locale: "ja",
      writingSystems: ["hiragana", "katakana", "kanji"],
      direction: "ltr",
      enabled: true,
      order: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      schemaVersion: 1,
      id: "zh",
      nameVi: "Tiếng Trung",
      nativeName: "中文",
      locale: "zh-Hans",
      writingSystems: ["hanzi-simplified", "hanzi-traditional", "pinyin"],
      direction: "ltr",
      enabled: true,
      order: 2,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ].map((language) => languageSchema.parse(language));

  const programs = [
    {
      schemaVersion: 1,
      id: "general-english-cefr",
      languageId: "en",
      code: "general-english-cefr",
      type: "general",
      title: "General English CEFR",
      description: "Lộ trình tiếng Anh tổng quát theo CEFR.",
      frameworkCode: "cefr",
      frameworkVersion: "2020-companion-volume",
      levelIds: ["a1"],
      currentPublishedRevisionId: null,
      status: "published",
      order: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      schemaVersion: 1,
      id: "japanese-communication-jf",
      languageId: "ja",
      code: "japanese-communication-jf",
      type: "general",
      title: "Japanese Communication",
      description: "Lộ trình giao tiếp tiếng Nhật nhập môn theo JF Standard.",
      frameworkCode: "jf-standard",
      frameworkVersion: "2010",
      levelIds: ["a1"],
      currentPublishedRevisionId: null,
      status: "published",
      order: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      schemaVersion: 1,
      id: "chinese-foundation-gf0025",
      languageId: "zh",
      code: "chinese-foundation-gf0025",
      type: "general",
      title: "Chinese Foundation",
      description: "Lộ trình tiếng Trung nhập môn theo chuẩn ba bậc chín cấp.",
      frameworkCode: "gf0025",
      frameworkVersion: "GF0025-2021",
      levelIds: ["level-1"],
      currentPublishedRevisionId: null,
      status: "published",
      order: 2,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ].map((program) => programSchema.parse(program));

  return [
    ...languages.map((language) => ({
      collection: COLLECTIONS.languages,
      id: language.id,
      data: language,
    }) as PilotSeedDocument),
    ...programs.map((program) => ({
      collection: COLLECTIONS.programs,
      id: program.id,
      data: program,
    }) as PilotSeedDocument),
  ];
}

export async function seedPilotCatalog(
  store: PilotSeedStore,
  timestamp: SeedTimestamp,
): Promise<PilotSeedResult> {
  const result: PilotSeedResult = { created: [], skipped: [] };

  for (const document of createPilotCatalogSeed(timestamp)) {
    const path = `${document.collection}/${document.id}`;
    if (await store.createIfMissing(document)) result.created.push(path);
    else result.skipped.push(path);
  }

  return result;
}
