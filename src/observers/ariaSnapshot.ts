import type { Page } from "playwright";

export const ariaSnapshotMode = "aria-snapshot" as const;
export const defaultSnapshotRoot = "body";

const roleLinePattern = /^\s*-\s+[A-Za-z][A-Za-z0-9_-]*(?:\s|:|$)/;
const unnamedInteractivePatterns = [
  /^\s*-\s+button\s*$/i,
  /^\s*-\s+link\s*$/i,
  /^\s*-\s+textbox\s*$/i,
  /^\s*-\s+checkbox\s*$/i
];

export interface AriaSnapshotStats {
  charCount: number;
  lineCount: number;
  nonEmptyLineCount: number;
  approxTokenCount: number;
  roleLineCount: number;
  buttonLineCount: number;
  textboxLineCount: number;
  checkboxLineCount: number;
  linkLineCount: number;
  unnamedInteractiveLineCount: number;
}

export interface AriaSnapshotSummary {
  mode: typeof ariaSnapshotMode;
  url: string;
  title: string;
  timestamp: string;
  snapshotRoot: string;
  stats: AriaSnapshotStats;
  previewLines: string[];
}

export interface AriaSnapshotObservation {
  snapshot: string;
  summary: AriaSnapshotSummary;
}

export interface AriaSnapshotSummaryInput {
  snapshot: string;
  url: string;
  title: string;
  snapshotRoot: string;
  timestamp?: string;
}

export interface ObserveAriaSnapshotOptions {
  snapshotRoot?: string;
  timestamp?: string;
}

export async function observeAriaSnapshot(
  page: Page,
  options: ObserveAriaSnapshotOptions = {}
): Promise<AriaSnapshotObservation> {
  const snapshotRoot = options.snapshotRoot ?? defaultSnapshotRoot;
  const snapshot = await page.locator(snapshotRoot).ariaSnapshot();

  return {
    snapshot,
    summary: createAriaSnapshotSummary({
      snapshot,
      url: page.url(),
      title: await page.title(),
      snapshotRoot,
      timestamp: options.timestamp
    })
  };
}

export function createAriaSnapshotSummary(input: AriaSnapshotSummaryInput): AriaSnapshotSummary {
  return {
    mode: ariaSnapshotMode,
    url: input.url,
    title: input.title,
    timestamp: input.timestamp ?? new Date().toISOString(),
    snapshotRoot: input.snapshotRoot,
    stats: calculateAriaSnapshotStats(input.snapshot),
    previewLines: getPreviewLines(input.snapshot)
  };
}

export function calculateAriaSnapshotStats(snapshot: string): AriaSnapshotStats {
  const lines = splitLines(snapshot);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  return {
    charCount: snapshot.length,
    lineCount: lines.length,
    nonEmptyLineCount: nonEmptyLines.length,
    approxTokenCount: Math.ceil(snapshot.length / 4),
    roleLineCount: nonEmptyLines.filter(isRoleLine).length,
    buttonLineCount: countRoleLines(nonEmptyLines, "button"),
    textboxLineCount: countRoleLines(nonEmptyLines, "textbox"),
    checkboxLineCount: countRoleLines(nonEmptyLines, "checkbox"),
    linkLineCount: countRoleLines(nonEmptyLines, "link"),
    unnamedInteractiveLineCount: nonEmptyLines.filter(isUnnamedInteractiveLine).length
  };
}

export function isUnnamedInteractiveLine(line: string): boolean {
  return unnamedInteractivePatterns.some((pattern) => pattern.test(line));
}

function getPreviewLines(snapshot: string): string[] {
  return splitLines(snapshot)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 20);
}

function countRoleLines(lines: string[], role: string): number {
  const pattern = new RegExp(`^\\s*-\\s+${role}(?:\\s|:|$)`, "i");

  return lines.filter((line) => pattern.test(line)).length;
}

function isRoleLine(line: string): boolean {
  return roleLinePattern.test(line);
}

function splitLines(text: string): string[] {
  if (!text) {
    return [];
  }

  return text.split(/\r?\n/);
}
