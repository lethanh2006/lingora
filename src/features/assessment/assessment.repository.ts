import { type Firestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../lib/firebase/collections.ts";
import {
  questionSchema,
  questionVersionSchema,
  examBlueprintSchema,
  type Question,
  type QuestionVersion,
  type ExamBlueprint,
  ASSESSMENT_SCHEMA_VERSION,
} from "./schemas/assessment.schema.ts";

export function createAssessmentRepository(db: Firestore) {
  return {
    async getQuestion(questionId: string): Promise<Question | null> {
      const snap = await db.collection(COLLECTIONS.questions).doc(questionId).get();
      if (!snap.exists) return null;
      return questionSchema.parse(snap.data());
    },

    async getQuestionVersion(versionId: string): Promise<QuestionVersion | null> {
      const snap = await db.collection(COLLECTIONS.questionVersions).doc(versionId).get();
      if (!snap.exists) return null;
      return questionVersionSchema.parse(snap.data());
    },

    async createQuestion(
      questionId: string,
      input: Omit<QuestionVersion, "schemaVersion" | "id" | "questionId" | "version" | "createdAt">,
      createdAt: Timestamp = Timestamp.now()
    ): Promise<{ question: Question; version: QuestionVersion }> {
      const versionRef = db.collection(COLLECTIONS.questionVersions).doc();
      const questionRef = db.collection(COLLECTIONS.questions).doc(questionId);

      const versionId = versionRef.id;

      const questionData: Question = {
        schemaVersion: ASSESSMENT_SCHEMA_VERSION,
        id: questionId,
        latestVersionId: versionId,
        status: input.status,
        createdAt,
        updatedAt: createdAt,
      };

      const versionData: QuestionVersion = {
        ...input,
        schemaVersion: ASSESSMENT_SCHEMA_VERSION,
        id: versionId,
        questionId,
        version: 1,
        createdAt,
      };

      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(questionRef);
        if (snap.exists) {
          throw new Error("Question already exists");
        }
        transaction.set(questionRef, questionSchema.parse(questionData));
        transaction.set(versionRef, questionVersionSchema.parse(versionData));
      });

      return { question: questionData, version: versionData };
    },

    async updateQuestion(
      questionId: string,
      input: Omit<QuestionVersion, "schemaVersion" | "id" | "questionId" | "version" | "createdAt">,
      updatedAt: Timestamp = Timestamp.now()
    ): Promise<{ question: Question; version: QuestionVersion }> {
      const questionRef = db.collection(COLLECTIONS.questions).doc(questionId);
      const versionRef = db.collection(COLLECTIONS.questionVersions).doc();
      const versionId = versionRef.id;

      const result = await db.runTransaction(async (transaction) => {
        const questionSnap = await transaction.get(questionRef);
        if (!questionSnap.exists) {
          throw new Error("Question not found");
        }

        const currentQuestion = questionSchema.parse(questionSnap.data());
        const latestVersionSnap = await transaction.get(
          db.collection(COLLECTIONS.questionVersions).doc(currentQuestion.latestVersionId)
        );

        if (!latestVersionSnap.exists) {
          throw new Error("Latest question version not found");
        }

        const latestVersion = questionVersionSchema.parse(latestVersionSnap.data());
        const nextVersionNumber = latestVersion.version + 1;

        const newQuestionData: Question = {
          ...currentQuestion,
          latestVersionId: versionId,
          status: input.status,
          updatedAt,
        };

        const newVersionData: QuestionVersion = {
          ...input,
          schemaVersion: ASSESSMENT_SCHEMA_VERSION,
          id: versionId,
          questionId,
          version: nextVersionNumber,
          createdAt: updatedAt,
        };

        transaction.set(questionRef, questionSchema.parse(newQuestionData));
        transaction.set(versionRef, questionVersionSchema.parse(newVersionData));

        return { question: newQuestionData, version: newVersionData };
      });

      return result;
    },

    async getBlueprint(blueprintId: string): Promise<ExamBlueprint | null> {
      const snap = await db.collection(COLLECTIONS.examBlueprints).doc(blueprintId).get();
      if (!snap.exists) return null;
      return examBlueprintSchema.parse(snap.data());
    },

    async saveBlueprint(
      blueprintId: string,
      input: Omit<ExamBlueprint, "schemaVersion" | "id">
    ): Promise<ExamBlueprint> {
      const ref = db.collection(COLLECTIONS.examBlueprints).doc(blueprintId);
      const data: ExamBlueprint = {
        ...input,
        schemaVersion: ASSESSMENT_SCHEMA_VERSION,
        id: blueprintId,
      };
      await ref.set(examBlueprintSchema.parse(data));
      return data;
    },
  };
}
