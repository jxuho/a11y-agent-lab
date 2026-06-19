import type { Page } from "playwright";

import {
  defaultScrollAmount,
  type AgentAction
} from "./schema.js";
import type { RefRegistry } from "./refRegistry.js";

export interface ActionResult {
  ok: boolean;
  actionType: string;
  ref?: string;
  errorName?: string;
  errorMessage?: string;
  elapsedMs: number;
}

export async function executeAction(
  page: Page,
  action: AgentAction,
  registry: RefRegistry
): Promise<ActionResult> {
  const startedAt = Date.now();

  try {
    if (action.type === "finish") {
      return createActionResult(action, startedAt, true);
    }

    if (action.type === "wait") {
      await page.waitForTimeout(action.ms);
      return createActionResult(action, startedAt, true);
    }

    if (action.type === "press") {
      await page.keyboard.press(action.key);
      return createActionResult(action, startedAt, true);
    }

    if (action.type === "scroll") {
      const amount = action.amount ?? defaultScrollAmount;
      const deltaY = action.direction === "down" ? amount : -amount;

      await page.mouse.wheel(0, deltaY);
      return createActionResult(action, startedAt, true);
    }

    const target = await registry.resolve(action.ref);

    if (!target) {
      return createActionResult(action, startedAt, false, {
        errorName: "RefNotFoundError",
        errorMessage: `No executable target found for ref: ${action.ref}`
      });
    }

    if (action.type === "click") {
      await target.click();
      return createActionResult(action, startedAt, true);
    }

    if (action.type === "type") {
      if (action.clear === false) {
        await target.type(action.text);
      } else {
        await target.fill(action.text);
      }

      return createActionResult(action, startedAt, true);
    }

    await target.select(action.value);
    return createActionResult(action, startedAt, true);
  } catch (error: unknown) {
    return createActionResult(action, startedAt, false, serializeError(error));
  }
}

function createActionResult(
  action: AgentAction,
  startedAt: number,
  ok: boolean,
  error?: Pick<ActionResult, "errorName" | "errorMessage">
): ActionResult {
  return {
    ok,
    actionType: action.type,
    ...("ref" in action ? { ref: action.ref } : {}),
    ...error,
    elapsedMs: Date.now() - startedAt
  };
}

function serializeError(error: unknown): Pick<ActionResult, "errorName" | "errorMessage"> {
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
