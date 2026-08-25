import assert from "node:assert/strict";
import { createECDH } from "node:crypto";
import test from "node:test";

import { Timestamp } from "firebase-admin/firestore";

import {
  STUDY_REMINDER_DELAY_MS,
  STUDY_REMINDER_ACTIVITY_GRACE_MS,
  STUDY_REMINDER_RETRY_MS,
  getNextStudyReminderTime,
  isReminderDue,
} from "../src/features/notifications/reminder.constants.ts";
import {
  createPushSubscriptionRepository,
  getAppActivityUpdate,
  getPushSubscriptionId,
  getStudyReminderUpdate,
} from "../src/features/notifications/push-subscription.repository.ts";
import { pushSubscriptionInputSchema } from "../src/features/notifications/schemas/push-subscription.schema.ts";
import {
  createStudyReminderService,
  getWebPushEnv,
} from "../src/features/notifications/study-reminder.service.ts";

const subscriptionKey = createECDH("prime256v1");
subscriptionKey.generateKeys();

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/device-1",
  expirationTime: null,
  keys: {
    p256dh: subscriptionKey.getPublicKey().toString("base64url"),
    auth: Buffer.alloc(16, 2).toString("base64url"),
  },
};

function getNestedValue(value, fieldPath) {
  return fieldPath.split(".").reduce((current, part) => current?.[part], value);
}

function comparable(value) {
  return value && typeof value.toMillis === "function" ? value.toMillis() : value;
}

function createMockFirestore(initialData = {}, hooks = {}) {
  const store = new Map(Object.entries(initialData));

  function directDocuments(collectionPath) {
    return [...store.entries()]
      .filter(([path]) => path.slice(0, path.lastIndexOf("/")) === collectionPath)
      .map(([path]) => makeSnapshot(path));
  }

  function makeSnapshot(path) {
    const data = store.get(path);
    return {
      id: path.slice(path.lastIndexOf("/") + 1),
      exists: data !== undefined,
      ref: makeDocument(path),
      data: () => data,
    };
  }

  function mergeTopLevel(previous, next) {
    return { ...(previous ?? {}), ...next };
  }

  function makeDocument(path) {
    return {
      path,
      id: path.slice(path.lastIndexOf("/") + 1),
      collection(name) {
        return makeCollection(`${path}/${name}`);
      },
      async get() {
        await hooks.beforeDocumentGet?.(path, store);
        return makeSnapshot(path);
      },
      async set(data, options) {
        store.set(path, options?.merge ? mergeTopLevel(store.get(path), data) : data);
      },
      async delete() {
        store.delete(path);
      },
    };
  }

  function snapshotFor(documents) {
    return {
      docs: documents,
      size: documents.length,
      empty: documents.length === 0,
    };
  }

  function makeQuery(collectionPath, filters = [], maxItems = Infinity, ordering = null) {
    return {
      where(field, operator, expected) {
        return makeQuery(
          collectionPath,
          [...filters, { field, operator, expected }],
          maxItems,
          ordering,
        );
      },
      orderBy(field, direction = "asc") {
        return makeQuery(collectionPath, filters, maxItems, { field, direction });
      },
      limit(value) {
        return makeQuery(collectionPath, filters, value, ordering);
      },
      async get() {
        const documents = directDocuments(collectionPath).filter((document) =>
          filters.every(({ field, operator, expected }) => {
            const actualValue = comparable(getNestedValue(document.data(), field));
            const expectedValue = comparable(expected);
            if (operator === "==") return actualValue === expectedValue;
            if (operator === "<=") {
              return actualValue !== null && actualValue !== undefined && actualValue <= expectedValue;
            }
            throw new Error(`Unsupported operator: ${operator}`);
          }),
        );
        if (ordering) {
          documents.sort((left, right) => {
            const leftValue = comparable(getNestedValue(left.data(), ordering.field));
            const rightValue = comparable(getNestedValue(right.data(), ordering.field));
            const comparison = leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
            return ordering.direction === "desc" ? -comparison : comparison;
          });
        }
        return snapshotFor(documents.slice(0, maxItems));
      },
    };
  }

  function makeCollection(path) {
    return {
      ...makeQuery(path),
      doc(id) {
        return makeDocument(`${path}/${id}`);
      },
    };
  }

  return {
    store,
    collection(name) {
      return makeCollection(name);
    },
    async runTransaction(callback) {
      const transaction = {
        get(target) {
          return target.get();
        },
        set(ref, data, options) {
          store.set(ref.path, options?.merge ? mergeTopLevel(store.get(ref.path), data) : data);
        },
        delete(ref) {
          store.delete(ref.path);
        },
      };
      return callback(transaction);
    },
  };
}

