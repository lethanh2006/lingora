import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { createFirestoreSeedStore } from "../src/features/content/seed/firestore-seed.ts";
import {
  seedPilotCatalog,
  seedPilotContent,
  seedPilotExams,
} from "../src/features/content/seed/pilot-catalog.ts";
import { createValidationService } from "../src/features/content/services/validation-service.ts";
import { createPublishService } from "../src/features/content/services/publish-service.ts";

function getTarget() {
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? (emulator ? "demo-lingora" : "");

  if (!projectId) throw new Error("Thiếu FIREBASE_ADMIN_PROJECT_ID");

  if (emulator) return { projectId };

  const confirmation = `--confirm-project=${projectId}`;
  if (!process.argv.includes(confirmation)) {
    throw new Error(`Seed production yêu cầu tham số xác nhận ${confirmation}`);
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("Thiếu Firebase Admin credentials");

  return {
    projectId,
    credential: cert({ projectId, clientEmail, privateKey }),
  };
}

const target = getTarget();
const app = initializeApp(target);
const firestore = getFirestore(app);

try {
  const now = Timestamp.now();
  const seedStore = createFirestoreSeedStore(firestore);

  // 1. Seed Languages and Programs (Catalog)
  console.log("Seeding languages and programs...");
  const catalogResult = await seedPilotCatalog(seedStore, now);
  console.log(`Đã tạo ${catalogResult.created.length}, bỏ qua ${catalogResult.skipped.length} document.`);

  // 2. Seed Pilot Content Drafts
  console.log("Seeding pilot content drafts (courses, units, lessons, activities, lexemes)...");
  const contentResult = await seedPilotContent(seedStore, now);
  console.log(`Đã tạo ${contentResult.created.length}, bỏ qua ${contentResult.skipped.length} document.`);

  // 3. Seed Pilot Exam questions, blueprints, and forms
  console.log("Seeding pilot exam blueprints, form versions, and 60 questions...");
  const examResult = await seedPilotExams(seedStore, now);
  console.log(`Đã tạo ${examResult.created.length}, bỏ qua ${examResult.skipped.length} document.`);

  // 4. Validate and Publish all 12 Lessons
  console.log("Validating and publishing lessons...");
  const validationService = createValidationService(firestore);
  const publishService = createPublishService(firestore);

  const lessonIds = [
    // English
    "en-basics-u1-l1", "en-basics-u1-l2", "en-basics-u1-l3", "en-basics-u1-l4",
    // Japanese
    "ja-basics-u1-l1", "ja-basics-u1-l2", "ja-basics-u1-l3", "ja-basics-u1-l4",
    // Chinese
    "zh-basics-u1-l1", "zh-basics-u1-l2", "zh-basics-u1-l3", "zh-basics-u1-l4",
  ];

  for (const lessonId of lessonIds) {
    const report = await validationService.validateLesson(lessonId);
    if (report.errors.length > 0) {
      throw new Error(`Lesson ${lessonId} validation failed: ${report.errors.join(", ")}`);
    }
    const revision = await publishService.publishLesson(lessonId, "system");
    console.log(`  + Published lesson: ${lessonId} (Revision: ${revision.id})`);
  }

  // 5. Publish all 3 Courses
  console.log("Publishing courses...");
  const courseIds = [
    "english-a1-foundations",
    "japanese-a1-communication",
    "chinese-level1-foundation",
  ];

  for (const courseId of courseIds) {
    const revision = await publishService.publishCourse(courseId, "system", "Pilot release");
    console.log(`  + Published course: ${courseId} (Revision: ${revision.id})`);
  }

  console.log("Seeding and publishing completed successfully!");
} catch (error) {
  console.error("Lỗi trong quá trình seeding:", error);
  process.exit(1);
} finally {
  await deleteApp(app);
}
