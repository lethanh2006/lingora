import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, describe, test } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  COLLECTIONS,
  USER_SUBCOLLECTIONS,
} from "../src/lib/firebase/collections.ts";

const projectId = "demo-lingora";
const ownerId = "owner-user";
const otherUserId = "other-user";
const adminId = "admin-user";

const publicDocumentPaths = [
  `${COLLECTIONS.languages}/en`,
  `${COLLECTIONS.programs}/general-english-cefr`,
  `${COLLECTIONS.courses}/english-a1-foundations`,
  `${COLLECTIONS.publishedCourseRevisions}/course-revision-1`,
  `${COLLECTIONS.publishedLessonRevisions}/lesson-revision-1`,
  `${COLLECTIONS.lexemes}/lexeme-hello`,
  `${COLLECTIONS.examCatalog}/exam-a1`,
  `${COLLECTIONS.sourceAttributions}/source-1`,
];

const privateDocumentPaths = [
  `${COLLECTIONS.contentCourses}/english-a1-foundations`,
  `${COLLECTIONS.contentUnits}/greetings`,
  `${COLLECTIONS.contentLessons}/hello-and-goodbye`,
  `${COLLECTIONS.contentActivities}/choose-greeting`,
  `${COLLECTIONS.questions}/question-1`,
  `${COLLECTIONS.questionVersions}/question-version-1`,
  `${COLLECTIONS.examBlueprints}/blueprint-1`,
  `${COLLECTIONS.examFormVersions}/exam-form-version-1`,
  `${COLLECTIONS.contentSources}/source-1`,
];

const operationalDocumentPaths = [
  `${COLLECTIONS.auditLogs}/audit-1`,
  `${COLLECTIONS.idempotencyKeys}/key-1`,
  `${COLLECTIONS.rateLimits}/bucket-1`,
  `${COLLECTIONS.publishJobs}/job-1`,
  `${COLLECTIONS.systemConfig}/config-1`,
];

const ownerDocumentPaths = [
  `${COLLECTIONS.users}/${ownerId}`,
  `${COLLECTIONS.users}/${ownerId}/${USER_SUBCOLLECTIONS.enrollments}/general-english-cefr`,
  `${COLLECTIONS.users}/${ownerId}/${USER_SUBCOLLECTIONS.lessonProgress}/hello-and-goodbye`,
  `${COLLECTIONS.users}/${ownerId}/${USER_SUBCOLLECTIONS.reviewItems}/review-1`,
  `${COLLECTIONS.users}/${ownerId}/${USER_SUBCOLLECTIONS.dailyStats}/2026-08-14`,
  `${COLLECTIONS.users}/${ownerId}/${USER_SUBCOLLECTIONS.attempts}/attempt-1`,
  `${COLLECTIONS.users}/${ownerId}/${USER_SUBCOLLECTIONS.attempts}/attempt-1/${USER_SUBCOLLECTIONS.sections}/section-1`,
];

let testEnvironment;

function emulatorAddress() {
  const value = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const separator = value.lastIndexOf(":");

  return {
    host: value.slice(0, separator),
    port: Number(value.slice(separator + 1)),
  };
}

function firestoreFor(userId, tokenOptions = {}) {
  return testEnvironment.authenticatedContext(userId, tokenOptions).firestore();
}

async function seedDocuments(paths) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all(paths.map((path) => setDoc(doc(firestore, path), { seeded: true })));
  });
}

