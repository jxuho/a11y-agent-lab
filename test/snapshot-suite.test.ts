import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  buildVariantUrl,
  loadSnapshotSuiteConfig,
  snapshotSuiteConfigSchema,
  type SnapshotSuiteConfig
} from "../src/snapshotSuite/config.js";
import { parseSnapshotSuiteArgs } from "../src/snapshotSuite/options.js";
import { runSnapshotSuiteFromConfig } from "../src/snapshotSuite/runner.js";
import {
  createSnapshotSuiteCsv,
  createSnapshotSuiteSummary,
  selectVariantStats,
  type SnapshotSuiteVariantResult
} from "../src/snapshotSuite/summary.js";

describe("snapshot suite config", () => {
  it("validates snapshot suite config defaults", () => {
    const config = snapshotSuiteConfigSchema.parse({
      id: "checkout",
      baseUrl: "http://localhost:4310/checkout",
      variants: [{ id: "good-a11y", query: "?variant=good-a11y" }]
    });

    expect(config.readySelector).toBe('body[data-ai-ready="true"]');
    expect(config.snapshotRoot).toBe("body");
  });

  it("loads the example checkout config", async () => {
    const config = await loadSnapshotSuiteConfig("experiments/checkout.snapshot.yaml");

    expect(config.id).toBe("checkout");
    expect(config.variants.map((variant) => variant.id)).toEqual([
      "good-a11y",
      "no-label",
      "icon-only-button",
      "duplicate-names",
      "hidden-noise"
    ]);
  });

  it("rejects variants that define both path and query", () => {
    expect(() =>
      snapshotSuiteConfigSchema.parse({
        id: "checkout",
        baseUrl: "http://localhost:4310/checkout",
        variants: [{ id: "bad", path: "/checkout", query: "?variant=bad" }]
      })
    ).toThrow();
  });

  it("constructs variant URLs from base URL with query or path", () => {
    expect(
      buildVariantUrl("http://localhost:4310/checkout", {
        id: "good-a11y",
        query: "?variant=good-a11y"
      })
    ).toBe("http://localhost:4310/checkout?variant=good-a11y");
    expect(
      buildVariantUrl("http://localhost:4310/checkout", {
        id: "settings",
        path: "/settings?variant=good-a11y"
      })
    ).toBe("http://localhost:4310/settings?variant=good-a11y");
  });
});

describe("snapshot suite options", () => {
  it("parses snapshot-suite CLI options", () => {
    const options = parseSnapshotSuiteArgs([
      "--config",
      "experiments/checkout.snapshot.yaml",
      "--out",
      "results/snapshots",
      "--headless",
      "false",
      "--timeout-ms",
      "5000"
    ]);

    expect(options).toEqual({
      config: "experiments/checkout.snapshot.yaml",
      out: "results/snapshots",
      headless: false,
      timeoutMs: 5000
    });
  });
});

