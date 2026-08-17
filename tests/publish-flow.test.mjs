import assert from "node:assert/strict";
import test from "node:test";

import { createPublishService } from "../src/features/content/services/publish-service.ts";
import { createValidationService } from "../src/features/content/services/validation-service.ts";
import { createSourceService } from "../src/features/content/services/source-service.ts";
import { createMediaService } from "../src/features/content/services/media-service.ts";
import {
  timestamp,
} from "./fixtures/content.mjs";

function createMockDb(initialData = {}) {
  const store = new Map();
  for (const [key, val] of Object.entries(initialData)) {
    store.set(key, structuredClone(val));
  }

  const db = {
    store,
    collection(collectionName) {
      return {
        doc(docId) {
          const path = `${collectionName}/${docId}`;
          return {
            path,
            id: docId,
            async get() {
              const data = store.get(path);
              return {
                exists: !!data,
                id: docId,
                ref: { path },
                data() {
                  return data ? structuredClone(data) : undefined;
                },
              };
            },
            async set(data) {
              store.set(path, structuredClone(data));
            },
            async update(data) {
              const current = store.get(path) || {};
              store.set(path, { ...current, ...data });
            },
            async delete() {
              store.delete(path);
            },
          };
        },
        where(field, op, value) {
          return {
            orderBy(orderField, direction) {
              return {
                limit(limitVal) {
                  return {
                    async get() {
                      const docs = [];
                      for (const [path, data] of store.entries()) {
                        if (path.startsWith(`${collectionName}/`) && data[field] === value) {
                          docs.push({
                            id: path.split("/")[1],
                            data() {
                              return structuredClone(data);
                            },
                          });
                        }
                      }
                      docs.sort((a, b) => {
                        const valA = a.data()[orderField] || 0;
                        const valB = b.data()[orderField] || 0;
                        return direction === "desc" ? valB - valA : valA - valB;
                      });
                      return {
                        empty: docs.length === 0,
                        docs: docs.slice(0, limitVal),
                      };
                    },
                  };
                },
              };
            },
            async get() {
              const docs = [];
              for (const [path, data] of store.entries()) {
                if (path.startsWith(`${collectionName}/`) && data[field] === value) {
                  docs.push({
                    id: path.split("/")[1],
                    data() {
                      return structuredClone(data);
                    },
                  });
                }
              }
              return {
                empty: docs.length === 0,
                docs,
              };
            },
          };
        },
        async get() {
          const docs = [];
          for (const [path, data] of store.entries()) {
            if (path.startsWith(`${collectionName}/`)) {
              docs.push({
                id: path.split("/")[1],
                data() {
                  return structuredClone(data);
                },
              });
            }
          }
          return {
            empty: docs.length === 0,
            docs,
          };
        },
      };
    },
    async runTransaction(callback) {
      const transaction = {
        async get(ref) {
          return ref.get();
        },
        create(ref, data) {
          store.set(ref.path, structuredClone(data));
        },
        set(ref, data) {
          store.set(ref.path, structuredClone(data));
        },
        update(ref, data) {
          const current = store.get(ref.path) || {};
          store.set(ref.path, { ...current, ...data });
        },
      };
      return callback(transaction);
    },
  };

  return db;
}

test("source CRUD service manages contentSources and sourceAttributions registry", async () => {
  const db = createMockDb();
  const sourceService = createSourceService(db);

  const source = {
    id: "source-test-id",
    title: "Test Source",
    publisher: "Publisher A",
    canonicalUrl: "https://example.com/source",
    licenseCode: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attributionText: "Attributed to Publisher A",
  };
  const created = await sourceService.createSource(source);
  assert.equal(created.id, "source-test-id");
  assert.equal(db.store.has("contentSources/source-test-id"), true);
  assert.equal(db.store.has("sourceAttributions/source-test-id"), true);

  const fetched = await sourceService.getSource("source-test-id");
  assert.equal(fetched.title, "Test Source");

  await sourceService.updateSource("source-test-id", { title: "Updated Title" });
  const updated = await sourceService.getSource("source-test-id");
  assert.equal(updated.title, "Updated Title");
  assert.equal(db.store.get("sourceAttributions/source-test-id").title, "Updated Title");

  const list = await sourceService.listSources();
  assert.equal(list.length, 1);

  await sourceService.deleteSource("source-test-id");
  assert.equal(db.store.has("contentSources/source-test-id"), false);
  assert.equal(db.store.has("sourceAttributions/source-test-id"), false);
});

