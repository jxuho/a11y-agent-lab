import { describe, expect, it } from "vitest";

import { evaluatorConfigSchema } from "../src/evaluators/schema.js";

describe("evaluator config schema", () => {
  it("accepts valid text assertions", () => {
    expect(
      evaluatorConfigSchema.safeParse({
        assertions: [
          {
            type: "text",
            selector: "[data-test=\"step\"]",
            contains: "review",
            description: "Checkout should advance to review step"
          }
        ]
      }).success
    ).toBe(true);
  });

  it("accepts valid inputValue assertions", () => {
    expect(
      evaluatorConfigSchema.safeParse({
        assertions: [
          {
            type: "inputValue",
            selector: "[data-test=\"email\"]",
            equals: "test@example.com"
          }
        ]
      }).success
    ).toBe(true);
  });

  it("accepts valid URL assertions", () => {
    expect(
      evaluatorConfigSchema.safeParse({
        assertions: [
          {
            type: "url",
            contains: "/checkout"
          }
        ]
      }).success
    ).toBe(true);
  });

  it("accepts valid JS assertions", () => {
    expect(
      evaluatorConfigSchema.safeParse({
        assertions: [
          {
            type: "js",
            expression: "window.__APP_STATE__?.checkout?.email",
            equals: "test@example.com"
          },
          {
            type: "js",
            expression: "document.body !== null",
            truthy: true
          }
        ]
      }).success
    ).toBe(true);
  });

  it("rejects empty assertion arrays", () => {
    const result = evaluatorConfigSchema.safeParse({ assertions: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("At least one evaluator assertion is required");
    }
  });

  it("rejects unsupported assertion types", () => {
    expect(
      evaluatorConfigSchema.safeParse({
        assertions: [
          {
            type: "cookie",
            name: "session",
            equals: "abc"
          }
        ]
      }).success
    ).toBe(false);
  });

  it("rejects assertions with neither equals nor contains", () => {
    const result = evaluatorConfigSchema.safeParse({
      assertions: [
        {
          type: "text",
          selector: "[data-test=\"step\"]"
        }
      ]
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Provide exactly one of equals or contains");
    }
  });

  it("rejects assertions with both equals and contains", () => {
    const result = evaluatorConfigSchema.safeParse({
      assertions: [
        {
          type: "inputValue",
          selector: "[data-test=\"email\"]",
          equals: "test@example.com",
          contains: "@example.com"
        }
      ]
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Provide exactly one of equals or contains");
    }
  });

  it("rejects JS assertions with neither or both equals and truthy", () => {
    expect(
      evaluatorConfigSchema.safeParse({
        assertions: [
          {
            type: "js",
            expression: "true"
          }
        ]
      }).success
    ).toBe(false);
    expect(
      evaluatorConfigSchema.safeParse({
        assertions: [
          {
            type: "js",
            expression: "true",
            equals: true,
            truthy: true
          }
        ]
      }).success
    ).toBe(false);
  });
});
