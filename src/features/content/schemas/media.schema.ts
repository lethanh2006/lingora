import { z } from "zod";
import { documentIdSchema } from "./content.schema.ts";

export const CONTENT_MEDIA_SCHEMA_VERSION = 1 as const;

export const contentMediaSchema = z
  .object({
    schemaVersion: z.literal(CONTENT_MEDIA_SCHEMA_VERSION),
    id: documentIdSchema,
    storagePath: z.string().trim().min(1).max(1_024),
    contentType: z.string().regex(/^(audio|image)\/[a-z0-9.+-]+$/),
    sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type ContentMedia = z.infer<typeof contentMediaSchema>;