test("reminder scheduling never fires before 48 hours", () => {
  const now = new Date("2026-08-25T01:00:00.000Z");
  const dueAt = getNextStudyReminderTime(now);

  assert.equal(
    dueAt.getTime() - now.getTime(),
    STUDY_REMINDER_DELAY_MS + STUDY_REMINDER_ACTIVITY_GRACE_MS,
  );
  assert.equal(isReminderDue(Timestamp.fromDate(dueAt), new Date(dueAt.getTime() - 1)), false);
  assert.equal(isReminderDue(Timestamp.fromDate(dueAt), dueAt), true);
});

test("push subscription payload accepts Web Push JSON and rejects unsafe input", () => {
  assert.deepEqual(pushSubscriptionInputSchema.parse(validSubscription), validSubscription);
  assert.equal(
    pushSubscriptionInputSchema.safeParse({
      ...validSubscription,
      endpoint: "http://fcm.googleapis.com/device",
    }).success,
    false,
  );
  for (const endpoint of ["", "x", "https://"]) {
    assert.equal(
      pushSubscriptionInputSchema.safeParse({ ...validSubscription, endpoint }).success,
      false,
    );
  }
  assert.equal(
    pushSubscriptionInputSchema.safeParse({
      ...validSubscription,
      endpoint: `${validSubscription.endpoint}#duplicate`,
    }).success,
    false,
  );
  assert.equal(
    pushSubscriptionInputSchema.safeParse({
      ...validSubscription,
      keys: {
        ...validSubscription.keys,
        p256dh: Buffer.concat([Buffer.from([0x04]), Buffer.alloc(64, 1)]).toString(
          "base64url",
        ),
      },
    }).success,
    false,
  );
  assert.equal(
    pushSubscriptionInputSchema.safeParse({
      ...validSubscription,
      endpoint: "https://127.0.0.1/internal",
    }).success,
    false,
  );
  assert.equal(
    pushSubscriptionInputSchema.safeParse({ ...validSubscription, userId: "another-user" }).success,
    false,
  );
  for (const endpoint of [
    "https://FCM.GOOGLEAPIS.COM/fcm/send/device-1",
    "https://fcm.googleapis.com:443/fcm/send/device-1",
  ]) {
    const parsed = pushSubscriptionInputSchema.parse({ ...validSubscription, endpoint });
    assert.equal(parsed.endpoint, validSubscription.endpoint);
    assert.equal(
      getPushSubscriptionId(parsed.endpoint),
      getPushSubscriptionId(validSubscription.endpoint),
    );
  }
});

