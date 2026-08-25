const worker = globalThis;
const DEFAULT_TARGET = "/learn";
const ALLOWED_TARGETS = ["/dashboard", "/learn", "/review"];

function safeTarget(value) {
  if (typeof value !== "string") return DEFAULT_TARGET;
  return ALLOWED_TARGETS.some(
    (prefix) => value === prefix || value.startsWith(`${prefix}/`),
  )
    ? value
    : DEFAULT_TARGET;
}

worker.addEventListener("install", (event) => {
  event.waitUntil(worker.skipWaiting());
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(worker.clients.claim());
});

worker.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {};
  }
  if (!payload || typeof payload !== "object") payload = {};

  const title =
    typeof payload.title === "string" ? payload.title : "Đến giờ học cùng Lingora";
  const options = {
    body:
      typeof payload.body === "string"
        ? payload.body
        : "Quay lại luyện vài từ để giữ nhịp học nhé!",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: "lingora-study-reminder",
    renotify: false,
    data: { url: safeTarget(payload.url) },
  };

  event.waitUntil(worker.registration.showNotification(title, options));
});

worker.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safeTarget(event.notification.data?.url);
  const targetUrl = new URL(path, worker.location.origin).href;

  event.waitUntil(
    worker.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        const existing = windowClients.find(
          (client) => new URL(client.url).origin === worker.location.origin,
        );
        if (existing) {
          if ("navigate" in existing) await existing.navigate(targetUrl);
          return existing.focus();
        }
        return worker.clients.openWindow(targetUrl);
      }),
  );
});
