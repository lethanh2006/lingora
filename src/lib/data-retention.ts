/**
 * Data Retention Service — dọn dẹp bản ghi hết hạn theo chính sách lưu trữ
 *
 * Chính sách:
 *  - `idempotencyKeys`: xóa tất cả document có `expiresAt` < now
 *  - `rateLimits`: xóa tất cả document có `windowEnd` < now (window đã đóng,
 *    không còn cần giữ để giới hạn rate)
 *
 * Firestore giới hạn mỗi batch tối đa 500 operations.
 * Service này chia thành nhiều batch nhỏ để xử lý an toàn.
 */

import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "./firebase/collections.ts";

const BATCH_SIZE = 400; // An toàn dưới giới hạn 500 của Firestore

export interface RetentionReport {
  idempotencyKeysDeleted: number;
  rateLimitsDeleted: number;
  durationMs: number;
}

/**
 * Xóa tất cả bản ghi hết hạn trong idempotencyKeys và rateLimits.
 * Tham số `now` có thể truyền vào để kiểm thử — mặc định là thời điểm hiện tại.
 */
export async function runDataRetentionCleanup(
  db: Firestore,
  now: Date = new Date(),
): Promise<RetentionReport> {
  const start = Date.now();

  const [idempotencyKeysDeleted, rateLimitsDeleted] = await Promise.all([
    deleteExpiredIdempotencyKeys(db, now),
    deleteExpiredRateLimits(db, now),
  ]);

  return {
    idempotencyKeysDeleted,
    rateLimitsDeleted,
    durationMs: Date.now() - start,
  };
}

async function deleteExpiredIdempotencyKeys(db: Firestore, now: Date): Promise<number> {
  let totalDeleted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db
      .collection(COLLECTIONS.idempotencyKeys)
      .where("expiresAt", "<", now)
      .limit(BATCH_SIZE)
      .get();

    if (snap.empty) break;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    totalDeleted += snap.size;

    // Nếu ít hơn BATCH_SIZE thì không còn trang tiếp theo
    if (snap.size < BATCH_SIZE) break;
  }

  return totalDeleted;
}

async function deleteExpiredRateLimits(db: Firestore, now: Date): Promise<number> {
  let totalDeleted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db
      .collection(COLLECTIONS.rateLimits)
      .where("windowEnd", "<", now)
      .limit(BATCH_SIZE)
      .get();

    if (snap.empty) break;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    totalDeleted += snap.size;

    if (snap.size < BATCH_SIZE) break;
  }

  return totalDeleted;
}
