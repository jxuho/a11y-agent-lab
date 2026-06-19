import type { Page } from "playwright";
import { describe, expect, it } from "vitest";

import { DomPageStateEvaluator } from "../src/evaluators/dom.js";
import type { EvaluatorConfig } from "../src/evaluators/schema.js";

describe("DOM page-state evaluator", () => {
  it("passes text assertions with equals and contains", async () => {
    const result = await evaluate(
      createPage({
        textBySelector: {
          "[data-test=\"heading\"]": " Checkout Review ",
          "[data-test=\"step\"]": "review"
        }
      }),
      {
        assertions: [
          {
            type: "text",
            selector: "[data-test=\"heading\"]",
            equals: "Checkout Review"
          },
          {
            type: "text",
            selector: "[data-test=\"step\"]",
            contains: "view"
          }
        ]
      }
    );

    expect(result.success).toBe(true);
    expect(result.assertions).toEqual([
      expect.objectContaining({
        ok: true,
        type: "text",
        actual: "Checkout Review",
        expected: "Checkout Review"
      }),
      expect.objectContaining({
        ok: true,
        type: "text",
        actual: "review",
        expected: "view"
      })
    ]);
  });

  it("fails text assertions when selector is missing", async () => {
    const result = await evaluate(createPage(), {
      assertions: [
        {
          type: "text",
          selector: "[data-test=\"missing\"]",
          equals: "Anything"
        }
      ]
    });

    expect(result.success).toBe(false);
    expect(result.assertions[0]).toMatchObject({
      ok: false,
      type: "text",
      selector: "[data-test=\"missing\"]",
      errorName: "SelectorNotFoundError"
    });
  });

  it("passes inputValue assertions with equals and contains", async () => {
    const result = await evaluate(
      createPage({
        inputValueBySelector: {
          "[data-test=\"email\"]": "test@example.com",
          "[data-test=\"city\"]": "Portland"
        }
      }),
      {
        assertions: [
          {
            type: "inputValue",
            selector: "[data-test=\"email\"]",
            equals: "test@example.com"
          },
          {
            type: "inputValue",
            selector: "[data-test=\"city\"]",
            contains: "land"
          }
        ]
      }
    );

    expect(result.success).toBe(true);
    expect(result.assertions).toEqual([
      expect.objectContaining({
        ok: true,
        type: "inputValue",
        actual: "test@example.com",
        expected: "test@example.com"
      }),
      expect.objectContaining({
        ok: true,
        type: "inputValue",
        actual: "Portland",
        expected: "land"
      })
    ]);
  });

  it("fails inputValue assertions when selector is missing", async () => {
    const result = await evaluate(createPage(), {
      assertions: [
        {
          type: "inputValue",
          selector: "[data-test=\"missing\"]",
          contains: "x"
        }
      ]
    });

    expect(result.success).toBe(false);
    expect(result.assertions[0]).toMatchObject({
      ok: false,
      type: "inputValue",
      errorName: "SelectorNotFoundError"
    });
  });

  it("passes and fails URL assertions with contains", async () => {
    const passing = await evaluate(createPage({ url: "http://localhost:4310/checkout/review" }), {
      assertions: [
        {
          type: "url",
          contains: "/checkout"
        }
      ]
    });
    const failing = await evaluate(createPage({ url: "http://localhost:4310/cart" }), {
      assertions: [
        {
          type: "url",
          contains: "/checkout"
        }
      ]
    });

    expect(passing.success).toBe(true);
    expect(failing.success).toBe(false);
    expect(failing.assertions[0]).toMatchObject({
      ok: false,
      type: "url",
      actual: "http://localhost:4310/cart",
      expected: "/checkout"
    });
  });

  it("passes JS assertions with truthy and equals when explicitly enabled", async () => {
    const result = await evaluate(
      createPage(),
      {
        assertions: [
          {
            type: "js",
            expression: "1 + 1 === 2",
            truthy: true
          },
          {
            type: "js",
            expression: "1 + 1",
            equals: 2
          }
        ]
      },
      { allowJsAssertions: true }
    );

    expect(result.success).toBe(true);
    expect(result.assertions).toEqual([
      expect.objectContaining({
        ok: true,
        type: "js",
        actual: true,
        expected: true
      }),
      expect.objectContaining({
        ok: true,
        type: "js",
        actual: 2,
        expected: 2
      })
    ]);
  });

  it("disables JS assertions by default", async () => {
    const result = await evaluate(createPage(), {
      assertions: [
        {
          type: "js",
          expression: "true",
          truthy: true
        }
      ]
    });

    expect(result.success).toBe(false);
    expect(result.assertions[0]).toMatchObject({
      ok: false,
      type: "js",
      errorName: "JsAssertionsDisabledError"
    });
  });

  it("returns a structured JS assertion failure when expression throws", async () => {
    const result = await evaluate(
      createPage(),
      {
        assertions: [
          {
            type: "js",
            expression: "(() => { throw new Error('boom') })()",
            truthy: true
          }
        ]
      },
      { allowJsAssertions: true }
    );

    expect(result.success).toBe(false);
    expect(result.assertions[0]).toMatchObject({
      ok: false,
      type: "js",
      errorName: "Error",
      errorMessage: "boom"
    });
  });

  it("succeeds only when all assertions pass", async () => {
    const page = createPage({
      textBySelector: {
        "[data-test=\"step\"]": "review"
      },
      inputValueBySelector: {
        "[data-test=\"email\"]": "test@example.com"
      },
      url: "http://localhost:4310/checkout/review"
    });
    const success = await evaluate(page, {
      assertions: [
        {
          type: "text",
          selector: "[data-test=\"step\"]",
          equals: "review"
        },
        {
          type: "inputValue",
          selector: "[data-test=\"email\"]",
          contains: "@example.com"
        },
        {
          type: "url",
          contains: "/checkout"
        }
      ]
    });
    const failure = await evaluate(page, {
      assertions: [
        {
          type: "text",
          selector: "[data-test=\"step\"]",
          equals: "review"
        },
        {
          type: "url",
          contains: "/complete"
        }
      ]
    });

    expect(success.success).toBe(true);
    expect(success.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(failure.success).toBe(false);
    expect(failure.assertions.map((assertion) => assertion.ok)).toEqual([true, false]);
  });
});

function evaluate(
  page: Page,
  config: EvaluatorConfig,
  options?: { allowJsAssertions?: boolean }
) {
  return new DomPageStateEvaluator().evaluate({ page, config, options });
}

function createPage(options: {
  textBySelector?: Record<string, string>;
  inputValueBySelector?: Record<string, string>;
  url?: string;
} = {}): Page {
  const textBySelector = options.textBySelector ?? {};
  const inputValueBySelector = options.inputValueBySelector ?? {};

  return {
    locator: (selector: string) => {
      const hasText = Object.prototype.hasOwnProperty.call(textBySelector, selector);
      const hasInputValue = Object.prototype.hasOwnProperty.call(inputValueBySelector, selector);

      return {
        count: async () => (hasText || hasInputValue ? 1 : 0),
        first: () => ({
          textContent: async () => textBySelector[selector] ?? "",
          inputValue: async () => {
            if (!hasInputValue) {
              throw new Error(`Element is not input-like: ${selector}`);
            }

            return inputValueBySelector[selector];
          }
        })
      };
    },
    url: () => options.url ?? "http://localhost:4310/checkout",
    evaluate: async <T>(fn: (expression: string) => T, expression: string) => fn(expression)
  } as unknown as Page;
}
