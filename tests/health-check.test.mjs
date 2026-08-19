/**
 * tests/health-check.test.mjs
 * Kiểm tra Health Check Service
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  checkEnvVars,
  checkFirestore,
  runHealthChecks,
} from "../src/lib/health-check.ts";

// ─── checkEnvVars ─────────────────────────────────────────────────────────────

test("checkEnvVars: returns ok when all required env vars are set", async () => {
  // Thiết lập tạm các biến cần thiết
  const vars = {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
    NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
  };
  const orig = {};
  for (const [k, v] of Object.entries(vars)) {
    orig[k] = process.env[k];
    process.env[k] = v;
  }

  const result = await checkEnvVars();
  assert.equal(result.name, "env_vars");
  assert.equal(result.status, "ok");
  assert.equal(result.message, undefined);
  assert.ok(typeof result.durationMs === "number");

  // Khôi phục
  for (const [k, v] of Object.entries(orig)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test("checkEnvVars: returns fail when a required env var is missing", async () => {
  const key = "NEXT_PUBLIC_FIREBASE_PROJECT_ID";
  const orig = process.env[key];
  delete process.env[key];

  const result = await checkEnvVars();
  assert.equal(result.status, "fail");
  assert.ok(result.message?.includes(key));

  if (orig !== undefined) process.env[key] = orig;
});

// ─── checkFirestore ───────────────────────────────────────────────────────────

test("checkFirestore: returns ok when Firestore responds successfully", async () => {
  const mockDb = {
    collection() {
      return {
        doc() {
          return { async get() { return { exists: false }; } };
        },
      };
    },
  };

  const result = await checkFirestore(mockDb);
  assert.equal(result.name, "firestore");
  assert.equal(result.status, "ok");
  assert.ok(typeof result.durationMs === "number");
});

test("checkFirestore: returns fail when Firestore throws", async () => {
  const brokenDb = {
    collection() {
      return {
        doc() {
          return { async get() { throw new Error("Connection refused"); } };
        },
      };
    },
  };

  const result = await checkFirestore(brokenDb);
  assert.equal(result.name, "firestore");
  assert.equal(result.status, "fail");
  assert.ok(result.message?.includes("Connection refused"));
});

// ─── runHealthChecks ──────────────────────────────────────────────────────────

test("runHealthChecks: status is healthy when all checks pass", async () => {
  const okCheck = async () => ({ name: "custom", status: "ok", durationMs: 1 });

  const report = await runHealthChecks("0.1.0", [okCheck], []);
  assert.equal(report.status, "healthy");
  assert.equal(report.version, "0.1.0");
  assert.ok(typeof report.uptimeSeconds === "number");
  assert.ok(report.timestamp.length > 0);
  assert.ok(Array.isArray(report.checks));
});

test("runHealthChecks: status is degraded when any check is warn", async () => {
  const warnCheck = async () => ({ name: "custom", status: "warn", message: "slow", durationMs: 5 });

  const report = await runHealthChecks("0.1.0", [warnCheck], []);
  assert.equal(report.status, "degraded");
});

test("runHealthChecks: status is unhealthy when any check fails", async () => {
  const failCheck = async () => ({ name: "custom", status: "fail", message: "down", durationMs: 10 });

  const report = await runHealthChecks("0.1.0", [failCheck], []);
  assert.equal(report.status, "unhealthy");
});

test("runHealthChecks: unhealthy takes priority over warn", async () => {
  const warnCheck = async () => ({ name: "w", status: "warn", durationMs: 1 });
  const failCheck = async () => ({ name: "f", status: "fail", durationMs: 1 });

  const report = await runHealthChecks("0.1.0", [warnCheck, failCheck], []);
  assert.equal(report.status, "unhealthy");
});

test("runHealthChecks: includes all check results in the report", async () => {
  const checkA = async () => ({ name: "a", status: "ok", durationMs: 1 });
  const checkB = async () => ({ name: "b", status: "warn", durationMs: 2 });

  const report = await runHealthChecks("0.1.0", [checkA, checkB], []);
  // builtins injected as empty — only custom checks are present
  assert.ok(report.checks.some((c) => c.name === "a"));
  assert.ok(report.checks.some((c) => c.name === "b"));
});
