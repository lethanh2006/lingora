export const timestamp = Object.freeze({ seconds: 1_700_000_000, nanoseconds: 0 });

export const languageFixture = {
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
};

export const programFixture = {
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
  status: "draft",
  order: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const courseFixture = {
  schemaVersion: 1,
  id: "english-a1-foundations",
  programId: "general-english-cefr",
  levelId: "a1",
  title: "English A1 Foundations",
  description: "Khóa nhập môn cho technical slice.",
  coverMediaId: null,
  estimatedMinutes: 120,
  currentPublishedRevisionId: null,
  status: "draft",
  order: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const courseRevisionFixture = {
  schemaVersion: 1,
  id: "courseRevision1",
  courseId: "english-a1-foundations",
  revisionNumber: 1,
  orderedUnitIds: ["greetings"],
  lessonRevisionMap: {
    "hello-and-goodbye": "lessonRevision1",
  },
  releaseNotes: "Technical slice đầu tiên.",
  publishedAt: timestamp,
  publishedBy: "admin-user-1",
};

export const unitDraftFixture = {
  schemaVersion: 1,
  id: "greetings",
  courseId: "english-a1-foundations",
  title: "Greetings",
  description: "Chào hỏi và giới thiệu bản thân.",
  order: 0,
  status: "draft",
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const lessonDraftFixture = {
  schemaVersion: 1,
  id: "hello-and-goodbye",
  unitId: "greetings",
  title: "Hello and goodbye",
  summary: "Học cách chào hỏi và tạm biệt cơ bản.",
  objectives: ["Chọn được lời chào phù hợp với ngữ cảnh."],
  estimatedMinutes: 10,
  order: 0,
  activityRefs: ["choose-greeting"],
  vocabularyRefs: ["lexeme-hello"],
  sourceRefs: ["source-1"],
  status: "draft",
  validationReport: {
    errors: [],
    warnings: [],
    validatedAt: timestamp,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
};

const activityBase = {
  instruction: "Hoàn thành hoạt động.",
  skill: "vocabulary",
  difficulty: "a1",
  estimatedSeconds: 45,
  required: true,
  sourceRefs: ["source-1"],
};

export const activityFixtures = [
  {
    ...activityBase,
    id: "greeting-explanation",
    type: "explanation",
    prompt: "Cách chào hỏi cơ bản",
    body: "Hello được dùng để chào hỏi trong nhiều tình huống.",
  },
  {
    ...activityBase,
    id: "greeting-vocabulary",
    type: "vocabulary_card",
    prompt: "Từ vựng chào hỏi",
    entries: [
      {
        lexemeId: "lexeme-hello",
        term: "hello",
        meaningVi: "xin chào",
        pronunciation: "/həˈləʊ/",
        example: "Hello, Mai!",
        mediaRefs: [],
      },
    ],
  },
  {
    ...activityBase,
    id: "choose-greeting",
    type: "single_choice",
    prompt: "Chọn lời chào phù hợp.",
    options: [
      { id: "hello", text: "Hello" },
      { id: "goodbye", text: "Goodbye" },
    ],
    scoringDefinition: {
      kind: "exact_single_choice",
      correctOptionId: "hello",
    },
  },
  {
    ...activityBase,
    id: "complete-greeting",
    type: "gap_fill",
    prompt: "Điền từ còn thiếu.",
    template: "{{greeting}}, Mai!",
    gaps: [{ id: "greeting", placeholder: "Lời chào" }],
    scoringDefinition: {
      kind: "accepted_gap_answers",
      answers: [
        {
          gapId: "greeting",
          acceptedAnswers: ["Hello", "Hi"],
          caseSensitive: false,
        },
      ],
    },
  },
  {
    ...activityBase,
    id: "order-greeting",
    type: "reorder_tokens",
    prompt: "Sắp xếp thành câu đúng.",
    tokens: [
      { id: "hello", text: "Hello" },
      { id: "mai", text: "Mai" },
    ],
    scoringDefinition: {
      kind: "exact_token_sequence",
      correctTokenIds: ["hello", "mai"],
    },
  },
  {
    ...activityBase,
    id: "listen-greeting",
    type: "listening_choice",
    prompt: "Bạn nghe thấy từ nào?",
    audioMediaId: "audio-hello",
    transcript: "Hello",
    options: [
      { id: "hello", text: "Hello" },
      { id: "goodbye", text: "Goodbye" },
    ],
    scoringDefinition: {
      kind: "exact_single_choice",
      correctOptionId: "hello",
    },
  },
];
