import { Buffer } from "node:buffer";
import { ECDH } from "node:crypto";
import { z } from "zod";

const ALLOWED_PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
]);

function isTrustedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (!url.port || url.port === "443") &&
      (ALLOWED_PUSH_HOSTS.has(url.hostname) || url.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}

const pushEndpointSchema = z
  .url()
  .max(2_048)
  .refine(isTrustedPushEndpoint, "Unsupported push service")
  .transform((value) => new URL(value).href);

export function isValidP256PublicKey(value: string) {
  try {
    const decoded = Buffer.from(value, "base64url");
    if (decoded.byteLength !== 65 || decoded[0] !== 0x04) return false;

    ECDH.convertKey(decoded, "prime256v1", undefined, undefined, "uncompressed");
    return true;
  } catch {
    return false;
  }
}

function pushKeySchema(expectedBytes: number, mustBeP256Point = false) {
  return z
    .string()
    .min(16)
    .max(512)
    .regex(/^[A-Za-z0-9_-]+={0,2}$/u, "Invalid push key")
    .refine(
      (value) => {
        const decoded = Buffer.from(value, "base64url");
        return (
          decoded.byteLength === expectedBytes &&
          (!mustBeP256Point || isValidP256PublicKey(value))
        );
      },
      "Invalid push key",
    );
}

export const pushSubscriptionInputSchema = z
  .object({
    endpoint: pushEndpointSchema,
    expirationTime: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .nullable()
      .optional()
      .default(null),
    keys: z
      .object({
        p256dh: pushKeySchema(65, true),
        auth: pushKeySchema(16),
      })
      .strict(),
  })
  .strict();

export const pushEndpointInputSchema = z
  .object({ endpoint: pushEndpointSchema })
  .strict();

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>;
