import { getAdminDb } from "@/lib/firebase/admin";
import { runHealthChecks, checkFirestore } from "@/lib/health-check";
import { createRequire } from "module";

// Đọc version từ package.json
const require = createRequire(import.meta.url);
const { version } = require("../../../../package.json") as { version: string };

/**
 * GET /api/health
 *
 * Endpoint kiểm tra trạng thái hệ thống.
 * - HTTP 200: healthy
 * - HTTP 200: degraded (có warning nhưng vẫn hoạt động)
 * - HTTP 503: unhealthy (có check thất bại nghiêm trọng)
 *
 * Không yêu cầu xác thực — public endpoint, dùng cho monitoring tools.
 * Không trả về thông tin nhạy cảm.
 */
export async function GET() {
  const db = getAdminDb();

  const report = await runHealthChecks(version, [
    () => checkFirestore(db),
  ]);

  const httpStatus = report.status === "unhealthy" ? 503 : 200;

  return Response.json(report, { status: httpStatus });
}
