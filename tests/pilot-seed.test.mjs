import assert from "node:assert/strict";
import test from "node:test";

import {
  createPilotCatalogSeed,
  seedPilotCatalog,
  seedPilotContent,
  seedPilotExams,
} from "../src/features/content/seed/pilot-catalog.ts";
import { timestamp } from "./fixtures/content.mjs";

class MemorySeedStore {
  documents = new Map();

  async createIfMissing(document) {
    const path = `${document.collection}/${document.id}`;
    if (this.documents.has(path)) return false;
    this.documents.set(path, structuredClone(document.data));
    return true;
  }
}

test("pilot catalog contains three languages and one program per language", () => {
  const documents = createPilotCatalogSeed(timestamp);
  const languages = documents.filter(({ collection }) => collection === "languages");
  const programs = documents.filter(({ collection }) => collection === "programs");

  assert.deepEqual(languages.map(({ id }) => id), ["en", "ja", "zh"]);
  assert.deepEqual(programs.map(({ data }) => data.languageId), ["en", "ja", "zh"]);
  assert.equal(new Set(documents.map(({ collection, id }) => `${collection}/${id}`)).size, 6);
});

test("pilot seed is idempotent and never overwrites existing documents", async () => {
  const store = new MemorySeedStore();
  const firstRun = await seedPilotCatalog(store, timestamp);
  const englishPath = "languages/en";
  store.documents.get(englishPath).nameVi = "Tên đã chỉnh thủ công";

  const secondRun = await seedPilotCatalog(store, {
    seconds: timestamp.seconds + 100,
    nanoseconds: 0,
  });

  assert.equal(firstRun.created.length, 6);
  assert.equal(firstRun.skipped.length, 0);
  assert.equal(secondRun.created.length, 0);
  assert.equal(secondRun.skipped.length, 6);
  assert.equal(store.documents.size, 6);
  assert.equal(store.documents.get(englishPath).nameVi, "Tên đã chỉnh thủ công");
  assert.deepEqual(store.documents.get(englishPath).updatedAt, timestamp);
});

test("content and exam seed never overwrite documents from an earlier run", async () => {
  const store = new MemorySeedStore();
  const firstContentRun = await seedPilotContent(store, timestamp);
  const firstExamRun = await seedPilotExams(store, timestamp);
  const lessonPath = "contentLessons/en-basics-u1-l1";
  const questionPath = "questions/q-eng-1";

  store.documents.get(lessonPath).title = "Tiêu đề đã chỉnh thủ công";
  store.documents.get(questionPath).status = "retired";

  const laterTimestamp = {
    seconds: timestamp.seconds + 100,
    nanoseconds: 0,
  };
  const secondContentRun = await seedPilotContent(store, laterTimestamp);
  const secondExamRun = await seedPilotExams(store, laterTimestamp);

  assert.equal(firstContentRun.created.length, 118);
  assert.equal(firstExamRun.created.length, 126);
  assert.equal(secondContentRun.created.length, 0);
  assert.equal(secondContentRun.skipped.length, firstContentRun.created.length);
  assert.equal(secondExamRun.created.length, 0);
  assert.equal(secondExamRun.skipped.length, firstExamRun.created.length);
  assert.equal(store.documents.get(lessonPath).title, "Tiêu đề đã chỉnh thủ công");
  assert.equal(store.documents.get(questionPath).status, "retired");
  assert.deepEqual(store.documents.get(lessonPath).createdAt, timestamp);
});
