import { describe, expect, it } from "vitest";

import { serializeError } from "../src/errors.js";
import {
  ariaSummarySchema,
  cdpAxSummarySchema,
  domSummarySchema,
  serializedErrorSchema,
  snapshotMetadataSchema,
  snapshotSuiteSummarySchema
} from "../src/schemas/output.js";

describe("v0.1 output schemas", () => {
  it("validates snapshot metadata and observer summaries", () => {
    expect(
      snapshotMetadataSchema.parse({
        mode: "snapshot-metadata",
        url: "http://localhost:4310/checkout?variant=good-a11y",
        finalUrl: "http://localhost:4310/checkout?variant=good-a11y",
        title: "Checkout",
        timestamp: "2026-06-19T00:00:00.000Z",
        suiteId: "checkout",
        variantId: "good-a11y",
        viewport: { width: 1280, height: 720 },
        readySelector: 'body[data-ai-ready="true"]',
        snapshotRoot: "body",
        timeoutMs: 15000,
        userAgent: "test-agent"
      }).mode
    ).toBe("snapshot-metadata");

    expect(
      cdpAxSummarySchema.parse({
        mode: "cdp-ax",
        url: "http://localhost:4310/checkout?variant=good-a11y",
        finalUrl: "http://localhost:4310/checkout?variant=good-a11y",
        title: "Checkout",
        timestamp: "2026-06-19T00:00:00.000Z",
        stats: {
          totalNodeCount: 1,
          ignoredNodeCount: 0,
          nonIgnoredNodeCount: 1,
          interactiveNodeCount: 0,
          unnamedInteractiveNodeCount: 0,
          duplicateInteractiveNameCount: 0
        },
        nodes: [
          {
            nodeId: "1",
            role: "RootWebArea",
            name: "Checkout",
            description: "",
            value: "",
            ignored: false,
            childIds: [],
            properties: {}
          }
        ]
      }).mode
    ).toBe("cdp-ax");

    expect(
      ariaSummarySchema.parse({
        mode: "aria-snapshot",
        url: "http://localhost:4310/checkout?variant=good-a11y",
        title: "Checkout",
        timestamp: "2026-06-19T00:00:00.000Z",
        snapshotRoot: "body",
        stats: {
          charCount: 10,
          lineCount: 1,
          nonEmptyLineCount: 1,
          approxTokenCount: 3,
          roleLineCount: 1,
          buttonLineCount: 0,
          textboxLineCount: 0,
          checkboxLineCount: 0,
          linkLineCount: 0,
          unnamedInteractiveLineCount: 0
        },
        previewLines: ["- document:"]
      }).mode
    ).toBe("aria-snapshot");

    expect(
      domSummarySchema.parse({
        mode: "dom-compact",
        url: "http://localhost:4310/checkout?variant=good-a11y",
        title: "Checkout",
        timestamp: "2026-06-19T00:00:00.000Z",
        stats: {
          elementCount: 1,
          serializedElementCount: 1,
          textNodeCount: 0,
          interactiveElementCount: 0,
          unnamedInteractiveElementCount: 0,
          hiddenElementCount: 0,
          linkCount: 0,
          buttonCount: 0,
          inputCount: 0,
          formControlCount: 0,
          charCount: 20,
          approxTokenCount: 5
        },
        previewElements: [
          {
            ref: "dom-1",
            tag: "h1",
            text: "Checkout",
            visible: true,
            interactive: false
          }
        ]
      }).mode
    ).toBe("dom-compact");
  });

  it("validates suite summary shape with mixed success and failure", () => {
    const summary = snapshotSuiteSummarySchema.parse({
      suiteId: "checkout",
      timestamp: "2026-06-19T00:00:00.000Z",
      configPath: "experiments/checkout.snapshot.yaml",
      outDir: "results/snapshots/checkout",
      variantCount: 2,
      successfulSnapshotCount: 1,
      failedSnapshotCount: 1,
      variants: [
        {
          id: "good-a11y",
          url: "http://localhost:4310/checkout?variant=good-a11y",
          outDir: "results/snapshots/checkout/good-a11y",
          status: "success",
          stats: {
            cdpAx: {
              totalNodeCount: 1,
              interactiveNodeCount: 0,
              unnamedInteractiveNodeCount: 0,
              duplicateInteractiveNameCount: 0
            }
          }
        },
        {
          id: "bad",
          url: "http://localhost:4310/checkout?variant=bad",
          outDir: "results/snapshots/checkout/bad",
          status: "failed",
          errorName: "TimeoutError",
          errorMessage: "ready selector timed out"
        }
      ]
    });

    expect(summary.variants[1].status).toBe("failed");
  });

  it("serializes errors with a stable shape", () => {
    const serialized = serializeError(new TypeError("bad selector"));

    expect(serializedErrorSchema.parse(serialized)).toMatchObject({
      errorName: "TypeError",
      errorMessage: "bad selector"
    });
  });
});
