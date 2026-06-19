import { describe, expect, it } from "vitest";

import { buildActionPrompt, stableStringify } from "../src/prompts/builder.js";

describe("action prompt builder", () => {
  it("includes task, URL, observation mode, observation content, and previous steps", () => {
    const prompt = buildActionPrompt({
      taskInstruction: "Complete checkout for the test shopper.",
      currentUrl: "http://localhost:4310/checkout?variant=good-a11y",
      observationMode: "dom-compact",
      stepNumber: 3,
      previousStepSummaries: [
        "step 1 clicked dom-2",
        {
          step: 2,
          actionType: "type",
          ref: "dom-3",
          ok: true,
          summary: "typed email"
        }
      ],
      observation: {
        mode: "dom-compact",
        elements: [
          {
            ref: "dom-7",
            tag: "button",
            text: "Place order",
            interactive: true
          }
        ]
      }
    });

    expect(prompt.userPrompt).toContain("Complete checkout for the test shopper.");
    expect(prompt.userPrompt).toContain("http://localhost:4310/checkout?variant=good-a11y");
    expect(prompt.userPrompt).toContain("dom-compact");
    expect(prompt.userPrompt).toContain('"ref": "dom-7"');
    expect(prompt.userPrompt).toContain("step 1 clicked dom-2");
    expect(prompt.userPrompt).toContain('"actionType": "type"');
    expect(prompt.userPrompt).toContain("Step:\n3");
  });

  it("instructs strict JSON-only action output and forbids unsafe output forms", () => {
    const prompt = buildActionPrompt({
      taskInstruction: "Click the primary button.",
      currentUrl: "http://localhost:4310/checkout",
      observationMode: "aria-snapshot",
      observation: "- button \"Place order\""
    });

    expect(prompt.systemPrompt).toContain("Output exactly one JSON action object.");
    expect(prompt.systemPrompt).toContain("Do not output markdown.");
    expect(prompt.systemPrompt).toContain("Do not output prose.");
    expect(prompt.systemPrompt).toContain("Do not output code fences.");
    expect(prompt.systemPrompt).toContain("Do not output arbitrary Playwright code.");
    expect(prompt.systemPrompt).toContain("Do not output JavaScript.");
    expect(prompt.systemPrompt).toContain("Do not output CSS selectors.");
    expect(prompt.systemPrompt).toContain("Do not invent refs.");
    expect(prompt.userPrompt).toContain('{ "type": "click", "ref": "dom-1" }');
  });

  it("serializes object content deterministically", () => {
    const first = stableStringify({
      z: 1,
      a: {
        b: 2,
        a: 1
      }
    });
    const second = stableStringify({
      a: {
        a: 1,
        b: 2
      },
      z: 1
    });

    expect(first).toBe(second);
    expect(first.indexOf('"a"')).toBeLessThan(first.indexOf('"z"'));
  });
});
