import "server-only";

import type { Firestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../../lib/firebase/collections.ts";
import {
  sourceAttributionSchema,
  type SourceAttribution,
} from "../schemas/content.schema.ts";

export function createSourceService(firestore: Firestore) {
  const collectionRef = firestore.collection(COLLECTIONS.contentSources);

  return {
    async getSource(id: string): Promise<SourceAttribution | null> {
      const snap = await collectionRef.doc(id).get();
      if (!snap.exists) return null;
      return sourceAttributionSchema.parse(snap.data());
    },

    async createSource(source: SourceAttribution): Promise<SourceAttribution> {
      const parsed = sourceAttributionSchema.parse(source);
      await collectionRef.doc(parsed.id).set(parsed);

      await firestore
        .collection(COLLECTIONS.sourceAttributions)
        .doc(parsed.id)
        .set(parsed);

      return parsed;
    },

    async updateSource(
      id: string,
      updates: Partial<Omit<SourceAttribution, "id">>,
    ): Promise<SourceAttribution> {
      const docRef = collectionRef.doc(id);
      const snap = await docRef.get();
      if (!snap.exists) throw new Error("Source not found");

      const current = snap.data();
      const updated = sourceAttributionSchema.parse({
        ...current,
        ...updates,
        id,
      });

      await docRef.set(updated);

      await firestore
        .collection(COLLECTIONS.sourceAttributions)
        .doc(id)
        .set(updated);

      return updated;
    },

    async deleteSource(id: string): Promise<void> {
      await collectionRef.doc(id).delete();
      await firestore.collection(COLLECTIONS.sourceAttributions).doc(id).delete();
    },

    async listSources(): Promise<SourceAttribution[]> {
      const querySnap = await collectionRef.get();
      return querySnap.docs.map((doc) => sourceAttributionSchema.parse(doc.data()));
    },
  };
}
