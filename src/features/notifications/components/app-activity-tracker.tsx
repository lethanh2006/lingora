"use client";

import { useEffect } from "react";

import { APP_ACTIVITY_PING_INTERVAL_MS } from "@/features/notifications/reminder.constants";

export const STUDY_REMINDER_PREFERENCE_EVENT = "lingora:study-reminder-preference";

const STORAGE_KEY_PREFIX = "lingora:last-activity-ping:";

function lastPingTime(storageKey: string) {
  try {
    return Number(window.sessionStorage.getItem(storageKey) ?? 0);
  } catch {
    return 0;
  }
}

function savePingTime(storageKey: string, value: number) {
  try {
    window.sessionStorage.setItem(storageKey, String(value));
  } catch {
    // Private browsing can disable storage; the server update is still idempotent.
  }
}

export function AppActivityTracker({
  userId,
  initiallyEnabled,
}: {
  userId: string;
  initiallyEnabled: boolean;
}) {
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
    let enabled = initiallyEnabled;
    let inFlight = false;

    async function recordActivity(force = false) {
      const now = Date.now();
      if (
        !enabled ||
        document.visibilityState === "hidden" ||
        inFlight ||
        (!force && now - lastPingTime(storageKey) < APP_ACTIVITY_PING_INTERVAL_MS)
      ) {
        return;
      }

      inFlight = true;
      savePingTime(storageKey, now);
      try {
        await fetch("/api/push/activity", {
          method: "POST",
          keepalive: true,
        });
      } catch {
        // A later interval or visibility change retries without disrupting the app.
      } finally {
        inFlight = false;
      }
    }

    const onVisibilityChange = () => void recordActivity();
    const onPreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      enabled = detail?.enabled === true;
      if (enabled) void recordActivity(true);
    };

    void recordActivity();
    const intervalId = window.setInterval(
      () => void recordActivity(),
      APP_ACTIVITY_PING_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(STUDY_REMINDER_PREFERENCE_EVENT, onPreferenceChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(STUDY_REMINDER_PREFERENCE_EVENT, onPreferenceChange);
    };
  }, [initiallyEnabled, userId]);

  return null;
}
