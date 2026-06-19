import { describe, expect, it } from "vitest";

import {
  agentTaskConfigSchema,
  maxAgentSteps,
  maxAppReadyTimeoutMs
} from "../src/agent/config.js";

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

  it("rejects unsupported observer names clearly", () => {
    const result = agentTaskConfigSchema.safeParse({
      id: "bad-observer",
      url: "http://localhost:4310/checkout",
      instruction: "Do the task.",
      observer: "hybrid",
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
      expect(result.error.message).toContain("Invalid enum value");
      expect(result.error.message).toContain("dom-compact");
    }
  });

  it("rejects unsafe maxSteps values", () => {
    expect(
      agentTaskConfigSchema.safeParse({
        id: "too-many-steps",
        url: "http://localhost:4310/checkout",
        instruction: "Do the task.",
        maxSteps: maxAgentSteps + 1,
        evaluator: {
          assertions: [
            {
              type: "url",
              contains: "/checkout"
            }
          ]
        }
      }).success
    ).toBe(false);
    expect(
      agentTaskConfigSchema.safeParse({
        id: "zero-steps",
        url: "http://localhost:4310/checkout",
        instruction: "Do the task.",
        maxSteps: 0,
        evaluator: {
          assertions: [
            {
              type: "url",
              contains: "/checkout"
            }
          ]
        }
      }).success
    ).toBe(false);
  });

  it("rejects unsafe appReady timeout values", () => {
    const result = agentTaskConfigSchema.safeParse({
      id: "slow-ready",
      url: "http://localhost:4310/checkout",
      instruction: "Do the task.",
      appReady: {
        selector: "body",
        timeoutMs: maxAppReadyTimeoutMs + 1
      },
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
      expect(result.error.message).toContain("timeoutMs");
    }
  });
});
