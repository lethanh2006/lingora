import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../../lib/firebase/collections.ts";
import {
  compilePublishedLesson,
} from "./publish-lesson.ts";
import {
  lessonDraftSchema,
  activityDraftSchema,
  sourceAttributionSchema,
  courseRevisionSchema,
  courseSchema,
  publishedLessonRevisionSchema,
  type PublishedLessonRevision,
} from "../schemas/content.schema.ts";
import { contentMediaSchema } from "../schemas/media.schema.ts";
import { auditLogSchema } from "../schemas/audit-log.schema.ts";

export class PublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishError";
  }
}

function recordsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
) {
  const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );
  const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );

  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}

export function createPublishService(firestore: Firestore) {
  return {
    async publishLesson(
      lessonId: string,
      publishedBy: string,
    ): Promise<PublishedLessonRevision> {
      return firestore.runTransaction(async (transaction) => {
        const lessonRef = firestore.collection(COLLECTIONS.contentLessons).doc(lessonId);
        const lessonSnap = await transaction.get(lessonRef);
        if (!lessonSnap.exists) {
          throw new PublishError(`Lesson draft ${lessonId} không tồn tại`);
        }

        const lesson = lessonDraftSchema.parse(lessonSnap.data());

        const unitRef = firestore.collection(COLLECTIONS.contentUnits).doc(lesson.unitId);
        const unitSnap = await transaction.get(unitRef);
        if (!unitSnap.exists) {
          throw new PublishError(`Unit ${lesson.unitId} không tồn tại`);
        }
        const unit = unitSnap.data()!;
        const courseId = unit.courseId;

        const courseRef = firestore.collection(COLLECTIONS.contentCourses).doc(courseId);
        const courseSnap = await transaction.get(courseRef);
        if (!courseSnap.exists) {
          throw new PublishError(`Course draft ${courseId} không tồn tại`);
        }
        const course = courseSnap.data()!;
        const programId = course.programId;

        const programRef = firestore.collection(COLLECTIONS.programs).doc(programId);
        const programSnap = await transaction.get(programRef);
        if (!programSnap.exists) {
          throw new PublishError(`Program ${programId} không tồn tại`);
        }
        const program = programSnap.data()!;
        const languageId = program.languageId;

        const activityPromises = lesson.activityRefs.map(async (id) => {
          const ref = firestore.collection(COLLECTIONS.contentActivities).doc(id);
          const snap = await transaction.get(ref);
          if (!snap.exists) {
            throw new PublishError(`Activity ${id} không tồn tại`);
          }
          return activityDraftSchema.parse(snap.data());
        });
        const activities = await Promise.all(activityPromises);

        const vocabularyPromises = lesson.vocabularyRefs.map(async (id) => {
          const ref = firestore.collection(COLLECTIONS.lexemes).doc(id);
          const snap = await transaction.get(ref);
          if (!snap.exists) {
            throw new PublishError(`Lexeme ${id} không tồn tại`);
          }
          const data = snap.data()!;
          return {
            lexemeId: id,
            term: data.term || "",
            meaningVi: data.meaningVi || "",
            pronunciation: data.pronunciation ?? null,
            example: data.example ?? null,
            mediaRefs: data.mediaRefs || [],
          };
        });
        const vocabulary = await Promise.all(vocabularyPromises);

        const allSourceRefs = Array.from(
          new Set([
            ...lesson.sourceRefs,
            ...activities.flatMap((a) => a.sourceRefs || []),
          ])
        );

        const sourcePromises = allSourceRefs.map(async (id) => {
          const ref = firestore.collection(COLLECTIONS.contentSources).doc(id);
          const snap = await transaction.get(ref);
          if (!snap.exists) {
            throw new PublishError(`Source ${id} không tồn tại`);
          }
          return sourceAttributionSchema.parse(snap.data());
        });
        const sourceAttributions = await Promise.all(sourcePromises);

        const neededMediaIds: string[] = [];
        for (const a of activities) {
          if (a.type === "listening_choice") {
            neededMediaIds.push(a.audioMediaId);
          }
          if (a.type === "vocabulary_card") {
            for (const entry of a.entries) {
              neededMediaIds.push(...entry.mediaRefs);
            }
          }
        }
        const uniqueMediaIds = Array.from(new Set(neededMediaIds));

        const mediaPromises = uniqueMediaIds.map(async (id) => {
          const ref = firestore.collection(COLLECTIONS.contentMedia).doc(id);
          const snap = await transaction.get(ref);
          if (!snap.exists) {
            throw new PublishError(`Media registry cho ${id} không tồn tại`);
          }
          const media = contentMediaSchema.parse(snap.data());
          return {
            id: media.id,
            storagePath: media.storagePath,
            contentType: media.contentType,
            sizeBytes: media.sizeBytes,
            checksum: media.checksum,
          };
        });
        const mediaManifest = await Promise.all(mediaPromises);

        const revisionsColl = firestore.collection(COLLECTIONS.publishedLessonRevisions);
        const latestRevisionQuery = revisionsColl
          .where("lessonId", "==", lessonId);
        const querySnap = await transaction.get(latestRevisionQuery);

        let revisionNumber = 1;
        let latestRevision: PublishedLessonRevision | null = null;
        if (!querySnap.empty) {
          const docs = querySnap.docs.map(d => publishedLessonRevisionSchema.parse({ id: d.id, ...d.data() }));
          docs.sort((a, b) => b.revisionNumber - a.revisionNumber);
          latestRevision = docs[0];
          revisionNumber = latestRevision.revisionNumber + 1;
        }

        if (latestRevision) {
          const comparableLesson =
            lesson.status === "published"
              ? { ...lesson, status: "approved" as const }
              : lesson;
          const candidate = compilePublishedLesson({
            revisionId: latestRevision.id,
            revisionNumber: latestRevision.revisionNumber,
            publishedAt: latestRevision.publishedAt,
            publishedBy: latestRevision.publishedBy,
            lesson: comparableLesson,
            courseId,
            programId,
            languageId,
            activities,
            vocabulary,
            mediaManifest,
            sourceAttributions,
          });

          if (candidate.checksum === latestRevision.checksum) {
            if (lesson.status !== "published") {
              transaction.update(lessonRef, {
                status: "published",
                updatedAt: Timestamp.now(),
              });
            }
            return latestRevision;
          }
        }

        const now = Timestamp.now();
        const revisionId = `${lessonId}-rev-${revisionNumber}`;

        const compiled = compilePublishedLesson({
          revisionId,
          revisionNumber,
          publishedAt: now,
          publishedBy,
          lesson,
          courseId,
          programId,
          languageId,
          activities,
          vocabulary,
          mediaManifest,
          sourceAttributions,
        });

        const revisionRef = revisionsColl.doc(revisionId);
        transaction.set(revisionRef, compiled);

        transaction.update(lessonRef, {
          status: "published",
          updatedAt: now,
        });

        const auditLogRef = firestore.collection(COLLECTIONS.auditLogs).doc();
        const auditLog = auditLogSchema.parse({
          schemaVersion: 1,
          actorUid: publishedBy,
          action: "publish_lesson",
          entityType: "lesson",
          entityId: lessonId,
          revisionId,
          metadata: {
            title: lesson.title,
            revisionNumber,
          },
          createdAt: now,
        });
        transaction.create(auditLogRef, auditLog);

        return compiled;
      });
    },

    async publishCourse(
      courseId: string,
      publishedBy: string,
      releaseNotes: string = "Release mới",
    ) {
      return firestore.runTransaction(async (transaction) => {
        const courseRef = firestore.collection(COLLECTIONS.courses).doc(courseId);
        const courseDraftRef = firestore.collection(COLLECTIONS.contentCourses).doc(courseId);
        const [courseSnap, courseDraftSnap] = await Promise.all([
          transaction.get(courseRef),
          transaction.get(courseDraftRef),
        ]);

        if (!courseDraftSnap.exists) {
          throw new PublishError(`Course draft ${courseId} không tồn tại`);
        }

        const courseDraft = courseSchema.parse(courseDraftSnap.data());

        const unitsSnap = await transaction.get(
          firestore
            .collection(COLLECTIONS.contentUnits)
            .where("courseId", "==", courseId),
        );

        const sortedUnitsDocs = [...unitsSnap.docs].sort(
          (a, b) => (a.data().order || 0) - (b.data().order || 0)
        );

        const orderedUnitIds = sortedUnitsDocs.map((doc) => doc.id);
        const lessonRevisionMap: Record<string, string> = {};

        for (const unitDoc of sortedUnitsDocs) {
          const lessonsSnap = await transaction.get(
            firestore
              .collection(COLLECTIONS.contentLessons)
              .where("unitId", "==", unitDoc.id),
          );

          const sortedLessonsDocs = [...lessonsSnap.docs].sort(
            (a, b) => (a.data().order || 0) - (b.data().order || 0)
          );

          for (const lessonDoc of sortedLessonsDocs) {
            const revSnap = await transaction.get(
              firestore
                .collection(COLLECTIONS.publishedLessonRevisions)
                .where("lessonId", "==", lessonDoc.id),
            );

            if (revSnap.empty) {
              throw new PublishError(
                `Lesson ${lessonDoc.id} chưa được publish revision nào`
              );
            }
            const revDocs = revSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            revDocs.sort((a, b) => b.revisionNumber - a.revisionNumber);
            lessonRevisionMap[lessonDoc.id] = revDocs[0].id;
          }
        }

        const revisionsColl = firestore.collection(COLLECTIONS.publishedCourseRevisions);
        const latestRevisionQuery = revisionsColl
          .where("courseId", "==", courseId);
        const querySnap = await transaction.get(latestRevisionQuery);

        let revisionNumber = 1;
        let latestRevision = null;
        if (!querySnap.empty) {
          const docs = querySnap.docs.map(d => courseRevisionSchema.parse({ id: d.id, ...d.data() }));
          docs.sort((a, b) => b.revisionNumber - a.revisionNumber);
          latestRevision = docs[0];
          revisionNumber = latestRevision.revisionNumber + 1;
        }

        const currentPublishedRevisionId = courseSnap.exists
          ? courseSnap.data()?.currentPublishedRevisionId
          : null;
        if (
          latestRevision &&
          currentPublishedRevisionId === latestRevision.id &&
          latestRevision.releaseNotes === releaseNotes &&
          JSON.stringify(latestRevision.orderedUnitIds) === JSON.stringify(orderedUnitIds) &&
          recordsEqual(latestRevision.lessonRevisionMap, lessonRevisionMap)
        ) {
          if (courseDraft.status !== "published") {
            transaction.update(courseDraftRef, {
              status: "published",
              updatedAt: Timestamp.now(),
            });
          }
          return latestRevision;
        }

        const now = Timestamp.now();
        const revisionId = `${courseId}-rev-${revisionNumber}`;

        const courseRevision = courseRevisionSchema.parse({
          schemaVersion: 1,
          id: revisionId,
          courseId,
          revisionNumber,
          orderedUnitIds,
          lessonRevisionMap,
          releaseNotes,
          publishedAt: now,
          publishedBy,
        });

        const revisionRef = revisionsColl.doc(revisionId);
        transaction.set(revisionRef, courseRevision);

        if (courseSnap.exists) {
          transaction.update(courseRef, {
            currentPublishedRevisionId: revisionId,
            status: "published",
            updatedAt: now,
          });
        } else {
          transaction.create(courseRef, {
            ...courseDraft,
            status: "published",
            currentPublishedRevisionId: revisionId,
            createdAt: now,
            updatedAt: now,
          });
        }

        transaction.update(courseDraftRef, {
          status: "published",
          updatedAt: now,
        });

        const auditLogRef = firestore.collection(COLLECTIONS.auditLogs).doc();
        const auditLog = auditLogSchema.parse({
          schemaVersion: 1,
          actorUid: publishedBy,
          action: "publish_course",
          entityType: "course",
          entityId: courseId,
          revisionId,
          metadata: {
            title: courseDraft.title,
            revisionNumber,
          },
          createdAt: now,
        });
        transaction.create(auditLogRef, auditLog);

        return courseRevision;
      });
    },

    async rollbackCourse(
      courseId: string,
      targetRevisionId: string,
      actorUid: string,
      reason: string,
    ) {
      return firestore.runTransaction(async (transaction) => {
        const courseRef = firestore.collection(COLLECTIONS.courses).doc(courseId);
        const courseSnap = await transaction.get(courseRef);
        if (!courseSnap.exists) {
          throw new PublishError(`Course ${courseId} không tồn tại`);
        }

        const revisionRef = firestore
          .collection(COLLECTIONS.publishedCourseRevisions)
          .doc(targetRevisionId);
        const revisionSnap = await transaction.get(revisionRef);
        if (!revisionSnap.exists) {
          throw new PublishError(`Course revision ${targetRevisionId} không tồn tại`);
        }

        const revision = revisionSnap.data()!;
        if (revision.courseId !== courseId) {
          throw new PublishError(
            `Revision ${targetRevisionId} không thuộc course ${courseId}`
          );
        }

        const now = Timestamp.now();
        transaction.update(courseRef, {
          currentPublishedRevisionId: targetRevisionId,
          updatedAt: now,
        });

        const auditLogRef = firestore.collection(COLLECTIONS.auditLogs).doc();
        const auditLog = auditLogSchema.parse({
          schemaVersion: 1,
          actorUid,
          action: "rollback_course",
          entityType: "course",
          entityId: courseId,
          revisionId: targetRevisionId,
          metadata: {
            reason,
            revisionNumber: revision.revisionNumber,
          },
          createdAt: now,
        });
        transaction.create(auditLogRef, auditLog);
      });
    },
  };
}
