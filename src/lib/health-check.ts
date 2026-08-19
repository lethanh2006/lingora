/**
 * Health Check Service — kiểm tra trạng thái sức khỏe hệ thống
 *
 * Trả về báo cáo gồm:
 *  - status: "healthy" | "degraded" | "unhealthy"
 *  - version: phiên bản app
 *  - uptime: số giây process đã chạy
 *  - checks: kết quả từng kiểm tra (env, firebase…)
 *
 * Thiết kế: mỗi check là một async function độc lập.
 * Một check thất bại KHÔNG làm hỏng toàn bộ response —
 * hệ thống vẫn trả về với status "degraded".
 */

export type CheckStatus = "ok" | "warn" | "fail";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message?: string;
  durationMs: number;
}

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthReport {
  status: HealthStatus;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: CheckResult[];
}

// ─── Individual checks ────────────────────────────────────────────────────────

/**
 * Kiểm tra các biến môi trường bắt buộc có mặt hay không.
 */
export async function checkEnvVars(): Promise<CheckResult> {
  const start = Date.now();
  const required = [
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  ];
  const missing = required.filter((key) => !process.env[key]);
  return {
    name: "env_vars",
    status: missing.length === 0 ? "ok" : "fail",
    message: missing.length > 0 ? `Thiếu biến: ${missing.join(", ")}` : undefined,
    durationMs: Date.now() - start,
  };
}

/**
 * Kiểm tra kết nối Firestore Admin SDK.
 * Đọc một document không tồn tại từ collection `systemConfig` —
 * nếu không throw là kết nối thành công.
 */
export async function checkFirestore(
  db: { collection: (name: string) => { doc: (id: string) => { get: () => Promise<unknown> } } },
): Promise<CheckResult> {
  const start = Date.now();
  try {
    await db.collection("systemConfig").doc("__healthcheck__").get();
    return { name: "firestore", status: "ok", durationMs: Date.now() - start };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { name: "firestore", status: "fail", message, durationMs: Date.now() - start };
  }
}

// ─── Aggregator ───────────────────────────────────────────────────────────────

/**
 * Chạy tất cả checks và tổng hợp thành HealthReport.
 * @param version    Phiên bản app
 * @param extraChecks  Danh sách check bổ sung (Firestore, v.v.)
 * @param builtinChecks  Override danh sách check mặc định (dùng khi test)
 */
export async function runHealthChecks(
  version: string,
  extraChecks: Array<() => Promise<CheckResult>> = [],
  builtinChecks: Array<() => Promise<CheckResult>> = [checkEnvVars],
): Promise<HealthReport> {
  const allChecks = [...builtinChecks, ...extraChecks];

  const results = await Promise.all(allChecks.map((fn) => fn()));

  const hasFail = results.some((r) => r.status === "fail");
  const hasWarn = results.some((r) => r.status === "warn");

  const status: HealthStatus = hasFail ? "unhealthy" : hasWarn ? "degraded" : "healthy";

  return {
    status,
    version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: results,
  };
}
