import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { jsonError } from "@/lib/http";
import {
  stableIdSchema,
  documentIdSchema,
  contentStatusSchema,
} from "@/features/content/schemas/content.schema";
import {
  interactionTypeSchema,
  promptBlockSchema,
  ASSESSMENT_SCHEMA_VERSION,
} from "@/features/assessment/schemas/assessment.schema";
import { auditLogSchema } from "@/features/content/schemas/audit-log.schema";

const questionSavePayloadSchema = z.object({
  questionId: stableIdSchema,
  programId: stableIdSchema,
  frameworkVersion: z.string().trim().min(1).max(80).default("2020"),
  levelId: stableIdSchema,
  sectionType: stableIdSchema,
  skill: stableIdSchema,
  interactionType: interactionTypeSchema,
  difficulty: stableIdSchema,
  topicIds: z.array(stableIdSchema).default([]),
  objectiveIds: z.array(stableIdSchema).default([]),
  promptBlocks: z.array(promptBlockSchema).min(1),
  options: z.array(z.any()).default([]),
  mediaRefs: z.array(documentIdSchema).default([]),
  scoringDefinition: z.any(),
  explanation: z.string().trim().min(1).max(5000),
  sourceRefs: z.array(documentIdSchema).default([]),
  status: contentStatusSchema.default("draft"),
});

const MAX_REQUEST_BYTES = 64 * 1024; // 64KB for question definition with options & prompt

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request body too large", 413);
    }

    const payload = questionSavePayloadSchema.parse(JSON.parse(bodyText));
    const db = getAdminDb();
    const now = Timestamp.now();

    const result = await db.runTransaction(async (transaction) => {
      const questionRef = db.collection(COLLECTIONS.questions).doc(payload.questionId);
      const questionSnap = await transaction.get(questionRef);

      let nextVersion = 1;
      let isNew = true;

      if (questionSnap.exists) {
        isNew = false;
        const qData = questionSnap.data()!;
        // Fetch current latest version number
        const latestVerId = qData.latestVersionId;
        if (latestVerId) {
          const verRef = db.collection(COLLECTIONS.questionVersions).doc(latestVerId);
          const verSnap = await transaction.get(verRef);
          if (verSnap.exists) {
            nextVersion = (verSnap.data()?.version || 0) + 1;
          }
        }
      }

      const versionDocId = `qv-${payload.questionId}-${nextVersion}`;
      const versionRef = db.collection(COLLECTIONS.questionVersions).doc(versionDocId);

      const questionDocData = {
        schemaVersion: ASSESSMENT_SCHEMA_VERSION,
        id: payload.questionId,
        latestVersionId: versionDocId,
        status: payload.status,
        createdAt: isNew ? now : (questionSnap.data()?.createdAt || now),
        updatedAt: now,
      };

      const questionVersionData = {
        schemaVersion: ASSESSMENT_SCHEMA_VERSION,
        id: versionDocId,
        questionId: payload.questionId,
        programId: payload.programId,
        frameworkVersion: payload.frameworkVersion,
        levelId: payload.levelId,
        sectionType: payload.sectionType,
        skill: payload.skill,
        interactionType: payload.interactionType,
        difficulty: payload.difficulty,
        topicIds: payload.topicIds,
        objectiveIds: payload.objectiveIds,
        promptBlocks: payload.promptBlocks,
        options: payload.options,
        mediaRefs: payload.mediaRefs,
        scoringDefinition: payload.scoringDefinition,
        explanation: payload.explanation,
        sourceRefs: payload.sourceRefs,
        authorUid: user.uid,
        reviewerUid: null,
        status: payload.status,
        version: nextVersion,
        createdAt: now,
      };

      // Set files
      transaction.set(questionRef, questionDocData);
      transaction.set(versionRef, questionVersionData);

      // Audit Logging
      const auditLogRef = db.collection(COLLECTIONS.auditLogs).doc();
      const auditLog = auditLogSchema.parse({
        schemaVersion: 1,
        actorUid: user.uid,
        action: isNew ? "create_question" : "update_question",
        entityType: "question",
        entityId: payload.questionId,
        revisionId: versionDocId,
        metadata: {
          version: nextVersion,
          status: payload.status,
        },
        createdAt: now,
      });
      transaction.create(auditLogRef, auditLog);

      return {
        questionId: payload.questionId,
        versionDocId,
        version: nextVersion,
      };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return jsonError("Invalid request payload", 400);
    }
    console.error("Failed to save question draft", error);
    return jsonError("Internal Server Error", 500);
  }
}
