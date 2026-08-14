import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import type { PilotSeedStore } from "./pilot-catalog.ts";

export function createFirestoreSeedStore(firestore: Firestore): PilotSeedStore {
  return {
    async createIfMissing(document) {
      const reference = firestore.collection(document.collection).doc(document.id);

      return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists) return false;

        transaction.create(reference, document.data);
        return true;
      });
    },
  };
}
