import "server-only";

import { createHash } from "node:crypto";
import {
  Timestamp,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";

import { COLLECTIONS } from "../../lib/firebase/collections.ts";
import {
  APP_ACTIVITY_WRITE_INTERVAL_MS,
  getNextStudyReminderTime,
  timestampToMillis,
} from "./reminder.constants.ts";
import type { PushSubscriptionInput } from "./schemas/push-subscription.schema.ts";

type ReminderState = Record<string, unknown> & {
  enabled?: boolean;
};

const MAX_SUBSCRIPTIONS_PER_USER = 10;

export class PushSubscriptionUserNotFoundError extends Error {
  constructor() {
    super("Push subscription user profile not found");
    this.name = "PushSubscriptionUserNotFoundError";
  }
}

function reminderState(data: FirebaseFirestore.DocumentData | undefined): ReminderState {
  const value = data?.studyReminder;
  return value && typeof value === "object" ? (value as ReminderState) : {};
}

export function getPushSubscriptionId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function deletePushSubscriptionIfOwned(
  db: Firestore,
  reference: DocumentReference,
  userId: string,
  expectedUpdatedAt?: unknown,
) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || snapshot.data()?.userId !== userId) return false;
    if (
      expectedUpdatedAt !== undefined &&
      timestampToMillis(snapshot.data()?.updatedAt) !== timestampToMillis(expectedUpdatedAt)
    ) {
      return false;
    }

    transaction.delete(reference);
    return true;
  });
}

export function getStudyReminderUpdate(
  userData: FirebaseFirestore.DocumentData | undefined,
  now: Timestamp,
) {
  const current = reminderState(userData);
  if (current.enabled !== true) return { lastActiveAt: now, lastStudyAt: now };

  return {
    lastActiveAt: now,
    lastStudyAt: now,
    studyReminder: {
      ...current,
      enabled: true,
      nextReminderAt: Timestamp.fromDate(getNextStudyReminderTime(now.toDate())),
      claimId: null,
      processingUntil: null,
    },
  };
}

export function getAppActivityUpdate(
  userData: FirebaseFirestore.DocumentData | undefined,
  now: Timestamp,
) {
  const current = reminderState(userData);
  if (current.enabled !== true) return null;

  const lastActiveAt = timestampToMillis(userData?.lastActiveAt);
  if (
    lastActiveAt !== null &&
    now.toMillis() - lastActiveAt < APP_ACTIVITY_WRITE_INTERVAL_MS
  ) {
    return null;
  }

  return {
    lastActiveAt: now,
    studyReminder: {
      ...current,
      enabled: true,
      nextReminderAt: Timestamp.fromDate(getNextStudyReminderTime(now.toDate())),
      claimId: null,
      processingUntil: null,
    },
  };
}

async function disableReminderWithoutSubscriptions(db: Firestore, userId: string) {
  const query = db
    .collection(COLLECTIONS.pushSubscriptions)
    .where("userId", "==", userId)
    .limit(1);
  const userRef = db.collection(COLLECTIONS.users).doc(userId);

  return db.runTransaction(async (transaction) => {
    const [subscriptions, userSnapshot] = await Promise.all([
      transaction.get(query),
      transaction.get(userRef),
    ]);
    if (!userSnapshot.exists) return false;
    if (!subscriptions.empty) {
      return reminderState(userSnapshot.data()).enabled === true;
    }

    transaction.set(
      userRef,
      {
        studyReminder: {
          ...reminderState(userSnapshot.data()),
          enabled: false,
          nextReminderAt: null,
          claimId: null,
          processingUntil: null,
        },
      },
      { merge: true },
    );
    return false;
  });
}

export function createPushSubscriptionRepository(db: Firestore) {
  return {
    async recordActivity(userId: string, now = Timestamp.now()) {
      const userRef = db.collection(COLLECTIONS.users).doc(userId);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists) return false;
        const update = getAppActivityUpdate(snapshot.data(), now);
        if (update) transaction.set(userRef, update, { merge: true });
        return true;
      });
    },

    async subscribe(userId: string, subscription: PushSubscriptionInput, now = Timestamp.now()) {
      const subscriptionRef = db
        .collection(COLLECTIONS.pushSubscriptions)
        .doc(getPushSubscriptionId(subscription.endpoint));
      const userRef = db.collection(COLLECTIONS.users).doc(userId);

      const previousUserId = await db.runTransaction(async (transaction) => {
        const [subscriptionSnapshot, userSnapshot] = await Promise.all([
          transaction.get(subscriptionRef),
          transaction.get(userRef),
        ]);
        const previous = subscriptionSnapshot.data();
        const previousOwner =
          typeof previous?.userId === "string" ? previous.userId : null;
        if (!userSnapshot.exists) throw new PushSubscriptionUserNotFoundError();
        const currentReminder = reminderState(userSnapshot.data());
        const alreadyEnabled = currentReminder.enabled === true;

        transaction.set(subscriptionRef, {
          schemaVersion: 1,
          userId,
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: subscription.keys,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        });
        transaction.set(
          userRef,
          {
            studyReminder: {
              ...currentReminder,
              enabled: true,
              nextReminderAt: alreadyEnabled
                ? (currentReminder.nextReminderAt ?? null)
                : Timestamp.fromDate(getNextStudyReminderTime(now.toDate())),
              claimId: alreadyEnabled ? (currentReminder.claimId ?? null) : null,
              processingUntil: alreadyEnabled
                ? (currentReminder.processingUntil ?? null)
                : null,
            },
          },
          { merge: true },
        );

        return previousOwner;
      });

      if (previousUserId && previousUserId !== userId) {
        try {
          await disableReminderWithoutSubscriptions(db, previousUserId);
        } catch {
          console.warn("Unable to clean up the previous push subscription owner");
        }
      }

      try {
        const userSubscriptions = await db
          .collection(COLLECTIONS.pushSubscriptions)
          .where("userId", "==", userId)
          .limit(25)
          .get();
        const staleDevices = userSubscriptions.docs
          .filter((document) => document.id !== subscriptionRef.id)
          .sort(
            (left, right) =>
              (timestampToMillis(right.data().updatedAt) ?? 0) -
              (timestampToMillis(left.data().updatedAt) ?? 0),
          )
          .slice(MAX_SUBSCRIPTIONS_PER_USER - 1);
        await Promise.all(
          staleDevices.map((document) =>
            deletePushSubscriptionIfOwned(
              db,
              document.ref,
              userId,
              document.data().updatedAt ?? null,
            ),
          ),
        );
      } catch {
        console.warn("Unable to prune old push subscriptions");
      }
    },

    async unsubscribe(userId: string, endpoint: string) {
      const subscriptionRef = db
        .collection(COLLECTIONS.pushSubscriptions)
        .doc(getPushSubscriptionId(endpoint));
      await deletePushSubscriptionIfOwned(db, subscriptionRef, userId);
      return disableReminderWithoutSubscriptions(db, userId);
    },
  };
}