test("Web Push environment requires a matching VAPID pair and valid subject", () => {
  const previous = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
  };
  const vapid = createECDH("prime256v1");
  vapid.generateKeys();
  const other = createECDH("prime256v1");
  other.generateKeys();

  try {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = vapid.getPublicKey().toString("base64url");
    process.env.VAPID_PRIVATE_KEY = vapid.getPrivateKey().toString("base64url");
    process.env.VAPID_SUBJECT = "mailto:admin@example.test";
    assert.deepEqual(getWebPushEnv(), {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT,
    });

    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = other.getPublicKey().toString("base64url");
    assert.throws(() => getWebPushEnv());
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = vapid.getPublicKey().toString("base64url");
    process.env.VAPID_SUBJECT = "https://";
    assert.throws(() => getWebPushEnv());
  } finally {
    for (const [name, value] of [
      ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", previous.publicKey],
      ["VAPID_PRIVATE_KEY", previous.privateKey],
      ["VAPID_SUBJECT", previous.subject],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("subscribing schedules a reminder and reassigns a shared endpoint safely", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const db = createMockFirestore({
    "users/user-1": { email: "one@example.test" },
    "users/user-2": { email: "two@example.test" },
  });
  const repository = createPushSubscriptionRepository(db);

  await repository.subscribe("user-1", validSubscription, now);
  const subscriptionPath = `pushSubscriptions/${getPushSubscriptionId(validSubscription.endpoint)}`;
  assert.equal(db.store.get(subscriptionPath).userId, "user-1");
  assert.equal(
    db.store.get("users/user-1").studyReminder.nextReminderAt.toMillis(),
    now.toMillis() + STUDY_REMINDER_DELAY_MS + STUDY_REMINDER_ACTIVITY_GRACE_MS,
  );

  const originalDueAt = db.store.get("users/user-1").studyReminder.nextReminderAt;
  await repository.subscribe(
    "user-1",
    validSubscription,
    Timestamp.fromMillis(now.toMillis() + 60 * 60 * 1_000),
  );
  assert.equal(
    db.store.get("users/user-1").studyReminder.nextReminderAt.toMillis(),
    originalDueAt.toMillis(),
  );

  await repository.subscribe("user-2", validSubscription, now);
  assert.equal(db.store.get(subscriptionPath).userId, "user-2");
  assert.equal(db.store.get("users/user-1").studyReminder.enabled, false);
  assert.equal(db.store.get("users/user-2").studyReminder.enabled, true);
});

test("unsubscribing one device keeps account reminders active for another device", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const phone = validSubscription;
  const laptop = {
    ...validSubscription,
    endpoint: "https://fcm.googleapis.com/fcm/send/laptop-device",
  };
  const db = createMockFirestore({ "users/user-1": { email: "one@example.test" } });
  const repository = createPushSubscriptionRepository(db);

  await repository.subscribe("user-1", phone, now);
  await repository.subscribe("user-1", laptop, now);
  const reminderEnabled = await repository.unsubscribe("user-1", phone.endpoint);

  assert.equal(reminderEnabled, true);
  assert.equal(db.store.get("users/user-1").studyReminder.enabled, true);
  assert.equal(
    db.store.has(`pushSubscriptions/${getPushSubscriptionId(laptop.endpoint)}`),
    true,
  );
});

test("a saved study session rearms enabled reminders but not disabled ones", () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const enabled = getStudyReminderUpdate(
    { studyReminder: { enabled: true, lastSentAt: Timestamp.fromMillis(1) } },
    now,
  );
  assert.equal(enabled.lastStudyAt, now);
  assert.equal(
    enabled.studyReminder.nextReminderAt.toMillis(),
    now.toMillis() + STUDY_REMINDER_DELAY_MS + STUDY_REMINDER_ACTIVITY_GRACE_MS,
  );
  assert.equal(enabled.studyReminder.claimId, null);

  const disabled = getStudyReminderUpdate({ studyReminder: { enabled: false } }, now);
  assert.deepEqual(disabled, { lastActiveAt: now, lastStudyAt: now });
});

test("app activity rearms only enabled reminders and avoids duplicate writes", () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const enabled = getAppActivityUpdate(
    { studyReminder: { enabled: true, nextReminderAt: Timestamp.fromMillis(1) } },
    now,
  );
  assert.equal(enabled.lastActiveAt, now);
  assert.equal(
    enabled.studyReminder.nextReminderAt.toMillis(),
    now.toMillis() + STUDY_REMINDER_DELAY_MS + STUDY_REMINDER_ACTIVITY_GRACE_MS,
  );
  assert.equal(getAppActivityUpdate({ studyReminder: { enabled: false } }, now), null);
  assert.equal(
    getAppActivityUpdate(
      {
        lastActiveAt: Timestamp.fromMillis(now.toMillis() - 60 * 1_000),
        studyReminder: { enabled: true },
      },
      now,
    ),
    null,
  );
});

