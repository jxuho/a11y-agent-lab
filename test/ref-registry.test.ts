import type { Page } from "playwright";
import { describe, expect, it, vi } from "vitest";

import {
  buildDomCompactRefRegistry,
  collectDomCompactRefTargets
} from "../src/actions/refRegistry.js";
import { createDomCompactObservation, type DomCompactElement } from "../src/observers/domCompact.js";

const elements: DomCompactElement[] = [
  {
    ref: "dom-1",
    tag: "h1",
    text: "Checkout",
    visible: true,
    interactive: false,
    selectorHint: "[data-test=\"checkout-header\"]"
  },
  {
    ref: "dom-2",
    tag: "input",
    label: "Email address",
    dataTestId: "email",
    visible: true,
    interactive: true,
    selectorHint: "[data-test=\"email\"]"
  },
  {
    ref: "dom-3",
    tag: "button",
    text: "No selector",
    visible: true,
    interactive: true
  }
];

describe("DOM compact ref registry", () => {
  it("collects executable targets from interactive DOM compact elements with selector hints", () => {
    expect(collectDomCompactRefTargets(elements)).toEqual([
      {
        ref: "dom-2",
        selector: "[data-test=\"email\"]"
      }
    ]);
  });

  it("resolves DOM compact refs into Playwright-backed executable targets", async () => {
    const locator = {
      click: vi.fn(async () => undefined),
      fill: vi.fn(async () => undefined),
      type: vi.fn(async () => undefined),
      selectOption: vi.fn(async () => undefined)
    };
    const first = vi.fn(() => locator);
    const page = {
      locator: vi.fn(() => ({ first }))
    } as unknown as Page;
    const observation = createDomCompactObservation({
      elements,
      url: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      root: "body",
      timestamp: "2026-06-19T00:00:00.000Z"
    });
    const registry = buildDomCompactRefRegistry(page, observation);
    const target = await registry.resolve("dom-2");

    expect(target).not.toBeNull();
    await target?.click();
    await target?.fill("jordan@example.com");
    await target?.type("!");
    await target?.select("express");

    expect(page.locator).toHaveBeenCalledWith("[data-test=\"email\"]");
    expect(first).toHaveBeenCalledTimes(4);
    expect(locator.click).toHaveBeenCalledTimes(1);
    expect(locator.fill).toHaveBeenCalledWith("jordan@example.com");
    expect(locator.type).toHaveBeenCalledWith("!");
    expect(locator.selectOption).toHaveBeenCalledWith("express");
    await expect(registry.resolve("dom-404")).resolves.toBeNull();
  });
});
