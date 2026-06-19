import { describe, expect, it } from "vitest";

import { agentTaskConfigSchema } from "../src/agent/config.js";

describe("agent task config schema", () => {
  it("accepts a valid single-run task", () => {
    const result = agentTaskConfigSchema.safeParse({
      id: "checkout_email_001",
      name: "Checkout email task",
      url: "http://localhost:4310/checkout?variant=good-a11y",
      instruction: "Enter test@example.com into the email field.",
      observer: "dom-compact",
      appReady: {
        selector: "[data-ai-ready='true']",
        timeoutMs: 10_000
      },
      evaluator: {
        assertions: [
          {
            type: "inputValue",
            selector: "[data-test='email']",
            equals: "test@example.com"
          }
        ]
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxSteps).toBe(8);
      expect(result.data.observer).toBe("dom-compact");
    }
  });

  it("rejects missing required fields", () => {
    const result = agentTaskConfigSchema.safeParse({
      id: "missing-url",
      instruction: "Do the task.",
      evaluator: {
        assertions: [
          {
            type: "url",
            contains: "/checkout"
          }
        ]
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("url");
    }
  });
});