test("cron sends once at the due boundary and clears the inactivity episode", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const subscriptionId = getPushSubscriptionId(validSubscription.endpoint);
  const db = createMockFirestore({
    "users/user-1": {
      studyReminder: { enabled: true, nextReminderAt: now },
    },
    [`pushSubscriptions/${subscriptionId}`]: {
      ...validSubscription,
      userId: "user-1",
    },
  });
  const deliveries = [];
  const service = createStudyReminderService(db, async (subscription, payload) => {
    deliveries.push({ subscription, payload: JSON.parse(payload) });
  });

  const first = await service.sendDue(now);
  const second = await service.sendDue(Timestamp.fromMillis(now.toMillis() + 1));

  assert.equal(first.usersNotified, 1);
  assert.equal(first.deliveries, 1);
  assert.equal(second.due, 0);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].payload.url, "/learn");
  assert.equal(db.store.get("users/user-1").studyReminder.nextReminderAt, null);
});

test("cron removes expired endpoints and disables reminders with no device", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const subscriptionId = getPushSubscriptionId(validSubscription.endpoint);
  const db = createMockFirestore({
    "users/user-1": { studyReminder: { enabled: true, nextReminderAt: now } },
    [`pushSubscriptions/${subscriptionId}`]: { ...validSubscription, userId: "user-1" },
  });
  const error = Object.assign(new Error("Gone"), { statusCode: 410 });
  const result = await createStudyReminderService(db, async () => {
    throw error;
  }).sendDue(now);

  assert.equal(result.staleSubscriptions, 1);
  assert.equal(db.store.has(`pushSubscriptions/${subscriptionId}`), false);
  assert.equal(db.store.get("users/user-1").studyReminder.enabled, false);
});

test("transient push failures are retried without deleting the endpoint", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const subscriptionId = getPushSubscriptionId(validSubscription.endpoint);
  const db = createMockFirestore({
    "users/user-1": { studyReminder: { enabled: true, nextReminderAt: now } },
    [`pushSubscriptions/${subscriptionId}`]: { ...validSubscription, userId: "user-1" },
  });
  const error = Object.assign(new Error("Unavailable"), { statusCode: 503 });
  const result = await createStudyReminderService(db, async () => {
    throw error;
  }).sendDue(now);

  assert.equal(result.failedDeliveries, 1);
  assert.equal(db.store.has(`pushSubscriptions/${subscriptionId}`), true);
  assert.equal(
    db.store.get("users/user-1").studyReminder.nextReminderAt.toMillis(),
    now.toMillis() + STUDY_REMINDER_RETRY_MS,
  );
});

test("a new study event during delivery is not overwritten by cron finalization", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const subscriptionId = getPushSubscriptionId(validSubscription.endpoint);
  const db = createMockFirestore({
    "users/user-1": { studyReminder: { enabled: true, nextReminderAt: now } },
    [`pushSubscriptions/${subscriptionId}`]: { ...validSubscription, userId: "user-1" },
  });
  const nextStudyDueAt = Timestamp.fromMillis(
    now.toMillis() + STUDY_REMINDER_DELAY_MS + STUDY_REMINDER_ACTIVITY_GRACE_MS,
  );
  const service = createStudyReminderService(db, async () => {
    db.store.set("users/user-1", {
      lastStudyAt: now,
      studyReminder: {
        enabled: true,
        nextReminderAt: nextStudyDueAt,
        claimId: null,
        processingUntil: null,
      },
    });
  });

  await service.sendDue(now);
  assert.equal(
    db.store.get("users/user-1").studyReminder.nextReminderAt.toMillis(),
    nextStudyDueAt.toMillis(),
  );
});

test("activity after a cron claim suppresses delivery before the network call", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const nextActivityDueAt = Timestamp.fromMillis(
    now.toMillis() + STUDY_REMINDER_DELAY_MS + STUDY_REMINDER_ACTIVITY_GRACE_MS,
  );
  const subscriptionId = getPushSubscriptionId(validSubscription.endpoint);
  let userReads = 0;
  const db = createMockFirestore(
    {
      "users/user-1": { studyReminder: { enabled: true, nextReminderAt: now } },
      [`pushSubscriptions/${subscriptionId}`]: {
        ...validSubscription,
        userId: "user-1",
      },
    },
    {
      beforeDocumentGet(path, store) {
        if (path !== "users/user-1" || ++userReads !== 2) return;
        store.set(path, {
          lastActiveAt: now,
          studyReminder: {
            enabled: true,
            nextReminderAt: nextActivityDueAt,
            claimId: null,
            processingUntil: null,
          },
        });
      },
    },
  );
  let deliveries = 0;
  const result = await createStudyReminderService(db, async () => {
    deliveries += 1;
  }).sendDue(now);

  assert.equal(deliveries, 0);
  assert.equal(result.suppressed, 1);
  assert.equal(
    db.store.get("users/user-1").studyReminder.nextReminderAt.toMillis(),
    nextActivityDueAt.toMillis(),
  );
});

