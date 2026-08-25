import "server-only";

import { Buffer } from "node:buffer";
import { createECDH, randomUUID, timingSafeEqual } from "node:crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { z } from "zod";

import { COLLECTIONS } from "../../lib/firebase/collections.ts";
import { logger } from "../../lib/logger.ts";
import {
  STUDY_REMINDER_CLAIM_RETRY_MS,
  STUDY_REMINDER_LEASE_MS,
  STUDY_REMINDER_RETRY_MS,
  isReminderDue,
  timestampToMillis,
} from "./reminder.constants.ts";
import { deletePushSubscriptionIfOwned } from "./push-subscription.repository.ts";
import {
  isValidP256PublicKey,
  pushSubscriptionInputSchema,
} from "./schemas/push-subscription.schema.ts";

const REMINDER_BATCH_SIZE = 100;
const MAX_REMINDER_BATCHES = 20;
const CLAIM_CONCURRENCY = 20;
const DELIVERY_CONCURRENCY = 20;
const MAX_SUBSCRIPTIONS_PER_USER = 10;
const PROCESSING_BUDGET_MS = 4 * 60 * 1_000;

const privateVapidKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+={0,2}$/u)
  .refine((value) => Buffer.from(value, "base64url").byteLength === 32);

function isValidVapidSubject(value: string) {
  if (value.startsWith("mailto:")) {
    return z.email().safeParse(value.slice("mailto:".length)).success;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const webPushEnvSchema = z
  .object({
    publicKey: z.string().refine(isValidP256PublicKey, "Invalid VAPID public key"),
    privateKey: privateVapidKeySchema,
    subject: z
      .string()
      .min(1)
      .refine(isValidVapidSubject, "VAPID_SUBJECT must be a valid mailto: or HTTPS URL"),
  })
  .superRefine((value, context) => {
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(Buffer.from(value.privateKey, "base64url"));
      const derivedPublicKey = ecdh.getPublicKey();
      const configuredPublicKey = Buffer.from(value.publicKey, "base64url");
      if (
        derivedPublicKey.byteLength !== configuredPublicKey.byteLength ||
        !timingSafeEqual(derivedPublicKey, configuredPublicKey)
      ) {
        context.addIssue({
          code: "custom",
          path: ["publicKey"],
          message: "VAPID public and private keys do not match",
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        path: ["privateKey"],
        message: "Invalid VAPID key pair",
      });
    }
  });

export function getWebPushEnv() {
  return webPushEnvSchema.parse({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
  });
}

type PushSender = (subscription: WebPushSubscription, payload: string) => Promise<void>;

function createDefaultSender(): PushSender {
  const env = getWebPushEnv();
  return async (subscription, payload) => {
    await webpush.sendNotification(subscription, payload, {
      TTL: 60 * 60,
      urgency: "normal",
      topic: "study-reminder",
      timeout: 10_000,
      vapidDetails: {
        subject: env.subject,
        publicKey: env.publicKey,
        privateKey: env.privateKey,
      },
    });
  };
}

function reminderState(data: FirebaseFirestore.DocumentData | undefined) {
  const value = data?.studyReminder;
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : ({} as Record<string, unknown>);
}

function pushStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return null;
  return typeof error.statusCode === "number" ? error.statusCode : null;
}

function reminderPayload() {
  return JSON.stringify({
    title: "Đến giờ học cùng Lingora",
    body: "Bạn đã 2 ngày chưa mở Lingora. Quay lại học vài từ để giữ nhịp nhé!",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: "lingora-study-reminder",
    url: "/learn",
  });
}

function parseStoredSubscription(data: FirebaseFirestore.DocumentData | undefined) {
  return pushSubscriptionInputSchema.parse({
    endpoint: data?.endpoint,
    expirationTime: data?.expirationTime ?? null,
    keys: data?.keys,
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const output = new Array<R>(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );
  return output;
}

export type StudyReminderBatchResult = {
  batches: number;
  due: number;
  claimed: number;
  usersNotified: number;
  deliveries: number;
  staleSubscriptions: number;
  failedDeliveries: number;
  deferredDeliveries: number;
  suppressed: number;
};

export function createStudyReminderService(db: Firestore, customSender?: PushSender) {
  const sendPush = customSender ?? createDefaultSender();

  async function claimUser(userRef: FirebaseFirestore.DocumentReference, now: Timestamp) {
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists) return null;

      const current = reminderState(snapshot.data());
      const leaseUntil = timestampToMillis(current.processingUntil);
      if (
        current.enabled !== true ||
        !isReminderDue(current.nextReminderAt, now.toDate()) ||
        (leaseUntil !== null && leaseUntil > now.toMillis())
      ) {
        return null;
      }

      const claimId = randomUUID();
      transaction.set(
        userRef,
        {
          studyReminder: {
            ...current,
            claimId,
            processingUntil: Timestamp.fromMillis(now.toMillis() + STUDY_REMINDER_LEASE_MS),
            nextReminderAt: Timestamp.fromMillis(
              now.toMillis() + STUDY_REMINDER_CLAIM_RETRY_MS,
            ),
          },
        },
        { merge: true },
      );
      return claimId;
    });
  }

  async function claimIsCurrent(
    userRef: FirebaseFirestore.DocumentReference,
    claimId: string,
  ) {
    const snapshot = await userRef.get();
    if (!snapshot.exists) return false;
    const current = reminderState(snapshot.data());
    return current.enabled === true && current.claimId === claimId;
  }

  async function subscriptionIsCurrent(
    subscriptionRef: FirebaseFirestore.DocumentReference,
    userId: string,
    expectedUpdatedAt: unknown,
  ) {
    const snapshot = await subscriptionRef.get();
    return (
      snapshot.exists &&
      snapshot.data()?.userId === userId &&
      timestampToMillis(snapshot.data()?.updatedAt) === timestampToMillis(expectedUpdatedAt)
    );
  }

  async function finalizeClaim(
    userRef: FirebaseFirestore.DocumentReference,
    claimId: string,
    requestedResult: "sent" | "retry" | "empty",
    now: Timestamp,
  ) {
    const subscriptionQuery = db
      .collection(COLLECTIONS.pushSubscriptions)
      .where("userId", "==", userRef.id)
      .limit(1);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists) return;
      const current = reminderState(snapshot.data());
      if (current.claimId !== claimId) return;

      let result = requestedResult;
      if (result === "empty") {
        const subscriptions = await transaction.get(subscriptionQuery);
        if (!subscriptions.empty) result = "retry";
      }

      transaction.set(
        userRef,
        {
          studyReminder: {
            ...current,
            enabled: result !== "empty",
            nextReminderAt:
              result === "retry"
                ? Timestamp.fromMillis(now.toMillis() + STUDY_REMINDER_RETRY_MS)
                : null,
            lastSentAt: result === "sent" ? now : (current.lastSentAt ?? null),
            claimId: null,
            processingUntil: null,
          },
        },
        { merge: true },
      );
    });
  }

  return {
    async sendDue(now = Timestamp.now()): Promise<StudyReminderBatchResult> {
      const deadline = Date.now() + PROCESSING_BUDGET_MS;
      const seenDueUsers = new Set<string>();
      const result: StudyReminderBatchResult = {
        batches: 0,
        due: 0,
        claimed: 0,
        usersNotified: 0,
        deliveries: 0,
        staleSubscriptions: 0,
        failedDeliveries: 0,
        deferredDeliveries: 0,
        suppressed: 0,
      };

      while (result.batches < MAX_REMINDER_BATCHES && Date.now() < deadline) {
        const dueSnapshot = await db
          .collection(COLLECTIONS.users)
          .where("studyReminder.enabled", "==", true)
          .where("studyReminder.nextReminderAt", "<=", now)
          .orderBy("studyReminder.nextReminderAt", "asc")
          .limit(REMINDER_BATCH_SIZE)
          .get();
        if (dueSnapshot.empty) break;

        result.batches += 1;
        dueSnapshot.docs.forEach((document) => seenDueUsers.add(document.id));
        result.due = seenDueUsers.size;

        const claimCandidates = await mapWithConcurrency(
          dueSnapshot.docs,
          CLAIM_CONCURRENCY,
          async (document) => ({
            document,
            claimId: await claimUser(document.ref, now),
          }),
        );
        const claims: Array<{
          document: (typeof dueSnapshot.docs)[number];
          claimId: string;
        }> = [];
        for (const claim of claimCandidates) {
          if (claim.claimId !== null) {
            claims.push({ document: claim.document, claimId: claim.claimId });
          }
        }
        result.claimed += claims.length;
        if (claims.length === 0) break;

        await mapWithConcurrency(claims, DELIVERY_CONCURRENCY, async ({ document, claimId }) => {
          const subscriptions = await db
            .collection(COLLECTIONS.pushSubscriptions)
            .where("userId", "==", document.id)
            .limit(MAX_SUBSCRIPTIONS_PER_USER)
            .get();
          if (subscriptions.empty) {
            await finalizeClaim(document.ref, claimId, "empty", now);
            return;
          }

          let sent = 0;
          let retryable = 0;
          let wasSuppressed = false;

          for (const subscriptionDocument of subscriptions.docs) {
            if (Date.now() >= deadline) {
              result.deferredDeliveries += 1;
              retryable += 1;
              break;
            }

            if (!(await claimIsCurrent(document.ref, claimId))) {
              result.suppressed += 1;
              wasSuppressed = true;
              break;
            }

            try {
              const subscription = parseStoredSubscription(subscriptionDocument.data());
              const expectedUpdatedAt = subscriptionDocument.data().updatedAt ?? null;
              if (
                subscription.expirationTime !== null &&
                subscription.expirationTime <= now.toMillis()
              ) {
                const removed = await deletePushSubscriptionIfOwned(
                  db,
                  subscriptionDocument.ref,
                  document.id,
                  expectedUpdatedAt,
                );
                if (removed) result.staleSubscriptions += 1;
                else retryable += 1;
                continue;
              }

              if (
                !(await subscriptionIsCurrent(
                  subscriptionDocument.ref,
                  document.id,
                  expectedUpdatedAt,
                ))
              ) {
                retryable += 1;
                continue;
              }

              await sendPush(subscription, reminderPayload());
              sent += 1;
            } catch (error) {
              const statusCode = pushStatusCode(error);
              if (statusCode === 404 || statusCode === 410 || error instanceof z.ZodError) {
                try {
                  const removed = await deletePushSubscriptionIfOwned(
                    db,
                    subscriptionDocument.ref,
                    document.id,
                    subscriptionDocument.data().updatedAt ?? null,
                  );
                  if (removed) result.staleSubscriptions += 1;
                  else retryable += 1;
                } catch (deletionError) {
                  retryable += 1;
                  result.failedDeliveries += 1;
                  logger.warn("Unable to remove a stale push subscription", {
                    error: deletionError,
                    userId: document.id,
                  });
                }
                continue;
              }

              retryable += 1;
              result.failedDeliveries += 1;
              logger.warn("Study reminder push delivery failed", {
                error,
                userId: document.id,
                metadata: { statusCode },
              });
            }
          }

          if (wasSuppressed) return;
          if (sent > 0) {
            result.usersNotified += 1;
            result.deliveries += sent;
            await finalizeClaim(document.ref, claimId, "sent", now);
          } else {
            await finalizeClaim(
              document.ref,
              claimId,
              retryable > 0 ? "retry" : "empty",
              now,
            );
          }
        });
      }

      return result;
    },
  };
}
