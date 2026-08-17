import "server-only";

import type { Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";
import { COLLECTIONS } from "../../../lib/firebase/collections.ts";
import { contentMediaSchema, type ContentMedia } from "../schemas/media.schema.ts";

export type MediaUploadInput = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  contentId: string;
};

export function createMediaService(firestore: Firestore, storage: Storage) {
  return {
    async getMedia(id: string): Promise<ContentMedia | null> {
      const snap = await firestore.collection(COLLECTIONS.contentMedia).doc(id).get();
      if (!snap.exists) return null;
      return contentMediaSchema.parse(snap.data());
    },

    async generateUploadUrl(
      input: MediaUploadInput,
    ): Promise<{ uploadUrl: string; storagePath: string }> {
      const validated = contentMediaSchema.parse({
        schemaVersion: 1,
        id: input.id,
        storagePath: `media/content/${input.contentId}/${input.id}/${input.fileName}`,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        checksum: input.checksum,
      });

      await firestore
        .collection(COLLECTIONS.contentMedia)
        .doc(validated.id)
        .set(validated);

      const bucket = storage.bucket();
      const file = bucket.file(validated.storagePath);

      const [uploadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType: validated.contentType,
      });

      return {
        uploadUrl,
        storagePath: validated.storagePath,
      };
    },
  };
}
