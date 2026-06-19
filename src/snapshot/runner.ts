import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { observeAriaSnapshot } from "../observers/ariaSnapshot.js";
import { observeCdpAccessibility } from "../observers/cdpAx.js";
import type { SnapshotOptions } from "./options.js";

export interface SnapshotMetadata {
  url: string;
  finalUrl: string;
  title: string;
  timestamp: string;
  viewport: {
    width: number;
    height: number;
  } | null;
  readySelector: string;
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
    const metadata = createSnapshotMetadata({
      options,
      finalUrl: page.url(),
      title: await page.title(),
      viewport: page.viewportSize()
    });
    const userAgent = await page.evaluate(() => navigator.userAgent);

    metadata.userAgent = userAgent;

    const cdpAxObservation = await observeCdpAccessibility(page, {
      timestamp: metadata.timestamp
    });
    const ariaSnapshotObservation = await observeAriaSnapshot(page, {
      snapshotRoot: options.snapshotRoot,
      timestamp: metadata.timestamp
    });

    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    await writeFile(cdpAxPath, `${JSON.stringify(cdpAxObservation.rawTree, null, 2)}\n`, "utf8");
    await writeFile(
      cdpAxSummaryPath,
      `${JSON.stringify(cdpAxObservation.summary, null, 2)}\n`,
      "utf8"
    );
    await writeFile(ariaPath, ariaSnapshotObservation.snapshot, "utf8");
    await writeFile(
      ariaSummaryPath,
      `${JSON.stringify(ariaSnapshotObservation.summary, null, 2)}\n`,
      "utf8"
    );

    return {
      screenshotPath,
      metadataPath,
      cdpAxPath,
      cdpAxSummaryPath,
      ariaPath,
      ariaSummaryPath,
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
    url: input.options.url,
    finalUrl: input.finalUrl,
    title: input.title,
    timestamp: input.timestamp ?? new Date().toISOString(),
    viewport: input.viewport,
    readySelector: input.options.readySelector,
    timeoutMs: input.options.timeoutMs,
    userAgent: input.userAgent
  };
}
