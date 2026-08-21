import assert from "node:assert/strict";
import test from "node:test";

import { createDeletionService } from "../src/features/user/services/deletion-service.ts";

function createMockFirestore() {
  const store = new Map(); // path -> data

  function getDocsForCollection(collectionPath) {
    const docs = [];
    for (const [key, val] of store.entries()) {
      const lastSlash = key.lastIndexOf("/");
      const parent = key.substring(0, lastSlash);
      const id = key.substring(lastSlash + 1);
      if (parent === collectionPath) {
        docs.push({
          id,
          exists: true,
          data: () => val,
          ref: makeDocRef(key, id),
        });
      }
    }
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
    };
  }

  function makeDocRef(docPath, docId) {
    return {
      path: docPath,
      id: docId,
      collection(subName) {
        return makeCollectionRef(`${docPath}/${subName}`);
      },
      async get() {
        const data = store.get(docPath);
        return {
          exists: data !== undefined,
          data: () => data,
          ref: this,
        };
      },
      async delete() {
        store.delete(docPath);
      },
      async set(data) {
        store.set(docPath, data);
      },
    };
  }

  function makeCollectionRef(collectionPath) {
    return {
      path: collectionPath,
      doc(docId) {
        return makeDocRef(`${collectionPath}/${docId}`, docId);
      },
      async get() {
        return getDocsForCollection(collectionPath);
      },
    };
  }

  return {
    collection(name) {
      return makeCollectionRef(name);
    },
  };
}

test("deletion service deletes user document and all subcollections recursively (mocked)", async () => {
  const firestore = createMockFirestore();
  const deletionService = createDeletionService(firestore);
  const testUid = "test-delete-learner";

  // 1. Populate various user-owned collections & nested documents
  const userDocRef = firestore.collection("users").doc(testUid);
  await userDocRef.set({ displayName: "Delete Me", email: "delete@example.com", role: "user" });

  // Enrollments
  const enrollmentsColl = userDocRef.collection("enrollments");
  await enrollmentsColl.doc("program-1").set({ status: "active" });

  // Lesson Progress
  const progressColl = userDocRef.collection("lessonProgress");
  await progressColl.doc("lesson-1").set({ completed: true });

  // Review Items
  const reviewsColl = userDocRef.collection("reviewItems");
  await reviewsColl.doc("review-1").set({ intervalDays: 1 });

  // Daily Stats
  const statsColl = userDocRef.collection("dailyStats");
  await statsColl.doc("2026-08-19").set({ minutesSpended: 15 });

  const topicProgressColl = userDocRef.collection("topicProgress");
  await topicProgressColl.doc("greetings").set({ sessionsCompleted: 2 });

  const practiceDaysColl = userDocRef.collection("practiceDays");
  await practiceDaysColl.doc("2026-08-20").set({ sessionsCompleted: 1 });

  // Attempts and nested sections
  const attemptsColl = userDocRef.collection("attempts");
  const attemptDocRef = attemptsColl.doc("attempt-1");
  await attemptDocRef.set({ blueprintId: "blueprint-1" });

  const sectionsColl = attemptDocRef.collection("sections");
  await sectionsColl.doc("section-1").set({ answers: { q1: "choice-a" } });

  // 2. Perform validation checks to verify documents exist before delete
  assert.ok((await userDocRef.get()).exists);
  assert.equal((await enrollmentsColl.get()).size, 1);
  assert.equal((await progressColl.get()).size, 1);
  assert.equal((await reviewsColl.get()).size, 1);
  assert.equal((await statsColl.get()).size, 1);
  assert.equal((await topicProgressColl.get()).size, 1);
  assert.equal((await practiceDaysColl.get()).size, 1);
  assert.equal((await attemptsColl.get()).size, 1);
  assert.equal((await sectionsColl.get()).size, 1);

  // 3. Execute recursive user deletion
  await deletionService.deleteUserData(testUid);

  // 4. Assert all documents and subcollections are deleted
  assert.equal((await userDocRef.get()).exists, false);
  assert.equal((await enrollmentsColl.get()).empty, true);
  assert.equal((await progressColl.get()).empty, true);
  assert.equal((await reviewsColl.get()).empty, true);
  assert.equal((await statsColl.get()).empty, true);
  assert.equal((await topicProgressColl.get()).empty, true);
  assert.equal((await practiceDaysColl.get()).empty, true);
  assert.equal((await attemptsColl.get()).empty, true);
  assert.equal((await sectionsColl.get()).empty, true);
});
