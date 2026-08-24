import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { createFirestoreSeedStore } from "../src/features/content/seed/firestore-seed.ts";
import { seedGradedVocabulary } from "../src/features/vocabulary/seed/graded-vocabulary.ts";
import { seedStarterVocabulary } from "../src/features/vocabulary/seed/starter-vocabulary.ts";

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
  return { projectId, credential: cert({ projectId, clientEmail, privateKey }) };
}

const app = initializeApp(getTarget());

try {
  const store = createFirestoreSeedStore(getFirestore(app));
  const timestamp = Timestamp.now();
  const starter = await seedStarterVocabulary(store, timestamp);
  const graded = await seedGradedVocabulary(store, timestamp);
  console.log(
    `Dữ liệu mẫu: tạo ${starter.created.length}, bỏ qua ${starter.skipped.length}. ` +
      `Dữ liệu phân cấp: tạo ${graded.created.length}, bỏ qua ${graded.skipped.length}.`,
  );
} catch (error) {
  console.error("Không thể khởi tạo dữ liệu từ vựng:", error);
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
