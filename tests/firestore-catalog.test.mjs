import assert from "node:assert/strict";
import test from "node:test";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { createCatalogRepository } from "../src/features/catalog/catalog.repository.ts";
import { createPilotCatalogSeed } from "../src/features/content/seed/pilot-catalog.ts";

function course(id, programId, order, status = "published") {
  const timestamp = Timestamp.fromMillis(1_700_000_000_000);
  return {
    schemaVersion: 1,
    id,
    programId,
    levelId: "a1",
    title: `Course ${id}`,
    description: `Mô tả cho ${id}`,
    coverMediaId: null,
    estimatedMinutes: 90,
    currentPublishedRevisionId: null,
    status,
    order,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

test("catalog repository returns only published DTOs in configured order", async () => {
  const app = initializeApp({ projectId: "demo-lingora" }, "catalog-repository-test");

  try {
    const firestore = getFirestore(app);
    const timestamp = Timestamp.fromMillis(1_700_000_000_000);
    const seed = createPilotCatalogSeed(timestamp);
    const programDocuments = seed.filter(({ collection }) => collection === "programs");
    await Promise.all(
      programDocuments.map(({ collection, id, data }) =>
        firestore.collection(collection).doc(id).set(data),
      ),
    );
    await Promise.all([
      firestore
        .collection("courses")
        .doc("english-second")
        .set(course("english-second", "general-english-cefr", 2)),
      firestore
        .collection("courses")
        .doc("english-first")
        .set(course("english-first", "general-english-cefr", 1)),
      firestore
        .collection("courses")
        .doc("english-draft")
        .set(course("english-draft", "general-english-cefr", 0, "draft")),
      firestore
        .collection("courses")
        .doc("japanese-first")
        .set(course("japanese-first", "japanese-communication-jf", 0)),
    ]);

    const repository = createCatalogRepository(firestore);
    const programs = await repository.listPublishedPrograms();
    const courses = await repository.listPublishedCourses("general-english-cefr");

    assert.deepEqual(programs.map(({ languageId }) => languageId), ["en", "ja", "zh"]);
    assert.deepEqual(courses.map(({ id }) => id), ["english-first", "english-second"]);
    assert.equal("createdAt" in programs[0], false);
    assert.equal("updatedAt" in courses[0], false);
    assert.equal((await repository.getPublishedProgram("missing")), null);
    assert.equal((await repository.getPublishedCourse("english-draft")), null);
    assert.equal((await repository.getPublishedCourse("english-first"))?.order, 1);
  } finally {
    await deleteApp(app);
  }
});
