import "server-only";

import type { Firestore } from "firebase-admin/firestore";
import { deletePushSubscriptionIfOwned } from "../../notifications/push-subscription.repository.ts";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "../../../lib/firebase/collections.ts";

export function createDeletionService(firestore: Firestore) {
  async function deletePushSubscriptions(uid: string) {
    const subscriptions = await firestore
      .collection(COLLECTIONS.pushSubscriptions)
      .where("userId", "==", uid)
      .get();
    for (const subscription of subscriptions.docs) {
      await deletePushSubscriptionIfOwned(firestore, subscription.ref, uid);
    }
  }

  return {
    async deleteUserData(uid: string): Promise<void> {
      if (!uid || uid.length > 128 || uid.includes("/")) {
        throw new Error("Invalid User ID");
      }

      // 1. Delete attempts and their nested sections
      const attemptsRef = firestore
        .collection(COLLECTIONS.users)
        .doc(uid)
        .collection(USER_SUBCOLLECTIONS.attempts);
      const attemptsSnap = await attemptsRef.get();
      for (const attemptDoc of attemptsSnap.docs) {
        const sectionsRef = attemptDoc.ref.collection(USER_SUBCOLLECTIONS.sections);
        const sectionsSnap = await sectionsRef.get();
        for (const sectionDoc of sectionsSnap.docs) {
          await sectionDoc.ref.delete();
        }
        await attemptDoc.ref.delete();
      }

      // 2. Delete all flat user-owned learning state.
      const otherSubcollections = [
        USER_SUBCOLLECTIONS.enrollments,
        USER_SUBCOLLECTIONS.lessonProgress,
        USER_SUBCOLLECTIONS.reviewItems,
        USER_SUBCOLLECTIONS.dailyStats,
        USER_SUBCOLLECTIONS.topicProgress,
        USER_SUBCOLLECTIONS.practiceDays,
      ];

      for (const subName of otherSubcollections) {
        const subRef = firestore
          .collection(COLLECTIONS.users)
          .doc(uid)
          .collection(subName);
        const subSnap = await subRef.get();
        for (const docItem of subSnap.docs) {
          await docItem.ref.delete();
        }
      }

      // 3. Delete every browser push endpoint owned by this account.
      await deletePushSubscriptions(uid);

      // 4. Delete user document
      await firestore.collection(COLLECTIONS.users).doc(uid).delete();

      // 5. Sweep again after deleting the profile so a concurrent subscribe
      // transaction cannot leave an orphaned endpoint between steps 3 and 4.
      await deletePushSubscriptions(uid);
    },
  };
}