test("cron drains more than one 100-user batch", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const initialData = {};
  for (let index = 0; index < 125; index += 1) {
    const userId = `batch-user-${String(index).padStart(3, "0")}`;
    const endpoint = `https://fcm.googleapis.com/fcm/send/${userId}`;
    initialData[`users/${userId}`] = {
      studyReminder: { enabled: true, nextReminderAt: now },
    };
    initialData[`pushSubscriptions/${getPushSubscriptionId(endpoint)}`] = {
      ...validSubscription,
      endpoint,
      userId,
    };
  }

  const db = createMockFirestore(initialData);
  let deliveries = 0;
  const result = await createStudyReminderService(db, async () => {
    deliveries += 1;
  }).sendDue(now);

  assert.equal(result.batches, 2);
  assert.equal(result.due, 125);
  assert.equal(result.usersNotified, 125);
  assert.equal(deliveries, 125);
});

test("cron does not delete an endpoint that was reassigned during delivery", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const oldUpdatedAt = Timestamp.fromMillis(now.toMillis() - 1_000);
  const subscriptionId = getPushSubscriptionId(validSubscription.endpoint);
  const subscriptionPath = `pushSubscriptions/${subscriptionId}`;
  const db = createMockFirestore({
    "users/user-1": { studyReminder: { enabled: true, nextReminderAt: now } },
    [subscriptionPath]: {
      ...validSubscription,
      userId: "user-1",
      updatedAt: oldUpdatedAt,
    },
  });
  const gone = Object.assign(new Error("Gone"), { statusCode: 410 });
  const result = await createStudyReminderService(db, async () => {
    db.store.set(subscriptionPath, {
      ...validSubscription,
      userId: "user-2",
      updatedAt: now,
    });
    throw gone;
  }).sendDue(now);

  assert.equal(result.staleSubscriptions, 0);
  assert.equal(db.store.get(subscriptionPath).userId, "user-2");
  assert.equal(
    db.store.get("users/user-1").studyReminder.nextReminderAt.toMillis(),
    now.toMillis() + STUDY_REMINDER_RETRY_MS,
  );
});

test("cron does not send through an endpoint reassigned before delivery", async () => {
  const now = Timestamp.fromDate(new Date("2026-08-25T01:00:00.000Z"));
  const oldUpdatedAt = Timestamp.fromMillis(now.toMillis() - 1_000);
  const subscriptionId = getPushSubscriptionId(validSubscription.endpoint);
  const subscriptionPath = `pushSubscriptions/${subscriptionId}`;
  let reassigned = false;
  const db = createMockFirestore(
    {
      "users/user-1": { studyReminder: { enabled: true, nextReminderAt: now } },
      [subscriptionPath]: {
        ...validSubscription,
        userId: "user-1",
        updatedAt: oldUpdatedAt,
      },
    },
    {
      beforeDocumentGet(path, store) {
        if (path !== subscriptionPath || reassigned) return;
        reassigned = true;
        store.set(path, {
          ...validSubscription,
          userId: "user-2",
          updatedAt: now,
        });
      },
    },
  );
  let deliveries = 0;
  const result = await createStudyReminderService(db, async () => {
    deliveries += 1;
  }).sendDue(now);

  assert.equal(deliveries, 0);
  assert.equal(result.usersNotified, 0);
  assert.equal(db.store.get(subscriptionPath).userId, "user-2");
  assert.equal(
    db.store.get("users/user-1").studyReminder.nextReminderAt.toMillis(),
    now.toMillis() + STUDY_REMINDER_RETRY_MS,
  );
});
