/**
 * Audit Log Service — ghi lại mọi hành động nhạy cảm vào Firestore
 *
 * Thiết kế:
 *  - Mỗi sự kiện quan trọng (publish, approve, delete, compile...) đều
 *    tạo một document trong collection `auditLogs`.
 *  - Document được ghi ngoài transaction chính để không chặn luồng
 *    nghiệp vụ nếu audit log thất bại (fire-and-forget với log lỗi).
 *  - Cung cấp hằng số kiểu AuditAction để tránh string literal phân tán.
 */

import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "./firebase/collections.ts";
import { AUDIT_LOG_SCHEMA_VERSION } from "../features/content/schemas/audit-log.schema.ts";
import { logger } from "./logger.ts";

// ─── Action constants ─────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Content workflow
  LESSON_SUBMIT_REVIEW: "submit_review_lesson",
  LESSON_APPROVE:       "approve_lesson",
  LESSON_REJECT:        "reject_lesson",
  LESSON_RETIRE:        "retire_lesson",
  LESSON_PUBLISH:       "publish_lesson",

  // Exam lifecycle
  EXAM_COMPILE:         "compile_exam",

  // Account management
  ACCOUNT_DELETE:       "delete_account",

  // Admin source / media
  SOURCE_CREATE:        "create_source",
  SOURCE_UPDATE:        "update_source",
  SOURCE_DELETE:        "delete_source",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface WriteAuditLogOptions {
  /** UID của admin hoặc user thực hiện hành động */
  actorUid: string;
  /** Loại hành động — dùng hằng số AUDIT_ACTIONS */
  action: AuditAction | string;
  /** Loại entity bị tác động (lesson, exam, user, source…) */
  entityType: string;
  /** ID của entity bị tác động */
  entityId: string;
  /** ID phiên bản nếu có (revisionId) */
  revisionId?: string | null;
  /** Metadata bổ sung tuỳ theo từng action */
  metadata?: Record<string, unknown>;
}

/**
 * Ghi một audit log entry vào Firestore.
 * Hàm này không throw — lỗi ghi audit log được log ra stderr nhưng
 * không làm gián đoạn luồng nghiệp vụ chính.
 */
export async function writeAuditLog(
  db: Firestore,
  options: WriteAuditLogOptions,
): Promise<void> {
  try {
    const { actorUid, action, entityType, entityId, revisionId, metadata } = options;
    const now = new Date();

    await db.collection(COLLECTIONS.auditLogs).add({
      schemaVersion: AUDIT_LOG_SCHEMA_VERSION,
      actorUid,
      action,
      entityType,
      entityId,
      revisionId: revisionId ?? null,
      metadata: metadata ?? {},
      createdAt: now,
    });
  } catch (err) {
    // Audit log thất bại không được làm hỏng request chính
    logger.error("Failed to write audit log", {
      error: err,
      metadata: { action: options.action, entityType: options.entityType, entityId: options.entityId },
    });
  }
}

/**
 * Ghi audit log trong một Firestore transaction đang mở sẵn.
 * Dùng khi muốn audit log và nghiệp vụ chính là atomic.
 */
export function writeAuditLogInTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction: any,
  db: Firestore,
  options: WriteAuditLogOptions,
): void {
  const { actorUid, action, entityType, entityId, revisionId, metadata } = options;
  const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
  transaction.create(auditLogRef, {
    schemaVersion: AUDIT_LOG_SCHEMA_VERSION,
    actorUid,
    action,
    entityType,
    entityId,
    revisionId: revisionId ?? null,
    metadata: metadata ?? {},
    createdAt: new Date(),
  });
}
