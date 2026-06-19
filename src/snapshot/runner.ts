import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { observeAriaSnapshot } from "../observers/ariaSnapshot.js";
import { observeCdpAccessibility } from "../observers/cdpAx.js";
import { observeDomCompact } from "../observers/domCompact.js";
import {
  ariaSummarySchema,
  cdpAxSummarySchema,
  domCompactObservationSchema,
  domSummarySchema,
  snapshotMetadataSchema,
  validateJsonOutput
} from "../schemas/output.js";
import type { SnapshotOptions } from "./options.js";

export interface SnapshotMetadata {
  mode: "snapshot-metadata";
  url: string;
  finalUrl: string;
  title: string;
  timestamp: string;
  variantId?: string;
  suiteId?: string;
  viewport: {
    width: number;
    height: number;
  } | null;
  readySelector: string;
  snapshotRoot: string;
  timeoutMs: number;
  userAgent?: string;
}

export interface SnapshotResult {
  screenshotPath: string;
  metadataPath: string;
  cdpAxPath: string;
  cdpAxSummaryPath: string;
  ariaPath: string;
  ariaSummaryPath: string;
  domCompactPath: string;
  domSummaryPath: string;
  metadata: SnapshotMetadata;
}

export async function runSnapshot(options: SnapshotOptions): Promise<SnapshotResult> {
  await mkdir(options.out, { recursive: true });

  const browser = await chromium.launch({
    headless: options.headless
  });

  try {
    const page = await browser.newPage();

    page.setDefaultTimeout(options.timeoutMs);
    page.setDefaultNavigationTimeout(options.timeoutMs);

    await page.goto(options.url, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs
    });
    await page.waitForSelector(options.readySelector, {
      state: "attached",
      timeout: options.timeoutMs
    });

    const screenshotPath = path.join(options.out, "screenshot.png");
    const metadataPath = path.join(options.out, "metadata.json");
    const cdpAxPath = path.join(options.out, "cdp-ax.json");
    const cdpAxSummaryPath = path.join(options.out, "cdp-ax-summary.json");
    const ariaPath = path.join(options.out, "aria.yml");
    const ariaSummaryPath = path.join(options.out, "aria-summary.json");
    const domCompactPath = path.join(options.out, "dom-compact.json");
    const domSummaryPath = path.join(options.out, "dom-summary.json");
    const metadata = createSnapshotMetadata({
      options,
      finalUrl: page.url(),
      title: await page.title(),
      viewport: page.viewportSize()
    });
    const userAgent = await page.evaluate(() => navigator.userAgent);

    metadata.userAgent = userAgent;

    const cdpAxObservation = await observeCdpAccessibility(page, {
      timestamp: metadata.timestamp,
      variantId: options.variantId,
      suiteId: options.suiteId
    });
    const ariaSnapshotObservation = await observeAriaSnapshot(page, {
      snapshotRoot: options.snapshotRoot,
      timestamp: metadata.timestamp,
      variantId: options.variantId,
      suiteId: options.suiteId
    });
    const domCompactObservation = await observeDomCompact(page, {
      timestamp: metadata.timestamp,
      variantId: options.variantId,
      suiteId: options.suiteId
    });

    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    await writeJsonFile(metadataPath, snapshotMetadataSchema, metadata, "snapshot metadata");
    await writeFile(cdpAxPath, `${JSON.stringify(cdpAxObservation.rawTree, null, 2)}\n`, "utf8");
    await writeJsonFile(
      cdpAxSummaryPath,
      cdpAxSummarySchema,
      cdpAxObservation.summary,
      "CDP AX summary"
    );
    await writeFile(ariaPath, ariaSnapshotObservation.snapshot, "utf8");
    await writeJsonFile(
      ariaSummaryPath,
      ariaSummarySchema,
      ariaSnapshotObservation.summary,
      "ARIA summary"
    );
    await writeJsonFile(
      domCompactPath,
      domCompactObservationSchema,
      domCompactObservation.observation,
      "compact DOM observation"
    );
    await writeJsonFile(
      domSummaryPath,
      domSummarySchema,
      domCompactObservation.summary,
      "DOM summary"
    );

    return {
      screenshotPath,
      metadataPath,
      cdpAxPath,
      cdpAxSummaryPath,
      ariaPath,
      ariaSummaryPath,
      domCompactPath,
      domSummaryPath,
      metadata
    };
  } finally {
    await browser.close();
  }
} 

export function createSnapshotMetadata(input: {
  options: SnapshotOptions;
  finalUrl: string;
  title: string;
  viewport: SnapshotMetadata["viewport"];
  timestamp?: string;
  userAgent?: string;
}): SnapshotMetadata {
  return {
    mode: "snapshot-metadata",
    url: input.options.url,
    finalUrl: input.finalUrl,
    title: input.title,
    timestamp: input.timestamp ?? new Date().toISOString(),
    ...(input.options.variantId ? { variantId: input.options.variantId } : {}),
    ...(input.options.suiteId ? { suiteId: input.options.suiteId } : {}),
    viewport: input.viewport,
    readySelector: input.options.readySelector,
    snapshotRoot: input.options.snapshotRoot,
    timeoutMs: input.options.timeoutMs,
    userAgent: input.userAgent
  };
}

async function writeJsonFile<T>(
  filePath: string,
  schema: Parameters<typeof validateJsonOutput<T>>[0],
  value: T,
  label: string
): Promise<void> {
  const validated = validateJsonOutput(schema, value, label);

  await writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
}
