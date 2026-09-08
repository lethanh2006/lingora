"use client";

import { useCallback, useSyncExternalStore } from "react";

const changeEvent = "lingora-saved-topics";
const emptyIds: string[] = [];
const cache = new Map<string, { raw: string | null; ids: string[] }>();

function readSavedIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const previous = cache.get(key);
    if (previous?.raw === raw) return previous.ids;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
    cache.set(key, { raw, ids });
    return ids;
  } catch {
    return cache.get(key)?.ids ?? emptyIds;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

export function useSavedTopics(userId: string) {
  const key = `lingora:saved-topics:${userId}`;
  const getSnapshot = useCallback(() => readSavedIds(key), [key]);
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => emptyIds);
  function toggle(topicId: string): boolean {
    const current = readSavedIds(key);
    const next = current.includes(topicId)
      ? current.filter((id) => id !== topicId)
      : [...current, topicId];
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(changeEvent));
      return true;
    } catch {
      return false;
    }
  }
  return { ids, toggle };
}
