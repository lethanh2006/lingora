import { type Firestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../lib/firebase/collections.ts";
import {
  questionSchema,
  questionVersionSchema,
  examBlueprintSchema,
  examFormVersionSchema,
  type Question,
  type QuestionVersion,
  type ExamBlueprint,
  type ExamFormVersion,
  ASSESSMENT_SCHEMA_VERSION,
} from "./schemas/assessment.schema.ts";
import { ASSESSMENT_QUERY_CARDS } from "./query-cards.ts";

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

    async getPublishedBlueprint(blueprintId: string): Promise<ExamBlueprint | null> {
      const snap = await db.collection(COLLECTIONS.examBlueprints).doc(blueprintId).get();
      if (!snap.exists) return null;

      const blueprint = examBlueprintSchema.parse(snap.data());
      if (blueprint.id !== snap.id) {
        throw new Error(`Blueprint ${snap.ref.path} có field id không khớp path`);
      }
      return blueprint.status === "published" ? blueprint : null;
    },

    async listPublishedBlueprints(): Promise<ExamBlueprint[]> {
      const snapshot = await db
        .collection(COLLECTIONS.examBlueprints)
        .where("status", "==", "published")
        .limit(ASSESSMENT_QUERY_CARDS.listPublishedBlueprints.limit)
        .get();

      return snapshot.docs.map((document) => {
        const blueprint = examBlueprintSchema.parse(document.data());
        if (blueprint.id !== document.id) {
          throw new Error(`Blueprint ${document.ref.path} có field id không khớp path`);
        }
        return blueprint;
      });
    },

    async getLatestPublishedFormVersion(
      blueprintId: string,
    ): Promise<ExamFormVersion | null> {
      const snapshot = await db
        .collection(COLLECTIONS.examFormVersions)
        .where("blueprintId", "==", blueprintId)
        .where("status", "==", "published")
        .get();
      if (snapshot.empty) return null;

      const docs = snapshot.docs.map((doc) => {
        const formVersion = examFormVersionSchema.parse(doc.data());
        if (formVersion.id !== doc.id) {
          throw new Error(`Exam form ${doc.ref.path} có field id không khớp path`);
        }
        return formVersion;
      });

      docs.sort((a, b) => {
        const timeA = a.publishedAt.seconds + a.publishedAt.nanoseconds / 1e9;
        const timeB = b.publishedAt.seconds + b.publishedAt.nanoseconds / 1e9;
        return timeB - timeA;
      });

      return docs[0];
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
