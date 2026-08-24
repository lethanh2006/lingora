/**
 * Idempotency Guard — bảo vệ chống nộp kép (double-submit)
 *
 * Nguyên lý hoạt động:
 *  1. Client gửi header `Idempotency-Key: <uuid>` cùng với request.
 *  2. Server thực hiện Firestore transaction để kiểm tra key này đã tồn tại chưa.
 *  3. Nếu chưa → tạo bản ghi `idempotencyKeys/<key>` (trạng thái "processing"),
 *     thực thi handler thực sự, cập nhật kết quả vào bản ghi, rồi trả về.
 *  4. Nếu đã tồn tại với trạng thái "done" → trả ngay kết quả lưu sẵn (HTTP 200).
 *  5. Nếu trạng thái "processing" → request song song đang chạy, trả 409.
 *  6. Key hết hạn sau TTL_SECONDS (mặc định 24 giờ) → tự động bị bỏ qua.
 */

import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "./firebase/collections.ts";

const TTL_SECONDS = 24 * 60 * 60; // 24 giờ

export type IdempotencyStatus = "processing" | "done";

export interface IdempotencyRecord {
  key: string;
  uid: string;
  action: string;
  status: IdempotencyStatus;
  responseBody: unknown;
  createdAt: any;
  expiresAt: any;
}

export type IdempotencyResult =
  | { type: "new" }
  | { type: "duplicate"; responseBody: unknown }
  | { type: "conflict" };

/**
 * Kiểm tra và đặt chỗ idempotency key trong Firestore transaction.
 * Trả về:
 *  - `{ type: "new" }` → key chưa tồn tại, caller được phép thực thi.
 *  - `{ type: "duplicate", responseBody }` → đã có kết quả thành công trước đó.
 *  - `{ type: "conflict" }` → key đang trong trạng thái processing (request song song).
 */
export async function checkIdempotency(
  db: Firestore,
  key: string,
  uid: string,
  action: string,
): Promise<IdempotencyResult> {
  const docRef = db.collection(COLLECTIONS.idempotencyKeys).doc(key);
  const now = new Date();

  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(docRef);

    if (snap.exists) {
      const data = snap.data() as IdempotencyRecord;

      // Nếu key hết hạn → coi như key mới
      const expiresAt =
        typeof data.expiresAt?.toDate === "function"
          ? data.expiresAt.toDate()
          : data.expiresAt;
      if (now > expiresAt) {
        // Ghi đè bằng bản ghi processing mới
        tx.set(docRef, buildRecord(key, uid, action, now));
        return { type: "new" };
      }

      if (data.uid !== uid) {
        // Key này thuộc về user khác — từ chối
        return { type: "conflict" };
      }

      if (data.status === "done") {
        return { type: "duplicate", responseBody: data.responseBody };
      }

      // status === "processing" → đang trong quá trình xử lý
      return { type: "conflict" };
    }

    // Key chưa tồn tại → đặt chỗ
    tx.set(docRef, buildRecord(key, uid, action, now));
    return { type: "new" };
  });
}

/**
 * Đánh dấu key đã hoàn thành, lưu kết quả để trả lại khi có request trùng.
 */
export async function markIdempotencyDone(
  db: Firestore,
  key: string,
  responseBody: unknown,
): Promise<void> {
  const docRef = db.collection(COLLECTIONS.idempotencyKeys).doc(key);
  await docRef.update({
    status: "done",
    responseBody,
  });
}

function buildRecord(
  key: string,
  uid: string,
  action: string,
  now: Date,
): Omit<IdempotencyRecord, "responseBody"> & { responseBody: null } {
  const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000);
  return {
    key,
    uid,
    action,
    status: "processing",
    responseBody: null,
    createdAt: now,
    expiresAt,
  };
}
