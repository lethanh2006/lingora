import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { stableIdSchema } from "../src/features/content/schemas/content.schema.ts";

const workflowRequestSchema = z.object({
  lessonId: stableIdSchema,
  action: z.enum(["submit_review", "approve", "reject", "retire"]),
  comment: z.string().trim().max(2_000).optional(),
});

test("workflow-api: validates correct request payloads", () => {
  const payloads = [
    { lessonId: "en-basics-u1-l1", action: "submit_review" },
    { lessonId: "en-basics-u1-l1", action: "approve" },
    { lessonId: "en-basics-u1-l1", action: "reject", comment: "Cần bổ sung thêm ví dụ thực tế" },
    { lessonId: "en-basics-u1-l1", action: "retire" },
  ];

  for (const payload of payloads) {
    const parsed = workflowRequestSchema.parse(payload);
    assert.equal(parsed.lessonId, "en-basics-u1-l1");
    assert.equal(parsed.action, payload.action);
  }
});

test("workflow-api: rejects incorrect request payloads", () => {
  const invalidPayloads = [
    {},
    { lessonId: "en-basics-u1-l1" },
    { lessonId: "en-basics-u1-l1", action: "invalid_action" },
    { lessonId: "en-basics-u1-l1", action: "reject", comment: "a".repeat(2001) },
    { lessonId: "invalid_id!", action: "submit_review" },
  ];

  for (const payload of invalidPayloads) {
    assert.throws(() => {
      workflowRequestSchema.parse(payload);
    });
  }
});
