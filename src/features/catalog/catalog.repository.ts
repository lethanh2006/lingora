import "server-only";

import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";

import {
  courseSchema,
  programSchema,
  publicCourseDtoSchema,
  publicProgramDtoSchema,
  type PublicCourseDto,
  type PublicProgramDto,
} from "../content/schemas/content.schema.ts";
import { COLLECTIONS } from "../../lib/firebase/collections.ts";
import { CATALOG_QUERY_CARDS } from "./query-cards.ts";

function parseDocument<T>(snapshot: DocumentSnapshot, parse: (value: unknown) => T) {
  const value = parse(snapshot.data());
  if (typeof value !== "object" || value === null || !("id" in value)) {
    throw new Error(`Document ${snapshot.ref.path} không có ID hợp lệ`);
  }
  if (value.id !== snapshot.id) {
    throw new Error(`Document ${snapshot.ref.path} có field id không khớp path`);
  }
  return value;
}

export function toPublicProgramDto(input: unknown): PublicProgramDto {
  const program = programSchema.parse(input);
  return publicProgramDtoSchema.parse({
    schemaVersion: program.schemaVersion,
    id: program.id,
    languageId: program.languageId,
    code: program.code,
    type: program.type,
    title: program.title,
    description: program.description,
    frameworkCode: program.frameworkCode,
    frameworkVersion: program.frameworkVersion,
    levelIds: program.levelIds,
    currentPublishedRevisionId: program.currentPublishedRevisionId,
    status: program.status,
    order: program.order,
  });
}

export function toPublicCourseDto(input: unknown): PublicCourseDto {
  const course = courseSchema.parse(input);
  return publicCourseDtoSchema.parse({
    schemaVersion: course.schemaVersion,
    id: course.id,
    programId: course.programId,
    levelId: course.levelId,
    title: course.title,
    description: course.description,
    coverMediaId: course.coverMediaId,
    estimatedMinutes: course.estimatedMinutes,
    currentPublishedRevisionId: course.currentPublishedRevisionId,
    status: course.status,
    order: course.order,
  });
}

export function createCatalogRepository(firestore: Firestore) {
  return {
    async listPublishedPrograms(): Promise<PublicProgramDto[]> {
      try {
        const snapshot = await firestore
          .collection(COLLECTIONS.programs)
          .where("status", "==", "published")
          .orderBy("order", "asc")
          .limit(CATALOG_QUERY_CARDS.listPrograms.limit)
          .get();

        return snapshot.docs.map((document) =>
          toPublicProgramDto(parseDocument(document, (value) => programSchema.parse(value))),
        );
      } catch (err: unknown) {
        const errMsg = String(err);
        if (errMsg.includes("requires an index") || errMsg.includes("FAILED_PRECONDITION")) {
          console.warn("Firestore index not ready for listPublishedPrograms. Falling back to in-memory filtering.");
          const snapshot = await firestore.collection(COLLECTIONS.programs).get();
          const programs = snapshot.docs
            .map((doc) => parseDocument(doc, (value) => programSchema.parse(value)))
            .filter((p) => p.status === "published")
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .slice(0, CATALOG_QUERY_CARDS.listPrograms.limit);
          return programs.map(toPublicProgramDto);
        }
        throw err;
      }
    },

    async getPublishedProgram(programId: string): Promise<PublicProgramDto | null> {
      const snapshot = await firestore.collection(COLLECTIONS.programs).doc(programId).get();
      if (!snapshot.exists) return null;

      const program = parseDocument(snapshot, (value) => programSchema.parse(value));
      return program.status === "published" ? toPublicProgramDto(program) : null;
    },

    async listPublishedCourses(programId: string): Promise<PublicCourseDto[]> {
      try {
        const snapshot = await firestore
          .collection(COLLECTIONS.courses)
          .where("programId", "==", programId)
          .where("status", "==", "published")
          .orderBy("order", "asc")
          .limit(CATALOG_QUERY_CARDS.listCoursesByProgram.limit)
          .get();

        return snapshot.docs.map((document) =>
          toPublicCourseDto(parseDocument(document, (value) => courseSchema.parse(value))),
        );
      } catch (err: unknown) {
        const errMsg = String(err);
        if (errMsg.includes("requires an index") || errMsg.includes("FAILED_PRECONDITION")) {
          console.warn("Firestore index not ready for listPublishedCourses. Falling back to in-memory filtering.");
          const snapshot = await firestore.collection(COLLECTIONS.courses).get();
          const courses = snapshot.docs
            .map((doc) => parseDocument(doc, (value) => courseSchema.parse(value)))
            .filter((c) => c.programId === programId && c.status === "published")
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .slice(0, CATALOG_QUERY_CARDS.listCoursesByProgram.limit);
          return courses.map(toPublicCourseDto);
        }
        throw err;
      }
    },

    async getPublishedCourse(courseId: string): Promise<PublicCourseDto | null> {
      const snapshot = await firestore.collection(COLLECTIONS.courses).doc(courseId).get();
      if (!snapshot.exists) return null;

      const course = parseDocument(snapshot, (value) => courseSchema.parse(value));
      return course.status === "published" ? toPublicCourseDto(course) : null;
    },
  };
}

export type CatalogRepository = ReturnType<typeof createCatalogRepository>;