describe("snapshot suite summary", () => {
  it("aggregates selected stats from observer summaries", () => {
    const stats = selectVariantStats({
      cdpAx: {
        mode: "cdp-ax",
        url: "http://localhost:4310/checkout?variant=good-a11y",
        title: "Checkout",
        timestamp: "2026-06-19T00:00:00.000Z",
        stats: {
          totalNodeCount: 100,
          ignoredNodeCount: 10,
          nonIgnoredNodeCount: 90,
          interactiveNodeCount: 12,
          unnamedInteractiveNodeCount: 1,
          duplicateInteractiveNameCount: 2
        },
        nodes: []
      },
      aria: {
        mode: "aria-snapshot",
        url: "http://localhost:4310/checkout?variant=good-a11y",
        title: "Checkout",
        timestamp: "2026-06-19T00:00:00.000Z",
        snapshotRoot: "body",
        stats: {
          charCount: 1200,
          lineCount: 40,
          nonEmptyLineCount: 38,
          approxTokenCount: 300,
          roleLineCount: 20,
          buttonLineCount: 3,
          textboxLineCount: 8,
          checkboxLineCount: 1,
          linkLineCount: 0,
          unnamedInteractiveLineCount: 1
        },
        previewLines: []
      },
      dom: {
        mode: "dom-compact",
        url: "http://localhost:4310/checkout?variant=good-a11y",
        title: "Checkout",
        timestamp: "2026-06-19T00:00:00.000Z",
        stats: {
          elementCount: 40,
          serializedElementCount: 30,
          textNodeCount: 20,
          interactiveElementCount: 10,
          unnamedInteractiveElementCount: 1,
          hiddenElementCount: 3,
          linkCount: 0,
          buttonCount: 3,
          inputCount: 8,
          formControlCount: 11,
          charCount: 4000,
          approxTokenCount: 1000
        },
        previewElements: []
      }
    });

    expect(stats).toEqual({
      cdpAx: {
        totalNodeCount: 100,
        interactiveNodeCount: 12,
        unnamedInteractiveNodeCount: 1,
        duplicateInteractiveNameCount: 2
      },
      aria: {
        charCount: 1200,
        lineCount: 40,
        nonEmptyLineCount: 38,
        approxTokenCount: 300
      },
      dom: {
        elementCount: 40,
        serializedElementCount: 30,
        interactiveElementCount: 10,
        unnamedInteractiveElementCount: 1,
        hiddenElementCount: 3,
        charCount: 4000,
        approxTokenCount: 1000
      }
    });
  });

  it("creates CSV rows with failures included", () => {
    const variants: SnapshotSuiteVariantResult[] = [
      {
        id: "good-a11y",
        url: "http://localhost:4310/checkout?variant=good-a11y",
        outDir: "results/snapshots/checkout/good-a11y",
        status: "success",
        stats: {
          cdpAx: {
            totalNodeCount: 100,
            interactiveNodeCount: 12,
            unnamedInteractiveNodeCount: 0,
            duplicateInteractiveNameCount: 0
          },
          aria: {
            charCount: 1200,
            lineCount: 40,
            nonEmptyLineCount: 40,
            approxTokenCount: 300
          },
          dom: {
            elementCount: 40,
            serializedElementCount: 30,
            interactiveElementCount: 10,
            unnamedInteractiveElementCount: 0,
            hiddenElementCount: 1,
            charCount: 4000,
            approxTokenCount: 1000
          }
        }
      },
      {
        id: "bad",
        url: "http://localhost:4310/checkout?variant=bad",
        outDir: "results/snapshots/checkout/bad",
        status: "failed",
        errorMessage: "ready selector timed out"
      }
    ];
    const summary = createSnapshotSuiteSummary({
      suiteId: "checkout",
      timestamp: "2026-06-19T00:00:00.000Z",
      configPath: "experiments/checkout.snapshot.yaml",
      outDir: "results/snapshots/checkout",
      variants
    });
    const csv = createSnapshotSuiteCsv(summary);

    expect(summary.successfulSnapshotCount).toBe(1);
    expect(summary.failedSnapshotCount).toBe(1);
    expect(csv).toContain("suite_id,variant_id,url,status,out_dir");
    expect(csv).toContain("checkout,good-a11y,http://localhost:4310/checkout?variant=good-a11y,success");
    expect(csv).toContain("checkout,bad,http://localhost:4310/checkout?variant=bad,failed");
    expect(csv).toContain("ready selector timed out");
  });
});

describe("snapshot suite runner", () => {
  it("continues after a variant failure and writes suite outputs", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "a11y-suite-"));
    const config: SnapshotSuiteConfig = {
      id: "checkout",
      baseUrl: "http://localhost:4310/checkout",
      readySelector: 'body[data-ai-ready="true"]',
      snapshotRoot: "body",
      variants: [
        { id: "good-a11y", query: "?variant=good-a11y" },
        { id: "bad", query: "?variant=bad" }
      ]
    };
    const result = await runSnapshotSuiteFromConfig({
      config,
      configPath: "inline.yaml",
      out: tempDir,
      headless: true,
      timeoutMs: 1000,
      snapshotRunner: async (options) => {
        if (options.url.endsWith("variant=bad")) {
          throw new Error("variant failed");
        }

        await writeSampleVariantSummaries(options.out);
      }
    });

    expect(result.summary.variantCount).toBe(2);
    expect(result.summary.successfulSnapshotCount).toBe(1);
    expect(result.summary.failedSnapshotCount).toBe(1);
    expect(result.summary.variants[1].errorMessage).toBe("variant failed");
    expect(await readFile(result.summaryPath, "utf8")).toContain('"failedSnapshotCount": 1');
    expect(await readFile(result.csvPath, "utf8")).toContain("variant failed");
  });
});

async function writeSampleVariantSummaries(outDir: string): Promise<void> {
  await writeFile(
    path.join(outDir, "cdp-ax-summary.json"),
    JSON.stringify({
      stats: {
        totalNodeCount: 100,
        interactiveNodeCount: 12,
        unnamedInteractiveNodeCount: 0,
        duplicateInteractiveNameCount: 0
      }
    }),
    "utf8"
  );
  await writeFile(
    path.join(outDir, "aria-summary.json"),
    JSON.stringify({
      stats: {
        charCount: 1200,
        lineCount: 40,
        nonEmptyLineCount: 40,
        approxTokenCount: 300
      }
    }),
    "utf8"
  );
  await writeFile(
    path.join(outDir, "dom-summary.json"),
    JSON.stringify({
      stats: {
        elementCount: 40,
        serializedElementCount: 30,
        interactiveElementCount: 10,
        unnamedInteractiveElementCount: 0,
        hiddenElementCount: 1,
        charCount: 4000,
        approxTokenCount: 1000
      }
    }),
    "utf8"
  );
}
