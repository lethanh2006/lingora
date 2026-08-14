import assert from "node:assert/strict";
import test from "node:test";

import {
  createPilotCatalogSeed,
  seedPilotCatalog,
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
