import { describe, expect, it } from "vitest";

import {
  calculateAriaSnapshotStats,
  createAriaSnapshotSummary,
  isUnnamedInteractiveLine
} from "../src/observers/ariaSnapshot.js";

const sampleSnapshot = [
  "- document:",
  "  - heading \"Checkout\" [level=1]",
  "  - button \"Place order\"",
  "  - button",
  "  - textbox \"Email address\"",
  "  - textbox",
  "  - checkbox \"Save my details for next time\"",
  "  - link \"Back to cart\"",
  ""
].join("\n");

describe("ARIA snapshot observer summary", () => {
  it("creates the expected summary shape from snapshot text", () => {
    const summary = createAriaSnapshotSummary({
      snapshot: sampleSnapshot,
      url: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      snapshotRoot: "body",
      timestamp: "2026-06-19T00:00:00.000Z"
    });

    expect(summary).toEqual({
      mode: "aria-snapshot",
      url: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      timestamp: "2026-06-19T00:00:00.000Z",
      snapshotRoot: "body",
      stats: {
        charCount: sampleSnapshot.length,
        lineCount: 9,
        nonEmptyLineCount: 8,
        approxTokenCount: Math.ceil(sampleSnapshot.length / 4),
        roleLineCount: 8,
        buttonLineCount: 2,
        textboxLineCount: 2,
        checkboxLineCount: 1,
        linkLineCount: 1,
        unnamedInteractiveLineCount: 2
      },
      previewLines: [
        "- document:",
        "- heading \"Checkout\" [level=1]",
        "- button \"Place order\"",
        "- button",
        "- textbox \"Email address\"",
        "- textbox",
        "- checkbox \"Save my details for next time\"",
        "- link \"Back to cart\""
      ]
    });
  });

  it("calculates line counts and character counts", () => {
    const stats = calculateAriaSnapshotStats(sampleSnapshot);

    expect(stats.charCount).toBe(sampleSnapshot.length);
    expect(stats.lineCount).toBe(9);
    expect(stats.nonEmptyLineCount).toBe(8);
    expect(stats.approxTokenCount).toBe(Math.ceil(sampleSnapshot.length / 4));
  });

  it("counts role-specific lines", () => {
    const stats = calculateAriaSnapshotStats(sampleSnapshot);

    expect(stats.buttonLineCount).toBe(2);
    expect(stats.textboxLineCount).toBe(2);
    expect(stats.checkboxLineCount).toBe(1);
    expect(stats.linkLineCount).toBe(1);
  });

  it("detects unnamed interactive lines conservatively", () => {
    expect(isUnnamedInteractiveLine("  - button")).toBe(true);
    expect(isUnnamedInteractiveLine("  - textbox")).toBe(true);
    expect(isUnnamedInteractiveLine("  - button \"Place order\"")).toBe(false);
    expect(isUnnamedInteractiveLine("  - heading")).toBe(false);
  });
});
