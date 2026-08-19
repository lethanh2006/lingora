import "server-only";
import { COLLECTIONS } from "./firebase/collections.ts";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
}

/**
 * Checks rate limit for a given identifier (e.g. UID or IP) and action.
 * Employs a Firestore transaction to ensure atomicity across serverless containers.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  config: RateLimitConfig,
  customDb?: any,
): Promise<RateLimitResult> {
  const db = customDb || (await import("./firebase/admin.ts")).getAdminDb();
  // Sanitize path characters in document IDs
  const docId = `${identifier.replace(/[\/ \t\r\n]/g, "_")}_${action}`;
  const docRef = db.collection(COLLECTIONS.rateLimits).doc(docId);

  const now = new Date();

  return await db.runTransaction(async (transaction: any) => {
    const docSnap = await transaction.get(docRef);

    if (!docSnap.exists) {
      const resetTime = new Date(now.getTime() + config.windowSeconds * 1000);
      transaction.set(docRef, {
        count: 1,
        windowEnd: resetTime,
      });
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    const data = docSnap.data() as { count: number; windowEnd: any };
    const windowEnd =
      typeof data.windowEnd?.toDate === "function" ? data.windowEnd.toDate() : data.windowEnd;

    if (now > windowEnd) {
      // Window expired, reset window and count
      const resetTime = new Date(now.getTime() + config.windowSeconds * 1000);
      transaction.set(docRef, {
        count: 1,
        windowEnd: resetTime,
      });
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    if (data.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: windowEnd,
      };
    }

    const newCount = data.count + 1;
    transaction.update(docRef, { count: newCount });

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - newCount,
      resetTime: windowEnd,
    };
  });
}
