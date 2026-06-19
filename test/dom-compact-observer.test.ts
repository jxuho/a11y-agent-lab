import { describe, expect, it } from "vitest";

import {
  calculateDomCompactStats,
  createDomCompactObservation,
  createDomCompactSummary,
  isInteractiveDomElementLike,
  isPasswordLikeField,
  type DomCompactBaseStats,
  type DomCompactElement
} from "../src/observers/domCompact.js";

const sampleElements: DomCompactElement[] = [
  {
    ref: "dom-1",
    tag: "h1",
    text: "Checkout",
    visible: true,
    interactive: false,
    bbox: {
      x: 24,
      y: 24,
      width: 320,
      height: 40
    }
  },
  {
    ref: "dom-2",
    tag: "input",
    type: "email",
    label: "Email address",
    placeholder: "you@example.com",
    dataTestId: "email",
    visible: true,
    interactive: true
  },
  {
    ref: "dom-3",
    tag: "button",
    visible: true,
    interactive: true
  },
  {
    ref: "dom-4",
    tag: "a",
    text: "Back to cart",
    href: "http://localhost:4310/cart",
    visible: true,
    interactive: true
  }
];

const baseStats: DomCompactBaseStats = {
  elementCount: 10,
  textNodeCount: 6,
  hiddenElementCount: 2
};

describe("DOM compact observer summary", () => {
  it("creates the expected output schema shape", () => {
    const observation = createDomCompactObservation({
      elements: sampleElements,
      url: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      root: "body",
      timestamp: "2026-06-19T00:00:00.000Z"
    });
    const summary = createDomCompactSummary(observation, baseStats);

    expect(observation).toEqual({
      mode: "dom-compact",
      url: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      timestamp: "2026-06-19T00:00:00.000Z",
      root: "body",
      elements: sampleElements
    });
    expect(summary).toMatchObject({
      mode: "dom-compact",
      url: observation.url,
      title: observation.title,
      timestamp: observation.timestamp,
      previewElements: sampleElements
    });
  });

  it("calculates DOM stats from serialized elements", () => {
    const stats = calculateDomCompactStats(sampleElements, baseStats);
    const expectedCharCount = JSON.stringify(sampleElements).length;

    expect(stats).toEqual({
      elementCount: 10,
      serializedElementCount: 4,
      textNodeCount: 6,
      interactiveElementCount: 3,
      unnamedInteractiveElementCount: 1,
      hiddenElementCount: 2,
      linkCount: 1,
      buttonCount: 1,
      inputCount: 1,
      formControlCount: 2,
      charCount: expectedCharCount,
      approxTokenCount: Math.ceil(expectedCharCount / 4)
    });
  });

  it("detects interactive element rules outside the browser context", () => {
    expect(isInteractiveDomElementLike({ tag: "button" })).toBe(true);
    expect(isInteractiveDomElementLike({ tag: "a", href: "https://example.test" })).toBe(true);
    expect(isInteractiveDomElementLike({ tag: "input", type: "email" })).toBe(true);
    expect(isInteractiveDomElementLike({ tag: "input", type: "hidden" })).toBe(false);
    expect(isInteractiveDomElementLike({ tag: "div", roleAttr: "button" })).toBe(true);
    expect(isInteractiveDomElementLike({ tag: "button", disabled: true })).toBe(false);
  });

  it("detects password-like fields so callers can omit sensitive values", () => {
    expect(isPasswordLikeField({ tag: "input", type: "password" })).toBe(true);
    expect(isPasswordLikeField({ tag: "input", name: "account-token" })).toBe(true);
    expect(isPasswordLikeField({ tag: "input", label: "Email address" })).toBe(false);
  });
});
