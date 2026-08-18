import assert from "node:assert/strict";
import test from "node:test";
import { sourceAttributionSchema } from "../src/features/content/schemas/content.schema.ts";

test("sources schema validates expected formats", () => {
  const validSource = {
    id: "cambridge-dict",
    title: "Cambridge Advanced Learner's Dictionary",
    publisher: "Cambridge University Press",
    canonicalUrl: "https://dictionary.cambridge.org",
    licenseCode: "CC-BY-NC-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-nc/4.0/",
    attributionText: "Cambridge Dictionary copyright Cambridge University Press.",
  };

  const parsed = sourceAttributionSchema.parse(validSource);
  assert.equal(parsed.id, "cambridge-dict");
  assert.equal(parsed.licenseCode, "CC-BY-NC-4.0");

  // Invalid URLs check
  const invalidSource = {
    ...validSource,
    canonicalUrl: "invalid-url-string",
  };

  assert.throws(() => {
    sourceAttributionSchema.parse(invalidSource);
  });
});
