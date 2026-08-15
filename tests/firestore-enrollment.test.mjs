import assert from "node:assert/strict";
import test from "node:test";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import {
  createEnrollmentService,
  EnrollmentProgramUnavailableError,
} from "../src/features/enrollment/enrollment.service.ts";
import { createPilotCatalogSeed } from "../src/features/content/seed/pilot-catalog.ts";

test("enrollment service creates one document and safely handles retries", async () => {
  const app = initializeApp({ projectId: "demo-lingora" }, "enrollment-idempotency-test");

  try {
    const firestore = getFirestore(app);
    const program = createPilotCatalogSeed(Timestamp.fromMillis(1_700_000_000_000)).find(
      ({ collection, id }) => collection === "programs" && id === "general-english-cefr",
    );
    assert.ok(program);
    await firestore.collection(program.collection).doc(program.id).set(program.data);

    const service = createEnrollmentService(firestore);
    const [first, retry] = await Promise.all([
      service.enroll("learner-one", program.id),
      service.enroll("learner-one", program.id),
    ]);
    const snapshot = await firestore
      .collection("users")
      .doc("learner-one")
      .collection("enrollments")
      .get();
    const stored = await service.getEnrollment("learner-one", program.id);

    assert.equal([first.created, retry.created].filter(Boolean).length, 1);
    assert.equal(snapshot.size, 1);
    assert.equal(stored?.programId, program.id);
    assert.equal(stored?.status, "active");
    assert.ok(stored?.enrolledAt instanceof Timestamp);
    assert.equal(stored?.enrolledAt.toMillis(), stored?.lastActivityAt.toMillis());
  } finally {
    await deleteApp(app);
  }
});

test("enrollment service rejects missing and unpublished programs", async () => {
  const app = initializeApp({ projectId: "demo-lingora" }, "enrollment-program-test");

  try {
    const firestore = getFirestore(app);
    const program = createPilotCatalogSeed(Timestamp.fromMillis(1_700_000_000_000)).find(
      ({ collection, id }) => collection === "programs" && id === "general-english-cefr",
    );
    assert.ok(program);
    await firestore
      .collection(program.collection)
      .doc(program.id)
      .set({ ...program.data, status: "draft" });

    const service = createEnrollmentService(firestore);
    await assert.rejects(
      service.enroll("learner-two", program.id),
      EnrollmentProgramUnavailableError,
    );
    await assert.rejects(
      service.enroll("learner-two", "missing-program"),
      EnrollmentProgramUnavailableError,
    );

    const snapshot = await firestore
      .collection("users")
      .doc("learner-two")
      .collection("enrollments")
      .get();
    assert.equal(snapshot.empty, true);
  } finally {
    await deleteApp(app);
  }
});
