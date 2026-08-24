import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { programSchema, stableIdSchema } from "../content/schemas/content.schema.ts";
import {
  enrollmentSchema,
  type Enrollment,
} from "./schemas/enrollment.schema.ts";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "../../lib/firebase/collections.ts";

const DEFAULT_DAILY_GOAL_MINUTES = 15;

export class EnrollmentProgramUnavailableError extends Error {
  constructor() {
    super("Program is not available for enrollment");
    this.name = "EnrollmentProgramUnavailableError";
  }
}

function assertUserId(userId: string) {
  if (!userId || userId.length > 128 || userId.includes("/")) {
    throw new Error("User ID không hợp lệ");
  }
}

function assertMatchingDocumentId(
  value: { id?: unknown },
  documentId: string,
  path: string,
) {
  if (value.id !== documentId) {
    throw new Error(`Document ${path} có field id không khớp path`);
  }
}

function enrollmentReference(firestore: Firestore, userId: string, programId: string) {
  return firestore
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.enrollments)
    .doc(programId);
}

export function createEnrollmentService(firestore: Firestore) {
  return {
    async getEnrollment(userId: string, programId: string): Promise<Enrollment | null> {
      assertUserId(userId);
      stableIdSchema.parse(programId);
      const snapshot = await enrollmentReference(firestore, userId, programId).get();
      if (!snapshot.exists) return null;

      const parseResult = enrollmentSchema.safeParse(snapshot.data());
      if (!parseResult.success) {
        // Legacy enrollment document doesn't match current schema — treat as not enrolled
        // so the user can re-enroll cleanly. Log for debugging.
        console.warn(
          `[EnrollmentService] getEnrollment: schema mismatch for ${snapshot.ref.path}, treating as null.`,
          parseResult.error.flatten()
        );
        return null;
      }
      const enrollment = parseResult.data;
      if (enrollment.programId !== snapshot.id) {
        throw new Error(`Document ${snapshot.ref.path} có programId không khớp path`);
      }
      return enrollment;
    },

    async enroll(
      userId: string,
      programId: string,
    ): Promise<{ enrollment: Enrollment; created: boolean }> {
      assertUserId(userId);
      stableIdSchema.parse(programId);
      const programReference = firestore.collection(COLLECTIONS.programs).doc(programId);
      const targetReference = enrollmentReference(firestore, userId, programId);

      return firestore.runTransaction(async (transaction) => {
        const [programSnapshot, enrollmentSnapshot] = await Promise.all([
          transaction.get(programReference),
          transaction.get(targetReference),
        ]);

        if (!programSnapshot.exists) throw new EnrollmentProgramUnavailableError();

        const program = programSchema.parse(programSnapshot.data());
        assertMatchingDocumentId(program, programSnapshot.id, programSnapshot.ref.path);
        if (program.status !== "published") throw new EnrollmentProgramUnavailableError();

        if (enrollmentSnapshot.exists) {
          const existing = enrollmentSchema.safeParse(enrollmentSnapshot.data());
          if (existing.success) {
            if (existing.data.programId !== enrollmentSnapshot.id) {
              throw new Error(
                `Document ${enrollmentSnapshot.ref.path} có programId không khớp path`,
              );
            }
            return { enrollment: existing.data, created: false };
          }
          // Legacy document: fall through to overwrite with new format below
          console.warn(
            `[EnrollmentService] enroll: legacy enrollment for ${enrollmentSnapshot.ref.path}, will overwrite.`,
          );
        }

        const now = Timestamp.now();
        const enrollment = enrollmentSchema.parse({
          schemaVersion: 1,
          programId,
          currentCourseId: null,
          currentLessonId: null,
          targetLevelId: null,
          goalType: null,
          dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES,
          status: "active",
          enrolledAt: now,
          lastActivityAt: now,
        });
        // Use set() instead of create() so this works even when a seed document already exists
        transaction.set(targetReference, enrollment);
        return { enrollment, created: true };
      });
    },
  };
}

export type EnrollmentService = ReturnType<typeof createEnrollmentService>;
