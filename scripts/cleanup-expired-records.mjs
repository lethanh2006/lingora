/**
 * scripts/cleanup-expired-records.mjs
 *
 * Script dọn dẹp bản ghi hết hạn theo chính sách lưu trữ dữ liệu.
 * Có thể chạy thủ công hoặc lên lịch tự động (Cloud Scheduler / cron).
 *
 * Sử dụng:
 *   npm run cleanup:retention
 *
 * Yêu cầu:
 *   - Biến môi trường FIREBASE_SERVICE_ACCOUNT_KEY hoặc Google ADC
 *   - Hoặc: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 để chạy với emulator
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { runDataRetentionCleanup } from "../src/lib/data-retention.ts";

process.on("unhandledRejection", (reason) => {
  const msg = reason?.message || "";
  if (msg.includes("Could not load the default credentials")) {
    console.warn(`\n[WARNING] Không thể tải Google Cloud credentials.`);
    console.warn(`Để chạy script này, hãy dùng một trong các cách sau:`);
    console.warn(`  1. Đặt biến môi trường FIREBASE_SERVICE_ACCOUNT_KEY`);
    console.warn(`  2. Chạy với Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run cleanup:retention\n`);
    process.exit(0);
  } else {
    console.error("Unhandled Rejection:", reason);
    process.exit(1);
  }
});

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-lingora";

if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp({ projectId });
  }
}

const db = getFirestore();

console.log("=== LINGORA DATA RETENTION CLEANUP ===");
console.log(`Project: ${projectId}`);
console.log(`Started: ${new Date().toISOString()}`);
console.log("---------------------------------------");

try {
  const report = await runDataRetentionCleanup(db);

  console.log(`✓ idempotencyKeys đã xóa : ${report.idempotencyKeysDeleted} bản ghi`);
  console.log(`✓ rateLimits đã xóa      : ${report.rateLimitsDeleted} bản ghi`);
  console.log(`✓ Thời gian thực thi     : ${report.durationMs}ms`);
  console.log("---------------------------------------");
  console.log("Dọn dẹp hoàn tất.");
} catch (err) {
  console.error("Lỗi khi dọn dẹp dữ liệu:", err.message);
  process.exit(1);
}
