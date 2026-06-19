import { describe, expect, it } from "vitest";

import {
  agentActionSchema,
  maxScrollAmount,
  maxWaitMs,
  parseAgentAction
} from "../src/actions/schema.js";

describe("agent action schema", () => {
  it("validates every supported action type", () => {
    const actions = [
      { type: "click", ref: "dom-1" },
      { type: "type", ref: "dom-2", text: "Jordan Lee" },
      { type: "type", ref: "dom-2", text: "Jordan Lee", clear: false },
      { type: "select", ref: "dom-3", value: "express" },
      { type: "press", key: "Enter" },
      { type: "scroll", direction: "down" },
      { type: "scroll", direction: "up", amount: 350 },
      { type: "wait", ms: 250 },
      { type: "finish", answer: "Done" }
    ];

    for (const action of actions) {
      expect(agentActionSchema.safeParse(action).success).toBe(true);
    }
  });

  it("exports a parser that returns typed validated actions", () => {
    const action = parseAgentAction({ type: "click", ref: "dom-7" });

    expect(action).toEqual({ type: "click", ref: "dom-7" });
  });

  it("rejects malformed actions and arbitrary selector/script fields", () => {
    const invalidActions = [
      { type: "click", selector: "[data-test=\"place-order\"]" },
      { type: "click", ref: "[data-test=\"place-order\"]" },
      { type: "wait", ms: maxWaitMs + 1 },
      { type: "scroll", direction: "down", amount: maxScrollAmount + 1 },
      { type: "press", key: "" },
      { type: "finish", script: "document.body.remove()" },
      { type: "evaluate", script: "window.alert(1)" }
    ];

    for (const action of invalidActions) {
      expect(agentActionSchema.safeParse(action).success).toBe(false);
    }
  });
});