before(async () => {
  const { host, port } = emulatorAddress();
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port,
      rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

describe("published catalog", () => {
  test("authenticated users can read every learner-safe collection", async () => {
    await seedDocuments(publicDocumentPaths);
    const firestore = firestoreFor(ownerId);

    await Promise.all(
      publicDocumentPaths.map((path) => assertSucceeds(getDoc(doc(firestore, path)))),
    );
  });

  test("anonymous users cannot read documents or list a collection", async () => {
    await seedDocuments(publicDocumentPaths);
    const firestore = testEnvironment.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(firestore, publicDocumentPaths[0])));
    await assertFails(getDocs(collection(firestore, COLLECTIONS.languages)));
  });

  test("authenticated clients can list catalog but cannot mutate it", async () => {
    await seedDocuments(publicDocumentPaths);
    const ownerFirestore = firestoreFor(ownerId);
    const adminFirestore = firestoreFor(adminId, { role: "admin" });

    await assertSucceeds(getDocs(collection(ownerFirestore, COLLECTIONS.languages)));
    await assertFails(
      setDoc(doc(ownerFirestore, COLLECTIONS.languages, "ja"), { enabled: true }),
    );
    await assertFails(
      updateDoc(doc(adminFirestore, publicDocumentPaths[0]), { enabled: false }),
    );
    await assertFails(deleteDoc(doc(adminFirestore, publicDocumentPaths[0])));
  });
});

describe("user-owned state", () => {
  test("owners can read their profile and every declared nested state path", async () => {
    await seedDocuments(ownerDocumentPaths);
    const firestore = firestoreFor(ownerId);

    await Promise.all(
      ownerDocumentPaths.map((path) => assertSucceeds(getDoc(doc(firestore, path)))),
    );
  });

  test("anonymous, other users, and client-side admins cannot read another user", async () => {
    await seedDocuments(ownerDocumentPaths);
    const anonymousFirestore = testEnvironment.unauthenticatedContext().firestore();
    const otherFirestore = firestoreFor(otherUserId);
    const adminFirestore = firestoreFor(adminId, { role: "admin" });

    for (const path of ownerDocumentPaths) {
      await assertFails(getDoc(doc(anonymousFirestore, path)));
      await assertFails(getDoc(doc(otherFirestore, path)));
      await assertFails(getDoc(doc(adminFirestore, path)));
    }
  });

  test("owners cannot write business state or elevate their role", async () => {
    await seedDocuments(ownerDocumentPaths);
    const firestore = firestoreFor(ownerId);

    await assertFails(
      updateDoc(doc(firestore, COLLECTIONS.users, ownerId), { role: "admin" }),
    );
    await assertFails(
      setDoc(
        doc(
          firestore,
          COLLECTIONS.users,
          ownerId,
          USER_SUBCOLLECTIONS.lessonProgress,
          "new-lesson",
        ),
        { completed: true },
      ),
    );
    await assertFails(deleteDoc(doc(firestore, ownerDocumentPaths[1])));
  });

  test("a scoped owner cannot query all user profiles", async () => {
    await seedDocuments(ownerDocumentPaths);
    const firestore = firestoreFor(ownerId);

    await assertFails(getDocs(collection(firestore, COLLECTIONS.users)));
  });
});

describe("server-only and unknown data", () => {
  test("private authoring and scoring data stay hidden from users and admins", async () => {
    await seedDocuments(privateDocumentPaths);
    const ownerFirestore = firestoreFor(ownerId);
    const adminFirestore = firestoreFor(adminId, { role: "admin" });

    for (const path of privateDocumentPaths) {
      await assertFails(getDoc(doc(ownerFirestore, path)));
      await assertFails(getDoc(doc(adminFirestore, path)));
      await assertFails(setDoc(doc(adminFirestore, path), { overwritten: true }));
    }
  });

  test("operational and undeclared paths are closed by default", async () => {
    await seedDocuments([...operationalDocumentPaths, "unknownCollection/document-1"]);
    const adminFirestore = firestoreFor(adminId, { role: "admin" });

    for (const path of [...operationalDocumentPaths, "unknownCollection/document-1"]) {
      await assertFails(getDoc(doc(adminFirestore, path)));
      await assertFails(setDoc(doc(adminFirestore, path), { overwritten: true }));
    }
  });

  test("the declared collection inventory has no duplicate names", () => {
    const names = [...Object.values(COLLECTIONS), ...Object.values(USER_SUBCOLLECTIONS)];
    assert.equal(new Set(names).size, names.length);
  });
});
