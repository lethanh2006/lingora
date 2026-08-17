import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../../lib/firebase/collections.ts";
import { lessonDraftSchema, activityDraftSchema } from "../schemas/content.schema.ts";

export function createValidationService(firestore: Firestore) {
  return {
    async validateLesson(
      lessonId: string,
    ): Promise<{ errors: string[]; warnings: string[] }> {
      const lessonRef = firestore.collection(COLLECTIONS.contentLessons).doc(lessonId);
      const lessonSnap = await lessonRef.get();
      if (!lessonSnap.exists) {
        throw new Error(`Lesson draft ${lessonId} không tồn tại`);
      }

      const lesson = lessonDraftSchema.parse(lessonSnap.data());
      const errors: string[] = [];
      const warnings: string[] = [];

      if (lesson.activityRefs.length === 0) {
        errors.push("Lesson phải có ít nhất một activity");
      }
      for (const activityId of lesson.activityRefs) {
        const snap = await firestore
          .collection(COLLECTIONS.contentActivities)
          .doc(activityId)
          .get();
        if (!snap.exists) {
          errors.push(`Activity ${activityId} không tồn tại`);
        } else {
          try {
            activityDraftSchema.parse(snap.data());
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Activity ${activityId} không hợp lệ: ${msg}`);
          }
        }
      }

      for (const lexemeId of lesson.vocabularyRefs) {
        const snap = await firestore.collection(COLLECTIONS.lexemes).doc(lexemeId).get();
        if (!snap.exists) {
          errors.push(`Lexeme ${lexemeId} không tồn tại`);
        }
      }
      if (lesson.vocabularyRefs.length === 0) {
        warnings.push("Lesson không có từ vựng nào được tham chiếu");
      }

      for (const sourceId of lesson.sourceRefs) {
        const snap = await firestore
          .collection(COLLECTIONS.contentSources)
          .doc(sourceId)
          .get();
        if (!snap.exists) {
          errors.push(`Source ${sourceId} không tồn tại`);
        }
      }

      const now = Timestamp.now();
      await lessonRef.update({
        validationReport: {
          errors,
          warnings,
          validatedAt: now,
        },
        updatedAt: now,
      });

      return { errors, warnings };
    },
  };
}
