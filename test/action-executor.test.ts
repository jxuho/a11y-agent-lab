import type { Page } from "playwright";
import { describe, expect, it, vi } from "vitest";

import { executeAction } from "../src/actions/executor.js";
import { defaultScrollAmount, type AgentAction } from "../src/actions/schema.js";
import type { ExecutableTarget, RefRegistry } from "../src/actions/refRegistry.js";

describe("action executor", () => {
  it("returns a structured failure for invalid refs", async () => {
    const page = createMockPage();
    const registry = createRegistry();
    const result = await executeAction(page, { type: "click", ref: "dom-404" }, registry);

    expect(result).toMatchObject({
      ok: false,
      actionType: "click",
      ref: "dom-404",
      errorName: "RefNotFoundError"
    });
  });

  it("supports finish without modifying the page", async () => {
    const page = createMockPage();
    const registry = createRegistry();
    const result = await executeAction(page, { type: "finish", answer: "Complete" }, registry);

    expect(result).toMatchObject({
      ok: true,
      actionType: "finish"
    });
    expect(page.waitForTimeout).not.toHaveBeenCalled();
    expect(page.keyboard.press).not.toHaveBeenCalled();
    expect(page.mouse.wheel).not.toHaveBeenCalled();
  });

  it("clicks, fills, types, and selects executable targets", async () => {
    const page = createMockPage();
    const target = createTarget("dom-1");
    const registry = createRegistry(target);

    await executeAction(page, { type: "click", ref: "dom-1" }, registry);
    await executeAction(page, { type: "type", ref: "dom-1", text: "Jordan Lee" }, registry);
    await executeAction(
      page,
      { type: "type", ref: "dom-1", text: " Jr.", clear: false },
      registry
    );
    await executeAction(page, { type: "select", ref: "dom-1", value: "standard" }, registry);

    expect(target.click).toHaveBeenCalledTimes(1);
    expect(target.fill).toHaveBeenCalledWith("Jordan Lee");
    expect(target.type).toHaveBeenCalledWith(" Jr.");
    expect(target.select).toHaveBeenCalledWith("standard");
  });

  it("runs page-level press, scroll, and wait actions", async () => {
    const page = createMockPage();
    const registry = createRegistry();

    await executeAction(page, { type: "press", key: "Tab" }, registry);
    await executeAction(page, { type: "scroll", direction: "down" }, registry);
    await executeAction(page, { type: "scroll", direction: "up", amount: 120 }, registry);
    await executeAction(page, { type: "wait", ms: 75 }, registry);

    expect(page.keyboard.press).toHaveBeenCalledWith("Tab");
    expect(page.mouse.wheel).toHaveBeenCalledWith(0, defaultScrollAmount);
    expect(page.mouse.wheel).toHaveBeenCalledWith(0, -120);
    expect(page.waitForTimeout).toHaveBeenCalledWith(75);
  });

  it("returns a structured failure when target execution throws", async () => {
    const page = createMockPage();
    const target = createTarget("dom-1");
    vi.mocked(target.click).mockRejectedValueOnce(new Error("Element detached"));
    const registry = createRegistry(target);
    const result = await executeAction(page, { type: "click", ref: "dom-1" }, registry);

    expect(result).toMatchObject({
      ok: false,
      actionType: "click",
      ref: "dom-1",
      errorName: "Error",
      errorMessage: "Element detached"
    });
  });

  it("returns structured failures for stale fill and select targets", async () => {
    const page = createMockPage();
    const target = createTarget("dom-1");
    const registry = createRegistry(target);

    vi.mocked(target.fill).mockRejectedValueOnce(new Error("Target closed"));
    vi.mocked(target.select).mockRejectedValueOnce(new Error("Element is not a select"));

    await expect(
      executeAction(page, { type: "type", ref: "dom-1", text: "test@example.com" }, registry)
    ).resolves.toMatchObject({
      ok: false,
      actionType: "type",
      ref: "dom-1",
      errorMessage: "Target closed"
    });
    await expect(
      executeAction(page, { type: "select", ref: "dom-1", value: "express" }, registry)
    ).resolves.toMatchObject({
      ok: false,
      actionType: "select",
      ref: "dom-1",
      errorMessage: "Element is not a select"
    });
  });
});

function createMockPage(): Page {
  return {
    waitForTimeout: vi.fn(async () => undefined),
    keyboard: {
      press: vi.fn(async () => undefined)
    },
    mouse: {
      wheel: vi.fn(async () => undefined)
    }
  } as unknown as Page;
}

function createTarget(ref: string): ExecutableTarget {
  return {
    ref,
    click: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    type: vi.fn(async () => undefined),
    select: vi.fn(async () => undefined)
  };
}

function createRegistry(target?: ExecutableTarget): RefRegistry {
  return {
    resolve: vi.fn(async (ref: string) => (target && target.ref === ref ? target : null))
  };
}
