import assert from "node:assert/strict";
import test from "node:test";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { createFirestoreSeedStore } from "../src/features/content/seed/firestore-seed.ts";
import { seedStarterVocabulary } from "../src/features/vocabulary/seed/starter-vocabulary.ts";
import { createVocabularyAdminService } from "../src/features/vocabulary/vocabulary-admin.service.ts";
import { createVocabularyProgressService } from "../src/features/vocabulary/vocabulary-progress.service.ts";
import { createVocabularyRepository } from "../src/features/vocabulary/vocabulary.repository.ts";

test("admin vocabulary is immediately readable and learner progress starts empty", async () => {
  const app = initializeApp({ projectId: "demo-lingora" }, `vocabulary-flow-${Date.now()}`);

  try {
    const db = getFirestore(app);
    const repository = createVocabularyRepository(db);
    const admin = createVocabularyAdminService(db);
    const progressService = createVocabularyProgressService(db);
    const uid = "new-vocabulary-learner";

    const initialProgress = await progressService.listProgress(uid);
    assert.deepEqual(initialProgress, []);

    const seedResult = await seedStarterVocabulary(createFirestoreSeedStore(db), Timestamp.now());
    assert.equal(seedResult.created.length, 27);
    assert.equal((await repository.listTopics()).length, 3);

    const topic = await admin.createTopic({
      title: "Đồ ăn tiếng Anh",
      description: "Từ vựng ăn uống",
      languageCode: "en",
      icon: "🍜",
      accent: "amber",
      order: 10,
      isVisible: true,
    });
    const word = await admin.createWord(topic.id, {
      term: "noodle",
      meaning: "mì",
      pronunciation: "/ˈnuː.dəl/",
      example: "I like noodles.",
      exampleMeaning: "Tôi thích mì.",
      imageUrl: "",
      order: 0,
      isVisible: true,
    });
    assert.ok(word);

    const learnerTopic = await repository.getTopic(topic.id);
    const learnerWords = await repository.listWords(topic.id);
    assert.equal(learnerTopic?.wordCount, 1);
    assert.deepEqual(learnerWords.map((item) => item.term), ["noodle"]);

    const progress = await progressService.recordSession(uid, {
      topicId: topic.id,
      mode: "flashcards",
      correctAnswers: 1,
      totalAnswers: 1,
      studiedWordIds: [word.id],
      masteredWordIds: [word.id],
      durationSeconds: 25,
    });
    assert.deepEqual(progress.practicedModes, ["flashcards"]);
    assert.deepEqual(progress.masteredWordIds, [word.id]);
    assert.equal(progress.sessionsCompleted, 1);

    await admin.updateWord(topic.id, word.id, {
      term: word.term,
      meaning: word.meaning,
      pronunciation: word.pronunciation ?? "",
      example: word.example ?? "",
      exampleMeaning: word.exampleMeaning ?? "",
      imageUrl: word.imageUrl ?? "",
      order: word.order,
      isVisible: false,
    });
    assert.equal((await repository.getTopic(topic.id))?.wordCount, 0);
    assert.equal((await repository.listWords(topic.id)).length, 0);
  } finally {
    await deleteApp(app);
  }
});
