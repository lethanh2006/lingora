import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { createFirestoreSeedStore } from "../src/features/content/seed/firestore-seed.ts";
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
  const result = await seedStarterVocabulary(
    createFirestoreSeedStore(getFirestore(app)),
    Timestamp.now(),
  );
  console.log(`Đã tạo ${result.created.length}, bỏ qua ${result.skipped.length} mục từ vựng.`);
} catch (error) {
  console.error("Không thể khởi tạo dữ liệu từ vựng:", error);
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
