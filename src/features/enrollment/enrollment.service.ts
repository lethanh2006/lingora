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

      const enrollment = enrollmentSchema.parse(snapshot.data());
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
          const enrollment = enrollmentSchema.parse(enrollmentSnapshot.data());
          if (enrollment.programId !== enrollmentSnapshot.id) {
            throw new Error(
              `Document ${enrollmentSnapshot.ref.path} có programId không khớp path`,
            );
          }
          return { enrollment, created: false };
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
        transaction.create(targetReference, enrollment);
        return { enrollment, created: true };
      });
    },
  };
}

export type EnrollmentService = ReturnType<typeof createEnrollmentService>;