test("media registry service generates signed upload URL and stores metadata", async () => {
  const db = createMockDb();
  const storageMock = {
    bucket() {
      return {
        file(storagePath) {
          return {
            async getSignedUrl() {
              return [`https://storage.googleapis.com/${storagePath}?signed=true`];
            },
          };
        },
      };
    },
  };
  const mediaService = createMediaService(db, storageMock);

  const result = await mediaService.generateUploadUrl({
    id: "media-test",
    fileName: "file.mp3",
    contentType: "audio/mpeg",
    sizeBytes: 5000,
    checksum: "a".repeat(64),
    contentId: "lesson-test",
  });

  assert.equal(result.storagePath, "media/content/lesson-test/media-test/file.mp3");
  assert.ok(result.uploadUrl.includes("signed=true"));
  assert.equal(db.store.has("contentMedia/media-test"), true);
});

test("validation service checks draft lesson activity/lexeme/source integrity", async () => {
  const db = createMockDb();
  const validationService = createValidationService(db);

  const lesson = {
    schemaVersion: 1,
    id: "lesson-val-test",
    unitId: "unit-1",
    title: "Lesson Title",
    summary: "Lesson Summary",
    objectives: ["Objective 1"],
    estimatedMinutes: 10,
    order: 0,
    activityRefs: ["activity-1"],
    vocabularyRefs: ["lexeme-1"],
    sourceRefs: ["source-1"],
    status: "draft",
    validationReport: {
      errors: [],
      warnings: [],
      validatedAt: null,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.store.set("contentLessons/lesson-val-test", lesson);

  const result = await validationService.validateLesson("lesson-val-test");
  assert.equal(result.errors.length, 3);
  assert.ok(result.errors[0].includes("Activity activity-1 không tồn tại"));
  assert.ok(result.errors[1].includes("Lexeme lexeme-1 không tồn tại"));
  assert.ok(result.errors[2].includes("Source source-1 không tồn tại"));

  const stored = db.store.get("contentLessons/lesson-val-test");
  assert.equal(stored.validationReport.errors.length, 3);
  assert.ok(stored.validationReport.validatedAt !== null);
});

test("publish service compiles and publishes draft lesson inside transaction", async () => {
  const lesson = {
    schemaVersion: 1,
    id: "hello-and-goodbye",
    unitId: "greetings",
    title: "Hello & Goodbye",
    summary: "Learn to greet people.",
    objectives: ["Greet people"],
    estimatedMinutes: 5,
    order: 1,
    activityRefs: ["act-1"],
    vocabularyRefs: ["lex-1"],
    sourceRefs: ["src-1"],
    status: "approved",
    validationReport: { errors: [], warnings: [], validatedAt: timestamp },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const activity = {
    id: "act-1",
    type: "explanation",
    instruction: "Read the explanation.",
    prompt: "Explanation Prompt",
    skill: "reading",
    difficulty: "easy",
    estimatedSeconds: 60,
    required: true,
    sourceRefs: ["src-1"],
    body: "This is body",
  };

  const lexeme = {
    term: "hello",
    meaningVi: "xin chào",
    pronunciation: "/həˈləʊ/",
    example: "Hello!",
    mediaRefs: [],
  };

  const source = {
    id: "src-1",
    title: "Test Source",
    publisher: "Publisher A",
    canonicalUrl: "https://example.com/source",
    licenseCode: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attributionText: "Attributed to Publisher A",
  };

  const unit = { id: "greetings", courseId: "english-a1" };
  const course = { id: "english-a1", programId: "general-english" };
  const program = { id: "general-english", languageId: "en" };

  const db = createMockDb({
    "contentLessons/hello-and-goodbye": lesson,
    "contentActivities/act-1": activity,
    "lexemes/lex-1": lexeme,
    "contentSources/src-1": source,
    "contentUnits/greetings": unit,
    "contentCourses/english-a1": course,
    "programs/general-english": program,
  });

  const publishService = createPublishService(db);
  const revision = await publishService.publishLesson("hello-and-goodbye", "admin-uid");

  assert.equal(revision.lessonId, "hello-and-goodbye");
  assert.equal(revision.revisionNumber, 1);
  assert.equal(db.store.get("contentLessons/hello-and-goodbye").status, "published");
  assert.equal(db.store.has(`publishedLessonRevisions/${revision.id}`), true);

  const auditLogs = [...db.store.entries()].filter(([key]) => key.startsWith("auditLogs/"));
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0][1].action, "publish_lesson");
  assert.equal(auditLogs[0][1].entityId, "hello-and-goodbye");
  assert.equal(auditLogs[0][1].actorUid, "admin-uid");
});
