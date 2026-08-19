import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { stableIdSchema } from "../src/features/content/schemas/content.schema.ts";

const compileRequestSchema = z.object({
  blueprintId: stableIdSchema,
});

test("exams-api: compileRequestSchema validates valid blueprintId", () => {
  const payload = { blueprintId: "blueprint-eng-a1" };
  const parsed = compileRequestSchema.parse(payload);
  assert.equal(parsed.blueprintId, "blueprint-eng-a1");
});

test("exams-api: compileRequestSchema rejects invalid blueprintId", () => {
  const invalidPayloads = [
    {},
    { blueprintId: "" },
    { blueprintId: 123 },
    { blueprintId: "a".repeat(129) }, // too long
    { blueprintId: "invalid-char!" },
  ];

  for (const payload of invalidPayloads) {
    assert.throws(() => {
      compileRequestSchema.parse(payload);
    });
  }
});
