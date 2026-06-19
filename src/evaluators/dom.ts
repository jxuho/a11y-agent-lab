import type { Page } from "playwright";

import type {
  EvaluatorAssertion,
  InputValueEvaluatorAssertion,
  JsEvaluatorAssertion,
  TextEvaluatorAssertion,
  UrlEvaluatorAssertion
} from "./schema.js";
import type {
  AssertionResult,
  EvaluationContext,
  EvaluationResult,
  Evaluator
} from "./types.js";

export class DomPageStateEvaluator implements Evaluator {
  readonly name = "dom-page-state";

  async evaluate(context: EvaluationContext): Promise<EvaluationResult> {
    const startedAt = Date.now();
    const assertions: AssertionResult[] = [];

    for (const assertion of context.config.assertions) {
      assertions.push(await evaluateAssertion(context.page, assertion, context.options ?? {}));
    }

    return {
      success: assertions.every((assertion) => assertion.ok),
      elapsedMs: Date.now() - startedAt,
      assertions
    };
  }
}

async function evaluateAssertion(
  page: Page,
  assertion: EvaluatorAssertion,
  options: { allowJsAssertions?: boolean }
): Promise<AssertionResult> {
  if (assertion.type === "text") {
    return evaluateTextAssertion(page, assertion);
  }

  if (assertion.type === "inputValue") {
    return evaluateInputValueAssertion(page, assertion);
  }

  if (assertion.type === "url") {
    return evaluateUrlAssertion(page, assertion);
  }

  return evaluateJsAssertion(page, assertion, options.allowJsAssertions === true);
}

async function evaluateTextAssertion(
  page: Page,
  assertion: TextEvaluatorAssertion
): Promise<AssertionResult> {
  try {
    const target = page.locator(assertion.selector).first();
    const count = await page.locator(assertion.selector).count();

    if (count === 0) {
      return selectorFailure(assertion, "SelectorNotFoundError");
    }

    const actual = (await target.textContent())?.trim() ?? "";

    return compareTextAssertion(assertion, actual);
  } catch (error: unknown) {
    return assertionError(assertion, error);
  }
}

async function evaluateInputValueAssertion(
  page: Page,
  assertion: InputValueEvaluatorAssertion
): Promise<AssertionResult> {
  try {
    const target = page.locator(assertion.selector).first();
    const count = await page.locator(assertion.selector).count();

    if (count === 0) {
      return selectorFailure(assertion, "SelectorNotFoundError");
    }

    const actual = await target.inputValue();

    return compareTextAssertion(assertion, actual);
  } catch (error: unknown) {
    return assertionError(assertion, error);
  }
}

function evaluateUrlAssertion(page: Page, assertion: UrlEvaluatorAssertion): AssertionResult {
  try {
    const actual = page.url();

    return compareTextAssertion(assertion, actual);
  } catch (error: unknown) {
    return assertionError(assertion, error);
  }
}

async function evaluateJsAssertion(
  page: Page,
  assertion: JsEvaluatorAssertion,
  allowJsAssertions: boolean
): Promise<AssertionResult> {
  if (!allowJsAssertions) {
    return {
      ok: false,
      type: assertion.type,
      description: assertion.description,
      errorName: "JsAssertionsDisabledError",
      errorMessage:
        "JS assertions are disabled. Enable allowJsAssertions only for trusted local experiment configs."
    };
  }

  try {
    const actual = await page.evaluate((expression) => {
      return (0, eval)(expression);
    }, assertion.expression);

    if ("truthy" in assertion) {
      return {
        ok: Boolean(actual),
        type: assertion.type,
        description: assertion.description,
        actual,
        expected: true
      };
    }

    return {
      ok: Object.is(actual, assertion.equals),
      type: assertion.type,
      description: assertion.description,
      actual,
      expected: assertion.equals
    };
  } catch (error: unknown) {
    return assertionError(assertion, error);
  }
}

function compareTextAssertion(
  assertion: TextEvaluatorAssertion | InputValueEvaluatorAssertion | UrlEvaluatorAssertion,
  actual: string
): AssertionResult {
  const expected = assertion.equals ?? assertion.contains ?? "";
  const ok =
    assertion.equals !== undefined ? actual === assertion.equals : actual.includes(expected);

  return {
    ok,
    type: assertion.type,
    description: assertion.description,
    ...("selector" in assertion ? { selector: assertion.selector } : {}),
    actual,
    expected
  };
}

function selectorFailure(
  assertion: TextEvaluatorAssertion | InputValueEvaluatorAssertion,
  errorName: string
): AssertionResult {
  return {
    ok: false,
    type: assertion.type,
    description: assertion.description,
    selector: assertion.selector,
    errorName,
    errorMessage: `No element found for selector: ${assertion.selector}`
  };
}

function assertionError(
  assertion: EvaluatorAssertion,
  error: unknown
): AssertionResult {
  const serialized = serializeError(error);

  return {
    ok: false,
    type: assertion.type,
    description: assertion.description,
    ...("selector" in assertion ? { selector: assertion.selector } : {}),
    ...serialized
  };
}

function serializeError(error: unknown): Pick<AssertionResult, "errorName" | "errorMessage"> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message
    };
  }

  return {
    errorName: "Error",
    errorMessage: String(error)
  };
}
