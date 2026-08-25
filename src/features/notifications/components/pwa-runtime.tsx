"use client";

import { useEffect } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const INSTALL_PROMPT_EVENT = "lingora:install-prompt";
export const APP_INSTALLED_EVENT = "lingora:app-installed";

declare global {
  interface Window {
    __lingoraInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function getInstallPrompt() {
  return typeof window === "undefined" ? null : (window.__lingoraInstallPrompt ?? null);
}

export function clearInstallPrompt() {
  if (typeof window !== "undefined") window.__lingoraInstallPrompt = null;
}

export function PwaRuntime() {
  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__lingoraInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
    };
    const onAppInstalled = () => {
      clearInstallPrompt();
      window.dispatchEvent(new Event(APP_INSTALLED_EVENT));
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  return null;
}
