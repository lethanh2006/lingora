import {
  languageSchema,
  programSchema,
  type Language,
  type Program,
  courseSchema,
  unitDraftSchema,
  lessonDraftSchema,
  activityDraftSchema,
  sourceAttributionSchema,
} from "../schemas/content.schema.ts";
import { contentMediaSchema } from "../schemas/media.schema.ts";
import { questionSchema, questionVersionSchema, examBlueprintSchema, examFormVersionSchema } from "../../assessment/schemas/assessment.schema.ts";
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

// -------------------------------------------------------------
// NEW: Seeding for Pilot Content & Exams (Phase 8)
// -------------------------------------------------------------

export async function seedPilotContent(db: any, timestamp: SeedTimestamp) {
  console.log("  - Starting seedPilotContent...");
  const setDoc = async (ref: any, data: any) => {
    await ref.set(data);
  };

  // 1. Seed Source Attribution
  console.log("  - Seeding source attribution...");
  const sourceRef = db.collection(COLLECTIONS.contentSources).doc("source-1");
  const sourceData = sourceAttributionSchema.parse({
    id: "source-1",
    title: "Lingora Reference Content",
    publisher: "Lingora",
    canonicalUrl: "https://lingora.example.com",
    licenseCode: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attributionText: "Lingora reference content, CC BY 4.0.",
  });
  await setDoc(sourceRef, sourceData);

  // 2. Seed Media files for audio choices
  console.log("  - Seeding media...");
  const mediaIds = ["audio-en-hello", "audio-ja-konnichiwa", "audio-zh-nihao"];
  for (const mediaId of mediaIds) {
    const mediaRef = db.collection(COLLECTIONS.contentMedia).doc(mediaId);
    const mediaData = contentMediaSchema.parse({
      schemaVersion: 1,
      id: mediaId,
      storagePath: `media/content/pilot/${mediaId}.mp3`,
      contentType: "audio/mpeg",
      sizeBytes: 12345,
      checksum: "a".repeat(64),
    });
    await setDoc(mediaRef, mediaData);
  }

  // 3. Seed Lexemes (Vocabulary)
  console.log("  - Seeding lexemes...");
  const lexemesList = [
    // English
    { id: "lex-en-hello", term: "hello", meaningVi: "xin chào", pronunciation: "/həˈləʊ/", example: "Hello, world!" },
    { id: "lex-en-hi", term: "hi", meaningVi: "chào (thân mật)", pronunciation: "/haɪ/", example: "Hi, John!" },
    { id: "lex-en-name", term: "name", meaningVi: "tên", pronunciation: "/neɪm/", example: "What is your name?" },
    { id: "lex-en-iam", term: "I am", meaningVi: "tôi là", pronunciation: "/aɪ æm/", example: "I am fine." },
    { id: "lex-en-how", term: "how", meaningVi: "như thế nào", pronunciation: "/haʊ/", example: "How are you?" },
    { id: "lex-en-fine", term: "fine", meaningVi: "khỏe / tốt", pronunciation: "/faɪ/", example: "I am fine." },
    { id: "lex-en-goodbye", term: "goodbye", meaningVi: "tạm biệt", pronunciation: "/ˌɡʊdˈbaɪ/", example: "Goodbye, teacher!" },
    { id: "lex-en-bye", term: "bye", meaningVi: "tạm biệt (thân mật)", pronunciation: "/baɪ/", example: "Bye, mate!" },

    // Japanese
    { id: "lex-ja-konnichiwa", term: "こんにちは", meaningVi: "xin chào", pronunciation: "konnichiwa", example: "こんにちは、皆さん。" },
    { id: "lex-ja-ohayou", term: "おはよう", meaningVi: "chào buổi sáng", pronunciation: "ohayou", example: "おはようございます。" },
    { id: "lex-ja-namae", term: "名前", meaningVi: "tên", pronunciation: "namae", example: "お名前は何ですか？" },
    { id: "lex-ja-desu", term: "です", meaningVi: "là (vĩ tố)", pronunciation: "desu", example: "私は学生です。" },
    { id: "lex-ja-genki", term: "元気", meaningVi: "khỏe mạnh", pronunciation: "genki", example: "お元気ですか？" },
    { id: "lex-ja-arigatou", term: "ありがとう", meaningVi: "cảm ơn", pronunciation: "arigatou", example: "ありがとうございます。" },
    { id: "lex-ja-sayounara", term: "さようなら", meaningVi: "tạm biệt", pronunciation: "sayounara", example: "先生、さようなら。" },
    { id: "lex-ja-jaane", term: "じゃあね", meaningVi: "tạm biệt (thân mật)", pronunciation: "jaa ne", example: "じゃあね、また明日。" },

    // Chinese
    { id: "lex-zh-nihao", term: "你好", meaningVi: "xin chào", pronunciation: "nǐ hǎo", example: "你好，老师！" },
    { id: "lex-zh-zao", term: "早", meaningVi: "chào buổi sáng", pronunciation: "zǎo", example: "老师早！" },
    { id: "lex-zh-mingzi", term: "名字", meaningVi: "tên", pronunciation: "míngzi", example: "你叫 cells 名字？" },
    { id: "lex-zh-jiao", term: "叫", meaningVi: "tên là / gọi là", pronunciation: "jiào", example: "我叫王明。" },
    { id: "lex-zh-haoma", term: "好吗", meaningVi: "khỏe không (hỏi)", pronunciation: "hǎo ma", example: "你好吗？" },
    { id: "lex-zh-henhao", term: "很好", meaningVi: "rất tốt / rất khỏe", pronunciation: "hěn hǎo", example: "我很好，谢谢！" },
    { id: "lex-zh-zaijian", term: "再见", meaningVi: "tạm biệt", pronunciation: "zàijiàn", example: "再见，妈妈。" },
    { id: "lex-zh-mingtian", term: "明天", meaningVi: "ngày mai", pronunciation: "míngtiān", example: "明天见。" },
  ];

  for (const lex of lexemesList) {
    const ref = db.collection(COLLECTIONS.lexemes).doc(lex.id);
    await setDoc(ref, {
      term: lex.term,
      meaningVi: lex.meaningVi,
      pronunciation: lex.pronunciation,
      example: lex.example,
      mediaRefs: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  // 4. Seed Course Drafts
  console.log("  - Seeding courses...");
  const courses = [
    { id: "english-a1-foundations", programId: "general-english-cefr", levelId: "a1", title: "English A1 Foundations", description: "Khóa học nền tảng tiếng Anh cơ bản." },
    { id: "japanese-a1-communication", programId: "japanese-communication-jf", levelId: "a1", title: "Japanese A1 Communication", description: "Khóa học giao tiếp tiếng Nhật nhập môn." },
    { id: "chinese-level1-foundation", programId: "chinese-foundation-gf0025", levelId: "level-1", title: "Chinese Level 1 Foundations", description: "Khóa học tiếng Trung sơ cấp cơ bản." },
  ];

  for (const c of courses) {
    const ref = db.collection(COLLECTIONS.contentCourses).doc(c.id);
    const data = courseSchema.parse({
      schemaVersion: 1,
      id: c.id,
      programId: c.programId,
      levelId: c.levelId,
      title: c.title,
      description: c.description,
      coverMediaId: null,
      estimatedMinutes: 40,
      currentPublishedRevisionId: null,
      status: "draft",
      order: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await setDoc(ref, data);
  }

  // 5. Seed Unit Drafts
  console.log("  - Seeding units...");
  const units = [
    { id: "en-basics-u1", courseId: "english-a1-foundations", title: "Greetings and Basics", description: "Learn basic greetings and introductions." },
    { id: "ja-basics-u1", courseId: "japanese-a1-communication", title: "Greetings & Hiragana", description: "挨拶と自己紹介を学びましょう。" },
    { id: "zh-basics-u1", courseId: "chinese-level1-foundation", title: "Pinyin & Greetings", description: "学习汉语拼音与基础问候。" },
  ];

  for (const u of units) {
    const ref = db.collection(COLLECTIONS.contentUnits).doc(u.id);
    const data = unitDraftSchema.parse({
      schemaVersion: 1,
      id: u.id,
      courseId: u.courseId,
      title: u.title,
      description: u.description,
      order: 0,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await setDoc(ref, data);
  }

  // 6. Seed Lesson Drafts & Activities
  console.log("  - Seeding lessons and activities...");
  const languagesList = [
    {
      lang: "en",
      unitId: "en-basics-u1",
      mediaId: "audio-en-hello",
      lessons: [
        { id: "en-basics-u1-l1", title: "Saying Hello", summary: "Học cách chào hỏi cơ bản trong tiếng Anh.", vocab: ["lex-en-hello", "lex-en-hi"] },
        { id: "en-basics-u1-l2", title: "Introducing Yourself", summary: "Giới thiệu bản thân và tên của bạn.", vocab: ["lex-en-name", "lex-en-iam"] },
        { id: "en-basics-u1-l3", title: "Asking How Someone Is", summary: "Hỏi thăm sức khỏe và tình hình đối phương.", vocab: ["lex-en-how", "lex-en-fine"] },
        { id: "en-basics-u1-l4", title: "Saying Goodbye", summary: "Cách kết thúc cuộc hội thoại và tạm biệt.", vocab: ["lex-en-goodbye", "lex-en-bye"] },
      ],
      vocabList: [
        { id: "lex-en-hello", term: "hello", meaning: "xin chào" },
        { id: "lex-en-hi", term: "hi", meaning: "chào" },
        { id: "lex-en-name", term: "name", meaning: "tên" },
        { id: "lex-en-iam", term: "I am", meaning: "tôi là" },
        { id: "lex-en-how", term: "how", meaning: "như thế nào" },
        { id: "lex-en-fine", term: "fine", meaning: "khỏe" },
        { id: "lex-en-goodbye", term: "goodbye", meaning: "tạm biệt" },
        { id: "lex-en-bye", term: "bye", meaning: "chào tạm biệt" },
      ],
    },
    {
      lang: "ja",
      unitId: "ja-basics-u1",
      mediaId: "audio-ja-konnichiwa",
      lessons: [
        { id: "ja-basics-u1-l1", title: "Greetings - Konnichiwa", summary: "Chào hỏi thông thường bằng tiếng Nhật.", vocab: ["lex-ja-konnichiwa", "lex-ja-ohayou"] },
        { id: "ja-basics-u1-l2", title: "Self Introduction", summary: "Giới thiệu tên tuổi cơ bản.", vocab: ["lex-ja-namae", "lex-ja-desu"] },
        { id: "ja-basics-u1-l3", title: "How are you? - Genki", summary: "Hỏi thăm sức khỏe lịch sự.", vocab: ["lex-ja-genki", "lex-ja-arigatou"] },
        { id: "ja-basics-u1-l4", title: "Saying Sayounara", summary: "Nói lời chào tạm biệt tiếng Nhật.", vocab: ["lex-ja-sayounara", "lex-ja-jaane"] },
      ],
      vocabList: [
        { id: "lex-ja-konnichiwa", term: "こんにちは", meaning: "xin chào" },
        { id: "lex-ja-ohayou", term: "おはよう", meaning: "chào buổi sáng" },
        { id: "lex-ja-namae", term: "名前", meaning: "tên" },
        { id: "lex-ja-desu", term: "です", meaning: "là" },
        { id: "lex-ja-genki", term: "元気", meaning: "khỏe" },
        { id: "lex-ja-arigatou", term: "ありがとう", meaning: "cảm ơn" },
        { id: "lex-ja-sayounara", term: "さようなら", meaning: "tạm biệt" },
        { id: "lex-ja-jaane", term: "じゃあね", meaning: "tạm biệt thân mật" },
      ],
    },
    {
      lang: "zh",
      unitId: "zh-basics-u1",
      mediaId: "audio-zh-nihao",
      lessons: [
        { id: "zh-basics-u1-l1", title: "Ni Hao & Greetings", summary: "Chào hỏi thông dụng trong giao tiếp tiếng Trung.", vocab: ["lex-zh-nihao", "lex-zh-zao"] },
        { id: "zh-basics-u1-l2", title: "Self Introduction", summary: "Học cách giới thiệu tên riêng.", vocab: ["lex-zh-mingzi", "lex-zh-jiao"] },
        { id: "zh-basics-u1-l3", title: "How are you? - Hao ma", summary: "Hỏi thăm sức khỏe.", vocab: ["lex-zh-haoma", "lex-zh-henhao"] },
        { id: "zh-basics-u1-l4", title: "Saying Zai Jian", summary: "Nói lời tạm biệt tiếng Trung.", vocab: ["lex-zh-zaijian", "lex-zh-mingtian"] },
      ],
      vocabList: [
        { id: "lex-zh-nihao", term: "你好", meaning: "xin chào" },
        { id: "lex-zh-zao", term: "早", meaning: "chào buổi sáng" },
        { id: "lex-zh-mingzi", term: "名字", meaning: "tên" },
        { id: "lex-zh-jiao", term: "叫", meaning: "tên là" },
        { id: "lex-zh-haoma", term: "好吗", meaning: "khỏe không" },
        { id: "lex-zh-henhao", term: "很好", meaning: "rất tốt" },
        { id: "lex-zh-zaijian", term: "再见", meaning: "tạm biệt" },
        { id: "lex-zh-mingtian", term: "明天", meaning: "ngày mai" },
      ],
    },
  ];

  for (const group of languagesList) {
    let order = 0;
    for (const l of group.lessons) {
      const lessonRef = db.collection(COLLECTIONS.contentLessons).doc(l.id);

      // Generate 6 Activities for this lesson
      const activityRefs: string[] = [];
      const interactionTypes = ["explanation", "vocabulary_card", "single_choice", "gap_fill", "reorder_tokens", "listening_choice"];

      for (let idx = 0; idx < interactionTypes.length; idx++) {
        const type = interactionTypes[idx];
        const activityId = `act-${l.id}-${idx + 1}`;
        activityRefs.push(activityId);

        const activityRef = db.collection(COLLECTIONS.contentActivities).doc(activityId);
        let activityObj: any = {
          id: activityId,
          instruction: `Luyện tập bài học: ${l.title}`,
          skill: "vocabulary",
          difficulty: "a1",
          estimatedSeconds: 40,
          required: true,
          sourceRefs: ["source-1"],
          type,
        };

        if (type === "explanation") {
          activityObj.prompt = `Lý thuyết về ${l.title}`;
          activityObj.body = `Trong bài này, chúng ta học các mẫu câu liên quan đến ${l.title}. Hãy ghi nhớ các từ vựng trọng tâm.`;
        } else if (type === "vocabulary_card") {
          activityObj.prompt = `Từ vựng cốt lõi`;
          activityObj.entries = l.vocab.map((lexId) => {
            const matched = lexemesList.find((lx) => lx.id === lexId)!;
            return {
              lexemeId: lexId,
              term: matched.term,
              meaningVi: matched.meaningVi,
              pronunciation: matched.pronunciation || "",
              example: matched.example || "",
              mediaRefs: [],
            };
          });
        } else if (type === "single_choice") {
          const mainVocab = lexemesList.find((lx) => lx.id === l.vocab[0])!;
          const altVocab = lexemesList.find((lx) => lx.id === l.vocab[1])!;
          activityObj.prompt = `Từ "${mainVocab.term}" có nghĩa tiếng Việt là gì?`;
          activityObj.options = [
            { id: "opt-1", text: mainVocab.meaningVi },
            { id: "opt-2", text: altVocab.meaningVi },
          ];
          activityObj.scoringDefinition = {
            kind: "exact_single_choice",
            correctOptionId: "opt-1",
          };
        } else if (type === "gap_fill") {
          const mainVocab = lexemesList.find((lx) => lx.id === l.vocab[0])!;
          activityObj.prompt = `Điền từ còn thiếu vào ô trống.`;
          activityObj.template = `[${mainVocab.term}]`;
          activityObj.gaps = [{ id: "gap-1", placeholder: "Điền từ" }];
          activityObj.scoringDefinition = {
            kind: "accepted_gap_answers",
            answers: [
              {
                gapId: "gap-1",
                acceptedAnswers: [mainVocab.term],
                caseSensitive: false,
              },
            ],
          };
        } else if (type === "reorder_tokens") {
          const mainVocab = lexemesList.find((lx) => lx.id === l.vocab[0])!;
          activityObj.prompt = `Sắp xếp các thẻ từ sau.`;
          activityObj.tokens = [
            { id: "tok-1", text: mainVocab.term },
          ];
          activityObj.tokens.push({ id: "tok-2", text: "." });
          activityObj.scoringDefinition = {
            kind: "exact_token_sequence",
            correctTokenIds: ["tok-1", "tok-2"],
          };
        } else if (type === "listening_choice") {
          const mainVocab = lexemesList.find((lx) => lx.id === l.vocab[0])!;
          const altVocab = lexemesList.find((lx) => lx.id === l.vocab[1])!;
          activityObj.prompt = `Nghe và chọn từ đúng.`;
          activityObj.audioMediaId = group.mediaId;
          activityObj.transcript = mainVocab.term;
          activityObj.options = [
            { id: "opt-1", text: mainVocab.term },
            { id: "opt-2", text: altVocab.term },
          ];
          activityObj.scoringDefinition = {
            kind: "exact_single_choice",
            correctOptionId: "opt-1",
          };
        }

        await setDoc(activityRef, activityDraftSchema.parse(activityObj));
      }

      // Set Lesson Draft
      const lessonObj = lessonDraftSchema.parse({
        schemaVersion: 1,
        id: l.id,
        unitId: group.unitId,
        title: l.title,
        summary: l.summary,
        objectives: ["Nắm vững kiến thức trọng tâm của bài học."],
        estimatedMinutes: 10,
        order: order++,
        activityRefs,
        vocabularyRefs: l.vocab,
        sourceRefs: ["source-1"],
        status: "approved",
        validationReport: {
          errors: [],
          warnings: [],
          validatedAt: null,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await setDoc(lessonRef, lessonObj);
    }
  }

  console.log("  - seedPilotContent seeded successfully.");
}

export async function seedPilotExams(db: any, timestamp: SeedTimestamp) {
  console.log("  - Starting seedPilotExams...");
  const setDoc = async (ref: any, data: any) => {
    await ref.set(data);
  };

  const programs = [
    { id: "general-english-cefr", code: "eng", blueprintId: "blueprint-eng-a1", formId: "form-version-eng-a1" },
    { id: "japanese-communication-jf", code: "ja", blueprintId: "blueprint-ja-a1", formId: "form-version-ja-a1" },
    { id: "chinese-foundation-gf0025", code: "zh", blueprintId: "blueprint-zh-a1", formId: "form-version-zh-a1" },
  ];

  for (const prog of programs) {
    console.log(`  - Seeding exam questions for ${prog.code}...`);
    const orderedQuestionVersionIds: string[] = [];
    const publicSectionSnapshots: any[] = [
      {
        id: "section-reading",
        title: "Reading Comprehension",
        order: 0,
        durationSeconds: 300,
        questions: [],
      },
      {
        id: "section-grammar",
        title: "Grammar & Vocabulary",
        order: 1,
        durationSeconds: 300,
        questions: [],
      },
    ];

    for (let i = 1; i <= 20; i++) {
      const questionId = `q-${prog.code}-${i}`;
      const qvId = `qv-${prog.code}-${i}`;
      orderedQuestionVersionIds.push(qvId);

      const isReading = i <= 10;
      const skill = isReading ? "reading" : "grammar";
      const sectionId = isReading ? "section-reading" : "section-grammar";
      const interactionType = isReading ? "single_choice" : (i <= 15 ? "gap_fill" : "reorder_tokens");

      let prompt = `Question ${i} for ${prog.code.toUpperCase()}: `;
      let options: any[] = [];
      let scoringDefinition: any = {};
      let explanation = `This is a sample explanation for question ${i}.`;

      if (interactionType === "single_choice") {
        prompt += `Choose the correct answer.`;
        options = [
          { id: "opt-1", text: "Correct Option" },
          { id: "opt-2", text: "Incorrect Option" },
        ];
        scoringDefinition = { correctOptionId: "opt-1" };
      } else if (interactionType === "gap_fill") {
        prompt += `Complete the blank: "Lingora is [great]." (Write 'great' in the blank)`;
        scoringDefinition = { correctAnswers: ["great"] };
      } else if (interactionType === "reorder_tokens") {
        prompt += `Reorder tokens to spell correctly.`;
        options = [
          { id: "tok-1", text: "Word" },
          { id: "tok-2", text: "." },
        ];
        scoringDefinition = { correctTokenIds: ["tok-1", "tok-2"] };
      }

      // Add to basic Questions collection
      const qRef = db.collection(COLLECTIONS.questions).doc(questionId);
      const qData = questionSchema.parse({
        schemaVersion: 1,
        id: questionId,
        latestVersionId: qvId,
        status: "approved",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await setDoc(qRef, qData);

      // Add to QuestionVersions collection
      const qvRef = db.collection(COLLECTIONS.questionVersions).doc(qvId);
      const qvData = questionVersionSchema.parse({
        schemaVersion: 1,
        id: qvId,
        questionId,
        programId: prog.id,
        frameworkVersion: "2020",
        levelId: "a1",
        sectionType: sectionId,
        skill,
        interactionType,
        difficulty: "a1",
        topicIds: ["basics"],
        objectiveIds: ["obj-1"],
        promptBlocks: [{ type: "text", content: prompt }],
        options,
        mediaRefs: [],
        scoringDefinition,
        explanation,
        sourceRefs: ["source-1"],
        authorUid: "system",
        reviewerUid: null,
        status: "approved",
        version: 1,
        createdAt: timestamp,
      });
      await setDoc(qvRef, qvData);

      // Push sanitized public version into the snapshot
      const targetSec = publicSectionSnapshots.find((s) => s.id === sectionId)!;
      targetSec.questions.push({
        id: qvId,
        questionId,
        interactionType,
        promptBlocks: [{ type: "text", content: prompt }],
        options,
      });
    }

    // 2. Add Blueprint
    console.log(`  - Seeding blueprint for ${prog.code}...`);
    const bpRef = db.collection(COLLECTIONS.examBlueprints).doc(prog.blueprintId);
    const bpData = examBlueprintSchema.parse({
      schemaVersion: 1,
      id: prog.blueprintId,
      programId: prog.id,
      frameworkVersion: "2020",
      levelId: "a1",
      title: `${prog.code.toUpperCase()} A1 Practice Exam`,
      sections: [
        {
          id: "section-reading",
          title: "Reading Comprehension",
          order: 0,
          durationSeconds: 300,
          slots: [
            {
              skill: "reading",
              interactionTypes: ["single_choice"],
              difficultyRange: ["a1"],
              questionCount: 10,
              points: 50,
            },
          ],
        },
        {
          id: "section-grammar",
          title: "Grammar & Vocabulary",
          order: 1,
          durationSeconds: 300,
          slots: [
            {
              skill: "grammar",
              interactionTypes: ["gap_fill", "reorder_tokens"],
              difficultyRange: ["a1"],
              questionCount: 10,
              points: 50,
            },
          ],
        },
      ],
      durationSeconds: 600,
      scoringStrategy: "sum",
      scoringVersion: "1.0.0",
      status: "published",
    });
    await setDoc(bpRef, bpData);

    // 3. Add Exam Form Version (Pre-compiled)
    console.log(`  - Seeding form version for ${prog.code}...`);
    const formRef = db.collection(COLLECTIONS.examFormVersions).doc(prog.formId);
    const formData = examFormVersionSchema.parse({
      schemaVersion: 1,
      id: prog.formId,
      blueprintId: prog.blueprintId,
      blueprintVersion: 1,
      orderedQuestionVersionIds,
      publicSectionSnapshots,
      checksum: "e".repeat(64),
      status: "published",
      publishedAt: timestamp,
    });
    await setDoc(formRef, formData);
  }

  console.log("  - seedPilotExams completed successfully.");
}
