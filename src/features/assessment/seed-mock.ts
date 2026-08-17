import { type Firestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections.ts";

export async function seedMockExamData(db: Firestore) {
  const blueprintRef = db.collection(COLLECTIONS.examBlueprints).doc("blueprint-eng-a1");
  const blueprintSnap = await blueprintRef.get();
  
  if (blueprintSnap.exists) {
    return; // Already seeded
  }

  const now = Timestamp.now();

  // 1. Seed Blueprint
  const blueprint = {
    schemaVersion: 1,
    id: "blueprint-eng-a1",
    programId: "general-english-cefr",
    frameworkVersion: "2020",
    levelId: "a1",
    title: "English A1 CEFR Mock Exam",
    sections: [
      {
        id: "section-reading",
        title: "Reading Section",
        order: 0,
        durationSeconds: 300,
        slots: [
          {
            skill: "reading",
            interactionTypes: ["single_choice"],
            difficultyRange: ["a1"],
            questionCount: 1,
            points: 5,
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
            questionCount: 2,
            points: 5,
          },
        ],
      },
    ],
    durationSeconds: 600,
    scoringStrategy: "sum",
    scoringVersion: "1.0.0",
    status: "published",
  };

  await blueprintRef.set(blueprint);

  // 2. Seed Question Versions
  const qvReading1 = {
    schemaVersion: 1,
    id: "qv-reading-1",
    questionId: "q-reading-1",
    programId: "general-english-cefr",
    frameworkVersion: "2020",
    levelId: "a1",
    sectionType: "reading",
    skill: "reading",
    interactionType: "single_choice",
    difficulty: "a1",
    topicIds: ["greetings"],
    objectiveIds: ["obj-1"],
    promptBlocks: [
      {
        type: "text",
        content: 'Choose the correct response to: "How are you?"',
      },
    ],
    options: [
      { id: "opt-1", text: "I'm fine, thank you!" },
      { id: "opt-2", text: "Goodbye!" },
      { id: "opt-3", text: "My name is John." },
    ],
    mediaRefs: [],
    scoringDefinition: { correctOptionId: "opt-1" },
    explanation: '"I\'m fine, thank you!" is the standard response to "How are you?".',
    sourceRefs: [],
    authorUid: "system",
    reviewerUid: "system",
    status: "approved",
    version: 1,
    createdAt: now,
  };

  const qvGrammar1 = {
    schemaVersion: 1,
    id: "qv-grammar-1",
    questionId: "q-grammar-1",
    programId: "general-english-cefr",
    frameworkVersion: "2020",
    levelId: "a1",
    sectionType: "grammar",
    skill: "grammar",
    interactionType: "gap_fill",
    difficulty: "a1",
    topicIds: ["verbs"],
    objectiveIds: ["obj-2"],
    promptBlocks: [
      {
        type: "text",
        content: 'Complete the sentence: "He [is] a teacher." (Write the correct missing verb "is" in the input)',
      },
    ],
    options: [],
    mediaRefs: [],
    scoringDefinition: { correctAnswers: ["is"] },
    explanation: 'The correct form of verb be for "He" is "is".',
    sourceRefs: [],
    authorUid: "system",
    reviewerUid: "system",
    status: "approved",
    version: 1,
    createdAt: now,
  };

  const qvGrammar2 = {
    schemaVersion: 1,
    id: "qv-grammar-2",
    questionId: "q-grammar-2",
    programId: "general-english-cefr",
    frameworkVersion: "2020",
    levelId: "a1",
    sectionType: "grammar",
    skill: "grammar",
    interactionType: "reorder_tokens",
    difficulty: "a1",
    topicIds: ["syntax"],
    objectiveIds: ["obj-3"],
    promptBlocks: [
      {
        type: "text",
        content: 'Reorder the words to make a correct sentence: "like I English"',
      },
    ],
    options: [
      { id: "i", text: "I" },
      { id: "like", text: "like" },
      { id: "english", text: "English" },
    ],
    mediaRefs: [],
    scoringDefinition: { correctTokenIds: ["i", "like", "english"] },
    explanation: 'Subject-Verb-Object word order results in "I like English".',
    sourceRefs: [],
    authorUid: "system",
    reviewerUid: "system",
    status: "approved",
    version: 1,
    createdAt: now,
  };

  await Promise.all([
    db.collection(COLLECTIONS.questionVersions).doc("qv-reading-1").set(qvReading1),
    db.collection(COLLECTIONS.questionVersions).doc("qv-grammar-1").set(qvGrammar1),
    db.collection(COLLECTIONS.questionVersions).doc("qv-grammar-2").set(qvGrammar2),
  ]);

  // 3. Seed Exam Form Version
  const formVersion = {
    schemaVersion: 1,
    id: "form-version-eng-a1",
    blueprintId: "blueprint-eng-a1",
    blueprintVersion: 1,
    orderedQuestionVersionIds: ["qv-reading-1", "qv-grammar-1", "qv-grammar-2"],
    publicSectionSnapshots: [
      {
        id: "section-reading",
        title: "Reading Section",
        order: 0,
        durationSeconds: 300,
        questions: [
          {
            id: "qv-reading-1",
            questionId: "q-reading-1",
            interactionType: "single_choice",
            promptBlocks: qvReading1.promptBlocks,
            options: qvReading1.options,
          },
        ],
      },
      {
        id: "section-grammar",
        title: "Grammar & Vocabulary",
        order: 1,
        durationSeconds: 300,
        questions: [
          {
            id: "qv-grammar-1",
            questionId: "q-grammar-1",
            interactionType: "gap_fill",
            promptBlocks: qvGrammar1.promptBlocks,
            options: qvGrammar1.options,
          },
          {
            id: "qv-grammar-2",
            questionId: "q-grammar-2",
            interactionType: "reorder_tokens",
            promptBlocks: qvGrammar2.promptBlocks,
            options: qvGrammar2.options,
          },
        ],
      },
    ],
    checksum: "a".repeat(64),
    status: "published",
    publishedAt: now,
  };

  await db.collection(COLLECTIONS.examFormVersions).doc("form-version-eng-a1").set(formVersion);
}
