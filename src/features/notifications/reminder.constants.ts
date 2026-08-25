export const STUDY_REMINDER_DELAY_MS = 48 * 60 * 60 * 1_000;
export const APP_ACTIVITY_PING_INTERVAL_MS = 30 * 60 * 1_000;
export const APP_ACTIVITY_WRITE_INTERVAL_MS = 20 * 60 * 1_000;
export const STUDY_REMINDER_ACTIVITY_GRACE_MS = APP_ACTIVITY_PING_INTERVAL_MS;
export const STUDY_REMINDER_RETRY_MS = 60 * 60 * 1_000;
export const STUDY_REMINDER_LEASE_MS = 10 * 60 * 1_000;
export const STUDY_REMINDER_CLAIM_RETRY_MS = 15 * 60 * 1_000;

export function getNextStudyReminderTime(now: Date): Date {
  return new Date(
    now.getTime() + STUDY_REMINDER_DELAY_MS + STUDY_REMINDER_ACTIVITY_GRACE_MS,
  );
}

export function timestampToMillis(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;

  if ("toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if ("toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  if ("seconds" in value && typeof value.seconds === "number") {
    const nanoseconds =
      "nanoseconds" in value && typeof value.nanoseconds === "number"
        ? value.nanoseconds
        : 0;
    return value.seconds * 1_000 + Math.floor(nanoseconds / 1_000_000);
  }

  return null;
}

export function isReminderDue(value: unknown, now: Date): boolean {
  const dueAt = timestampToMillis(value);
  return dueAt !== null && dueAt <= now.getTime();
}
