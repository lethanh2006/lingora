import { type Firestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "../../../lib/firebase/collections.ts";
import {
  attemptSchema,
  attemptSectionSchema,
  examFormVersionSchema,
  questionVersionSchema,
  type Attempt,
  type AttemptSection,
  type ExamBlueprint,
  type ExamFormVersion,
  type QuestionVersion,
  ASSESSMENT_SCHEMA_VERSION,
} from "../schemas/assessment.schema.ts";
import { ASSESSMENT_QUERY_CARDS } from "../query-cards.ts";

function getMillis(ts: { seconds: number; nanoseconds: number }): number {
  return ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1000000);
}

export function scoreQuestion(
  interactionType: string,
  answer: any,
  scoringDefinition: any
): number {
  if (!answer) return 0;

  switch (interactionType) {
    case "single_choice": {
      const correctId = scoringDefinition?.correctOptionId;
      return answer.selectedOptionId === correctId ? 1 : 0;
    }
    case "multiple_choice": {
      const correctIds = scoringDefinition?.correctOptionIds || [];
      const selectedIds = answer.selectedOptionIds || [];
      if (correctIds.length !== selectedIds.length) return 0;
      const correctSet = new Set(correctIds);
      return selectedIds.every((id: string) => correctSet.has(id)) ? 1 : 0;
    }
    case "gap_fill": {
      const correctAnswers = scoringDefinition?.correctAnswers || [];
      const userAnswers = answer.answers || [];
      if (correctAnswers.length !== userAnswers.length) return 0;
      return userAnswers.every(
        (ans: string, idx: number) =>
          ans.trim().toLowerCase() === correctAnswers[idx]?.trim().toLowerCase()
      ) ? 1 : 0;
    }
    case "reorder_tokens": {
      const correctTokenIds = scoringDefinition?.correctTokenIds || [];
      const selectedTokenIds = answer.selectedTokenIds || [];
      if (correctTokenIds.length !== selectedTokenIds.length) return 0;
      return selectedTokenIds.every((id: string, idx: number) => id === correctTokenIds[idx]) ? 1 : 0;
    }
    default:
      return 0;
  }
}

