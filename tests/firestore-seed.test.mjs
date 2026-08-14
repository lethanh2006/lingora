import assert from "node:assert/strict";
import test from "node:test";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { createFirestoreSeedStore } from "../src/features/content/seed/firestore-seed.ts";
import { seedPilotCatalog } from "../src/features/content/seed/pilot-catalog.ts";

test("Firestore seed can run twice without duplicates", async () => {
  const app = initializeApp({ projectId: "demo-lingora" }, "pilot-seed-test");

  try {
    const firestore = getFirestore(app);
    const store = createFirestoreSeedStore(firestore);
    const timestamp = Timestamp.fromMillis(1_700_000_000_000);
    const firstRun = await seedPilotCatalog(store, timestamp);
    const secondRun = await seedPilotCatalog(store, Timestamp.now());
    const [languages, programs] = await Promise.all([
      firestore.collection("languages").get(),
      firestore.collection("programs").get(),
    ]);
    const english = languages.docs.find(({ id }) => id === "en")?.data();

    assert.equal(firstRun.created.length, 6);
    assert.equal(secondRun.skipped.length, 6);
    assert.equal(languages.size, 3);
    assert.equal(programs.size, 3);
    assert.ok(english?.createdAt instanceof Timestamp);
    assert.equal(english.createdAt.toMillis(), timestamp.toMillis());
  } finally {
    await deleteApp(app);
  }
});
