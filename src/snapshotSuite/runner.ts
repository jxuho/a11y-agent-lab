import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { serializeError } from "../errors.js";
import type { AriaSnapshotSummary } from "../observers/ariaSnapshot.js";
import type { CdpAxSummary } from "../observers/cdpAx.js";
import type { DomCompactSummary } from "../observers/domCompact.js";
import {
  ariaSummarySchema,
  cdpAxSummarySchema,
  domSummarySchema,
  snapshotSuiteSummarySchema,
  validateJsonOutput
} from "../schemas/output.js";
import { type SnapshotOptions } from "../snapshot/options.js";
import { runSnapshot } from "../snapshot/runner.js";
import {
  buildVariantUrl,
  loadSnapshotSuiteConfig,
  type SnapshotSuiteConfig
} from "./config.js";
import type { SnapshotSuiteOptions } from "./options.js";
import {
  createSnapshotSuiteCsv,
  createSnapshotSuiteSummary,
  errorToVariantFields,
  selectVariantStats,
  type SnapshotSuiteSummary,
  type SnapshotSuiteVariantResult
} from "./summary.js";

export type SnapshotRunner = (options: SnapshotOptions) => Promise<unknown>;

export interface RunSnapshotSuiteResult {
  summaryPath: string;
  csvPath: string;
  summary: SnapshotSuiteSummary;
}

export async function runSnapshotSuite(
  options: SnapshotSuiteOptions,
  snapshotRunner: SnapshotRunner = runSnapshot
): Promise<RunSnapshotSuiteResult> {
  const config = await loadSnapshotSuiteConfig(options.config);

  return runSnapshotSuiteFromConfig({
    config,
    configPath: options.config,
    out: options.out,
    headless: options.headless,
    timeoutMs: options.timeoutMs,
    snapshotRunner
  });
}

export async function runSnapshotSuiteFromConfig(input: {
  config: SnapshotSuiteConfig;
  configPath: string;
  out: string;
  headless: boolean;
  timeoutMs: number;
  snapshotRunner?: SnapshotRunner;
}): Promise<RunSnapshotSuiteResult> {
  const suiteOutDir = path.join(input.out, input.config.id);
  const snapshotRunner = input.snapshotRunner ?? runSnapshot;
  const variants: SnapshotSuiteVariantResult[] = [];

  await mkdir(suiteOutDir, { recursive: true });

  for (const variant of input.config.variants) {
    const url = buildVariantUrl(input.config.baseUrl, variant);
    const variantOutDir = path.join(suiteOutDir, variant.id);

    try {
      await mkdir(variantOutDir, { recursive: true });
      await snapshotRunner({
        url,
        out: variantOutDir,
        readySelector: input.config.readySelector,
        snapshotRoot: input.config.snapshotRoot,
        timeoutMs: input.timeoutMs,
        headless: input.headless,
        suiteId: input.config.id,
        variantId: variant.id
      });

      variants.push({
        id: variant.id,
        url,
        outDir: variantOutDir,
        status: "success",
        stats: await readVariantStats(variantOutDir)
      });
    } catch (error: unknown) {
      const serializedError = serializeError(error);

      variants.push({
        id: variant.id,
        url,
        outDir: variantOutDir,
        status: "failed",
        ...errorToVariantFields(serializedError)
      });
    }
  }

  const summary = createSnapshotSuiteSummary({
    suiteId: input.config.id,
    configPath: input.configPath,
    outDir: suiteOutDir,
    variants
  });
  const summaryPath = path.join(suiteOutDir, "summary.json");
  const csvPath = path.join(suiteOutDir, "results.csv");

  const validatedSummary = validateJsonOutput(
    snapshotSuiteSummarySchema,
    summary,
    "snapshot suite summary"
  );

  await writeFile(summaryPath, `${JSON.stringify(validatedSummary, null, 2)}\n`, "utf8");
  await writeFile(csvPath, createSnapshotSuiteCsv(summary), "utf8");

  return {
    summaryPath,
    csvPath,
    summary
  };
}

async function readVariantStats(outDir: string) {
  const [cdpAx, aria, dom] = await Promise.all([
    readJson(path.join(outDir, "cdp-ax-summary.json"), cdpAxSummarySchema, "CDP AX summary"),
    readJson(path.join(outDir, "aria-summary.json"), ariaSummarySchema, "ARIA summary"),
    readJson(path.join(outDir, "dom-summary.json"), domSummarySchema, "DOM summary")
  ]);

  return selectVariantStats({
    cdpAx: cdpAx as CdpAxSummary,
    aria: aria as AriaSnapshotSummary,
    dom: dom as DomCompactSummary
  });
}

async function readJson<T>(
  filePath: string,
  schema: Parameters<typeof validateJsonOutput<T>>[0],
  label: string
): Promise<T> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as T;

  return validateJsonOutput(schema, parsed, label);
}
