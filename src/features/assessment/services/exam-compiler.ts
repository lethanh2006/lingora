import { createHash } from "node:crypto";
import { type Firestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../../lib/firebase/collections.ts";
import {
  questionVersionSchema,
  examFormVersionSchema,
  type ExamBlueprint,
  type ExamFormVersion,
  type QuestionVersion,
  ASSESSMENT_SCHEMA_VERSION,
} from "../schemas/assessment.schema.ts";

export interface PublicQuestionVersionSnapshot {
  id: string;
  questionId: string;
  interactionType: string;
  promptBlocks: Array<{
    type: "text" | "markdown" | "html" | "audio" | "image";
    content: string;
    mediaId?: string | null;
  }>;
  options: any[];
  mediaRefs: string[];
}

export interface PublicSectionSnapshot {
  id: string;
  title: string;
  order: number;
  durationSeconds: number;
  questions: PublicQuestionVersionSnapshot[];
}

export function sanitizeQuestionVersion(qv: QuestionVersion): PublicQuestionVersionSnapshot {
  return {
    id: qv.id,
    questionId: qv.questionId,
    interactionType: qv.interactionType,
    promptBlocks: qv.promptBlocks,
    options: qv.options,
    mediaRefs: qv.mediaRefs,
  };
}

export function computeFormChecksum(data: {
  blueprintId: string;
  blueprintVersion: number;
  orderedQuestionVersionIds: string[];
  publicSectionSnapshots: PublicSectionSnapshot[];
}): string {
  const payload = JSON.stringify({
    blueprintId: data.blueprintId,
    blueprintVersion: data.blueprintVersion,
    orderedQuestionVersionIds: data.orderedQuestionVersionIds,
    publicSectionSnapshots: data.publicSectionSnapshots,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function createExamCompiler(db: Firestore) {
  return {
    async compileExamForm(
      blueprint: ExamBlueprint,
      blueprintVersion: number,
      _randomSeed?: number // Optional seed for deterministic selection in tests
    ): Promise<ExamFormVersion> {
      const publicSectionSnapshots: PublicSectionSnapshot[] = [];
      const orderedQuestionVersionIds: string[] = [];

      // Sort sections by order
      const sortedSections = [...blueprint.sections].sort((a, b) => a.order - b.order);

      for (const section of sortedSections) {
        const sectionQuestions: PublicQuestionVersionSnapshot[] = [];

        for (const slot of section.slots) {
          // Fetch candidate question versions from Firestore matching program, level, and skill
          const snapshot = await db
            .collection(COLLECTIONS.questionVersions)
            .where("programId", "==", blueprint.programId)
            .where("frameworkVersion", "==", blueprint.frameworkVersion)
            .where("levelId", "==", blueprint.levelId)
            .where("skill", "==", slot.skill)
            .where("status", "==", "approved")
            .get();

          const candidates = snapshot.docs
            .map((doc) => questionVersionSchema.parse(doc.data()))
            // Filter in-memory for other criteria to avoid composite index requirements
            .filter((qv) => {
              // Match interactionType
              if (!slot.interactionTypes.includes(qv.interactionType)) return false;
              // Match difficulty
              if (!slot.difficultyRange.includes(qv.difficulty)) return false;
              // Match topic constraints
              if (slot.topicConstraints && slot.topicConstraints.length > 0) {
                const hasMatchingTopic = qv.topicIds.some((tid) =>
                  slot.topicConstraints!.includes(tid)
                );
                if (!hasMatchingTopic) return false;
              }
              return true;
            });

          if (candidates.length < slot.questionCount) {
            throw new Error(
              `Không đủ câu hỏi trong ngân hàng câu hỏi cho slot: skill=${slot.skill}, cần=${slot.questionCount}, có=${candidates.length}`
            );
          }

          // Select questions. If randomSeed or random selection is used, sort or shuffle.
          // For simplicity and predictability, sort by ID to ensure stable selection if no seed,
          // or shuffle if desired. Let's do a deterministic selection by sorting by ID first.
          const sortedCandidates = [...candidates].sort((a, b) => a.id.localeCompare(b.id));

          // If a seed or shuffle is requested, we can shuffle deterministically.
          // Let's pick the first `questionCount` candidates.
          const selected = sortedCandidates.slice(0, slot.questionCount);

          for (const qv of selected) {
            orderedQuestionVersionIds.push(qv.id);
            sectionQuestions.push(sanitizeQuestionVersion(qv));
          }
        }

        publicSectionSnapshots.push({
          id: section.id,
          title: section.title,
          order: section.order,
          durationSeconds: section.durationSeconds,
          questions: sectionQuestions,
        });
      }

      const formRef = db.collection(COLLECTIONS.examFormVersions).doc();
      const formId = formRef.id;

      const checksum = computeFormChecksum({
        blueprintId: blueprint.id,
        blueprintVersion,
        orderedQuestionVersionIds,
        publicSectionSnapshots,
      });

      const formVersion: ExamFormVersion = {
        schemaVersion: ASSESSMENT_SCHEMA_VERSION,
        id: formId,
        blueprintId: blueprint.id,
        blueprintVersion,
        orderedQuestionVersionIds,
        publicSectionSnapshots,
        checksum,
        status: "published",
        publishedAt: Timestamp.now(),
      };

      return examFormVersionSchema.parse(formVersion);
    },
  };
}
