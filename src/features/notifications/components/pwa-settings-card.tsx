"use client";

import { useEffect, useState } from "react";
import {
  BellOff,
  BellRing,
  Check,
  Download,
  Share2,
  Smartphone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STUDY_REMINDER_PREFERENCE_EVENT } from "@/features/notifications/components/app-activity-tracker";
import {
  APP_INSTALLED_EVENT,
  INSTALL_PROMPT_EVENT,
  clearInstallPrompt,
  getInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/features/notifications/components/pwa-runtime";

type PushSupport = "checking" | "supported" | "unsupported";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/gu, "+").replace(/_/gu, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }
  return output;
}

async function registerWorker() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

async function persistSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
  if (!response.ok) throw new Error("Không thể lưu đăng ký thông báo.");
}

function subscriptionUsesVapidKey(subscription: PushSubscription, publicKey: string) {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey || !publicKey) return false;

  try {
    const expected = urlBase64ToUint8Array(publicKey);
    const current = new Uint8Array(currentKey);
    return (
      current.length === expected.length &&
      current.every((value, index) => value === expected[index])
    );
  } catch {
    return false;
  }
}

export function PwaSettingsCard({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [support, setSupport] = useState<PushSupport>("checking");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const onInstallPrompt = () => {
      setInstallPrompt(getInstallPrompt());
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      setMessage("Lingora đã được cài trên thiết bị.");
    };
    window.addEventListener(INSTALL_PROMPT_EVENT, onInstallPrompt);
    window.addEventListener(APP_INSTALLED_EVENT, onAppInstalled);

    async function initialize() {
      await Promise.resolve();
      if (cancelled) return;

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
      setIsStandalone(standalone);
      setInstallPrompt(getInstallPrompt());
      setIsIOS(
        /iPad|iPhone|iPod/u.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
      );

      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setSupport("unsupported");
        return;
      }

      setSupport("supported");
      setPermission(Notification.permission);
      try {
        const registration = await registerWorker();
        let currentSubscription = await registration.pushManager.getSubscription();
        if (
          currentSubscription &&
          vapidPublicKey &&
          !subscriptionUsesVapidKey(currentSubscription, vapidPublicKey)
        ) {
          await fetch("/api/push/subscription", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: currentSubscription.endpoint }),
          }).catch(() => null);
          await currentSubscription.unsubscribe().catch(() => false);
          currentSubscription = null;
        }
        if (cancelled) return;
        if (currentSubscription && Notification.permission === "granted") {
          await persistSubscription(currentSubscription);
          if (cancelled) return;
          window.dispatchEvent(
            new CustomEvent(STUDY_REMINDER_PREFERENCE_EVENT, {
              detail: { enabled: true },
            }),
          );
        }
        setSubscription(currentSubscription);
      } catch {
        if (cancelled) return;
        setError("Không thể khởi tạo thông báo trên thiết bị này.");
      }
    }
    void initialize();

    return () => {
      cancelled = true;
      window.removeEventListener(INSTALL_PROMPT_EVENT, onInstallPrompt);
      window.removeEventListener(APP_INSTALLED_EVENT, onAppInstalled);
    };
  }, [vapidPublicKey]);

  async function enableNotifications() {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    let createdSubscription: PushSubscription | null = null;

    try {
      if (!vapidPublicKey) throw new Error("Tính năng thông báo chưa được cấu hình.");
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        throw new Error("Bạn cần cho phép thông báo trong cài đặt trình duyệt.");
      }

      const registration = await registerWorker();
      let nextSubscription = await registration.pushManager.getSubscription();
      if (nextSubscription && !subscriptionUsesVapidKey(nextSubscription, vapidPublicKey)) {
        await nextSubscription.unsubscribe();
        nextSubscription = null;
      }
      if (!nextSubscription) {
        nextSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        createdSubscription = nextSubscription;
      }

      await persistSubscription(nextSubscription);
      setSubscription(nextSubscription);
      window.dispatchEvent(
        new CustomEvent(STUDY_REMINDER_PREFERENCE_EVENT, {
          detail: { enabled: true },
        }),
      );
      setMessage("Đã bật nhắc học sau 2 ngày không mở Lingora.");
    } catch (reason) {
      if (createdSubscription) await createdSubscription.unsubscribe().catch(() => false);
      setError(reason instanceof Error ? reason.message : "Không thể bật thông báo.");
    } finally {
      setIsBusy(false);
    }
  }

  async function disableNotifications() {
    if (!subscription) return;
    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/push/subscription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!response.ok) throw new Error("Không thể tắt thông báo lúc này.");
      const result = (await response.json()) as { reminderEnabled?: boolean };
      await subscription.unsubscribe();
      setSubscription(null);
      window.dispatchEvent(
        new CustomEvent(STUDY_REMINDER_PREFERENCE_EVENT, {
          detail: { enabled: result.reminderEnabled === true },
        }),
      );
      setMessage("Đã tắt nhắc học trên thiết bị này.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tắt thông báo.");
    } finally {
      setIsBusy(false);
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    setError(null);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setMessage("Lingora đang được cài lên thiết bị.");
      }
    } catch {
      setError("Không thể mở hộp thoại cài ứng dụng lúc này.");
    } finally {
      clearInstallPrompt();
      setInstallPrompt(null);
    }
  }

  const notificationDescription =
    support === "checking"
      ? "Đang kiểm tra khả năng thông báo..."
      : support === "unsupported"
        ? "Trình duyệt này chưa hỗ trợ Web Push."
        : permission === "denied"
          ? "Thông báo đang bị chặn trong cài đặt trình duyệt."
          : subscription
            ? "Thiết bị này sẽ nhận một lời nhắc nếu bạn không mở Lingora trong ít nhất 48 giờ."
            : "Cho phép Lingora nhắc bạn khi đã 2 ngày chưa quay lại học.";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="size-5 text-primary" aria-hidden="true" />
          <CardTitle>Ứng dụng và nhắc học</CardTitle>
        </div>
        <CardDescription>Cài Lingora như một ứng dụng và quản lý thông báo trên thiết bị này.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex min-w-0 flex-col rounded-2xl border bg-muted/40 p-4 sm:p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Download className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold">Cài ứng dụng Lingora</h3>
            <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">
              Mở nhanh từ màn hình chính với giao diện toàn màn hình, phù hợp cả điện thoại và máy tính.
            </p>
            <div className="mt-4">
              {isStandalone ? (
                <p className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary">
                  <Check className="size-4" aria-hidden="true" /> Đã cài trên thiết bị
                </p>
              ) : installPrompt ? (
                <Button type="button" className="w-full sm:w-auto" onClick={() => void installApp()}>
                  <Download className="size-4" aria-hidden="true" /> Cài Lingora
                </Button>
              ) : isIOS ? (
                <p className="rounded-xl bg-background p-3 text-sm leading-6 text-muted-foreground">
                  <Share2 className="mr-1 inline size-4" aria-hidden="true" />
                  Trên iPhone/iPad, chọn <strong>Chia sẻ</strong> rồi <strong>Thêm vào Màn hình chính</strong>.
                </p>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Chọn “Cài đặt ứng dụng” trong menu trình duyệt khi tùy chọn xuất hiện.
                </p>
              )}
            </div>
          </section>

          <section className="flex min-w-0 flex-col rounded-2xl border bg-muted/40 p-4 sm:p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              {subscription ? <BellRing className="size-5" aria-hidden="true" /> : <BellOff className="size-5" aria-hidden="true" />}
            </span>
            <h3 className="mt-4 font-semibold">Nhắc học sau 2 ngày</h3>
            <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{notificationDescription}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {subscription ? (
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void disableNotifications()} disabled={isBusy}>
                  Tắt nhắc học
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => void enableNotifications()}
                  disabled={isBusy || support !== "supported" || permission === "denied" || !vapidPublicKey}
                >
                  <BellRing className="size-4" aria-hidden="true" />
                  {isBusy ? "Đang bật..." : "Bật nhắc học"}
                </Button>
              )}
            </div>
          </section>
        </div>

        {message && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      </CardContent>
    </Card>
  );
}
