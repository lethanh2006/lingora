import { z } from "zod";
import { firestoreTimestampSchema, documentIdSchema } from "./content.schema.ts";

export const AUDIT_LOG_SCHEMA_VERSION = 1 as const;

export const auditLogSchema = z
  .object({
    schemaVersion: z.literal(AUDIT_LOG_SCHEMA_VERSION),
    actorUid: documentIdSchema,
    action: z.string().trim().min(1).max(100),
    entityType: z.string().trim().min(1).max(50),
    entityId: z.string().trim().min(1).max(128),
    revisionId: z.string().trim().min(1).max(128).nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    createdAt: firestoreTimestampSchema,
  })
  .strict();

export type AuditLog = z.infer<typeof auditLogSchema>;