export function createAttemptService(db: Firestore) {
  return {
    async startAttempt(
      userId: string,
      blueprint: ExamBlueprint,
      selectedFormVersion: ExamFormVersion,
    ): Promise<{ attempt: Attempt; formVersion: ExamFormVersion }> {
      const attemptsColl = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.attempts);

      // Check if there is an active "in_progress" attempt for this user and blueprint
      const activeQuery = await attemptsColl
        .where("blueprintId", "==", blueprint.id)
        .where("state", "==", "in_progress")
        .limit(ASSESSMENT_QUERY_CARDS.findActiveAttempt.limit)
        .get();

      const now = Timestamp.now();

      if (!activeQuery.empty) {
        const doc = activeQuery.docs[0];
        const attempt = attemptSchema.parse(doc.data());

        // Check if it has expired in the meantime
        if (getMillis(attempt.expiresAt) <= getMillis(now)) {
          // Auto-submit expired attempt
          const finalized = await this.submitAndGradeAttempt(userId, attempt.id, now);
          // Proceed to create a new one since the old one is now graded/finalized
        } else {
          // Fetch corresponding form version
          const formSnap = await db
            .collection(COLLECTIONS.examFormVersions)
            .doc(attempt.examFormVersionId)
            .get();
          if (!formSnap.exists) {
            throw new Error("Exam form version not found for active attempt");
          }
          const activeFormVersion = examFormVersionSchema.parse(formSnap.data());
          if (activeFormVersion.id !== formSnap.id) {
            throw new Error("Active exam form field id does not match its document id");
          }
          return { attempt, formVersion: activeFormVersion };
        }
      }

      const formVersion = examFormVersionSchema.parse(selectedFormVersion);
      if (formVersion.blueprintId !== blueprint.id) {
        throw new Error("Exam form version does not belong to the selected blueprint");
      }
      if (formVersion.status !== "published") {
        throw new Error("Exam form version is not published");
      }

      // Create new attempt
      const attemptId = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.attempts)
        .doc().id;

      const durationMs = blueprint.durationSeconds * 1000;
      const expiresAt = new Timestamp(
        Math.floor((getMillis(now) + durationMs) / 1000),
        ((getMillis(now) + durationMs) % 1000) * 1000000
      );

      const attemptData: Attempt = {
        schemaVersion: ASSESSMENT_SCHEMA_VERSION,
        id: attemptId,
        uid: userId,
        examFormVersionId: formVersion.id,
        blueprintId: blueprint.id,
        programId: blueprint.programId,
        levelId: blueprint.levelId,
        state: "in_progress",
        startedAt: now,
        expiresAt,
        submittedAt: null,
        gradedAt: null,
        currentSectionId: blueprint.sections[0].id,
        scoringVersion: blueprint.scoringVersion,
        totalRawScore: null,
        totalPercent: null,
        skillScores: null,
        questionVersionIds: formVersion.orderedQuestionVersionIds,
        createdAt: now,
        updatedAt: now,
      };

      const attemptRef = attemptsColl.doc(attemptId);

      await db.runTransaction(async (transaction) => {
        transaction.set(attemptRef, attemptSchema.parse(attemptData));

        // Initialize empty sections
        for (const section of blueprint.sections) {
          const sectionRef = attemptRef.collection(USER_SUBCOLLECTIONS.sections).doc(section.id);
          const sectionData: AttemptSection = {
            answers: {},
            flaggedQuestionIds: [],
            lastSavedAt: now,
            clientRevision: 0,
            serverRevision: 0,
          };
          transaction.set(sectionRef, attemptSectionSchema.parse(sectionData));
        }
      });

      return { attempt: attemptData, formVersion };
    },

    async saveSectionAnswers(
      userId: string,
      attemptId: string,
      sectionId: string,
      answers: Record<string, any>,
      clientRevision: number
    ): Promise<AttemptSection> {
      const now = Timestamp.now();
      const attemptRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.attempts)
        .doc(attemptId);

      const sectionRef = attemptRef.collection(USER_SUBCOLLECTIONS.sections).doc(sectionId);

      return db.runTransaction(async (transaction) => {
        const attemptSnap = await transaction.get(attemptRef);
        if (!attemptSnap.exists) {
          throw new Error("Attempt not found");
        }

        const attempt = attemptSchema.parse(attemptSnap.data());
        if (attempt.state !== "in_progress") {
          throw new Error("Attempt is already finalized");
        }

        if (getMillis(attempt.expiresAt) <= getMillis(now)) {
          // Attempt has expired! Automatically mark as expired and grade it.
          // Since we are in transaction, we can update state immediately.
          const nextState = "expired";
          const updatedAttempt = {
            ...attempt,
            state: nextState as any,
            submittedAt: now,
            updatedAt: now,
          };
          transaction.set(attemptRef, attemptSchema.parse(updatedAttempt));
          throw new Error("Attempt has expired and cannot accept further updates");
        }

        const sectionSnap = await transaction.get(sectionRef);
        let currentSection: AttemptSection = {
          answers: {},
          flaggedQuestionIds: [],
          lastSavedAt: now,
          clientRevision: 0,
          serverRevision: 0,
        };

        if (sectionSnap.exists) {
          currentSection = attemptSectionSchema.parse(sectionSnap.data());
        }

        // Revision conflict detection
        if (clientRevision < currentSection.serverRevision) {
          throw new Error("Version conflict: client revision is stale");
        }

        const nextSection: AttemptSection = {
          answers: { ...currentSection.answers, ...answers },
          flaggedQuestionIds: currentSection.flaggedQuestionIds,
          lastSavedAt: now,
          clientRevision,
          serverRevision: currentSection.serverRevision + 1,
        };

        transaction.set(sectionRef, attemptSectionSchema.parse(nextSection));
        transaction.update(attemptRef, { updatedAt: now });

        return nextSection;
      });
    },

    async submitAndGradeAttempt(
      userId: string,
      attemptId: string,
      submittedAt: Timestamp = Timestamp.now()
    ): Promise<Attempt> {
      const attemptRef = db
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.attempts)
        .doc(attemptId);

      // Perform grading outside transaction for large reads, but update attempt state inside transaction
      const attemptSnap = await attemptRef.get();
      if (!attemptSnap.exists) {
        throw new Error("Attempt not found");
      }

      const attempt = attemptSchema.parse(attemptSnap.data());
      if (attempt.state !== "in_progress") {
        return attempt; // Already submitted/graded
      }

      const isExpired = getMillis(attempt.expiresAt) <= getMillis(submittedAt);
      const finalState = isExpired ? "expired" : "submitted";

      // 1. Fetch blueprint
      const blueprintSnap = await db
        .collection(COLLECTIONS.examBlueprints)
        .doc(attempt.blueprintId)
        .get();
      if (!blueprintSnap.exists) {
        throw new Error("Blueprint not found");
      }
      const blueprint = blueprintSnap.data() as ExamBlueprint;

      // 2. Fetch all answers across all sections
      const sectionsAnswers: Record<string, any> = {};
      for (const section of blueprint.sections) {
        const secSnap = await attemptRef
          .collection(USER_SUBCOLLECTIONS.sections)
          .doc(section.id)
          .get();
        if (secSnap.exists) {
          const secData = attemptSectionSchema.parse(secSnap.data());
          Object.assign(sectionsAnswers, secData.answers);
        }
      }

      // 3. Fetch all question versions to get scoring definitions
      const questionVersions: Record<string, QuestionVersion> = {};
      if (attempt.questionVersionIds.length > 0) {
        const qvPromises = attempt.questionVersionIds.map(async (qvid) => {
          const snap = await db.collection(COLLECTIONS.questionVersions).doc(qvid).get();
          if (snap.exists) {
            questionVersions[qvid] = questionVersionSchema.parse(snap.data());
          }
        });
        await Promise.all(qvPromises);
      }

      // 4. Calculate scores
      let totalRawScore = 0;
      let maxPossibleScore = 0;

      const skillScores: Record<
        string,
        { skill: string; rawScore: number; maxScore: number; percent: number }
      > = {};

      for (const section of blueprint.sections) {
        for (const slot of section.slots) {
          const skill = slot.skill;
          if (!skillScores[skill]) {
            skillScores[skill] = { skill, rawScore: 0, maxScore: 0, percent: 0 };
          }

          const pointsPerQuestion = slot.points / slot.questionCount;

          // Find the question versions belonging to this section slot
          const slotQuestions = attempt.questionVersionIds.filter((qvid) => {
            const qv = questionVersions[qvid];
            if (!qv) return false;
            // Match slot criteria
            if (qv.skill !== skill) return false;
            if (!slot.interactionTypes.includes(qv.interactionType)) return false;
            if (!slot.difficultyRange.includes(qv.difficulty)) return false;
            return true;
          });

          for (const qvid of slotQuestions) {
            const qv = questionVersions[qvid];
            const answer = sectionsAnswers[qvid];
            const isCorrect = scoreQuestion(qv.interactionType, answer, qv.scoringDefinition);

            const scoreEarned = isCorrect * pointsPerQuestion;
            totalRawScore += scoreEarned;
            maxPossibleScore += pointsPerQuestion;

            skillScores[skill].rawScore += scoreEarned;
            skillScores[skill].maxScore += pointsPerQuestion;
          }
        }
      }

      // Calculate percentages
      const totalPercent = maxPossibleScore > 0 ? (totalRawScore / maxPossibleScore) * 100 : 0;
      for (const skill of Object.keys(skillScores)) {
        const s = skillScores[skill];
        s.percent = s.maxScore > 0 ? (s.rawScore / s.maxScore) * 100 : 0;
      }

      // 5. Update attempt document atomically
      const updatedAttempt: Attempt = {
        ...attempt,
        state: "graded", // transition directly to graded for seamless UX
        submittedAt,
        gradedAt: submittedAt,
        totalRawScore,
        totalPercent,
        skillScores,
        updatedAt: submittedAt,
      };

      await db.runTransaction(async (transaction) => {
        transaction.set(attemptRef, attemptSchema.parse(updatedAttempt));
      });

      return updatedAttempt;
    },
  };
}
