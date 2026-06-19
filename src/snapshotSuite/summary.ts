import type { AriaSnapshotSummary } from "../observers/ariaSnapshot.js";
import type { CdpAxSummary } from "../observers/cdpAx.js";
import type { DomCompactSummary } from "../observers/domCompact.js";
import type { SerializedError } from "../errors.js";

export interface SnapshotSuiteVariantStats {
  cdpAx?: {
    totalNodeCount: number;
    interactiveNodeCount: number;
    unnamedInteractiveNodeCount: number;
    duplicateInteractiveNameCount: number;
  };
  aria?: {
    charCount: number;
    lineCount: number;
    nonEmptyLineCount: number;
    approxTokenCount: number;
  };
  dom?: {
    elementCount: number;
    serializedElementCount: number;
    interactiveElementCount: number;
    unnamedInteractiveElementCount: number;
    hiddenElementCount: number;
    charCount: number;
    approxTokenCount: number;
  };
}

export interface SnapshotSuiteVariantResult {
  id: string;
  url: string;
  outDir: string;
  status: "success" | "failed";
  stats?: SnapshotSuiteVariantStats;
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
}

export interface SnapshotSuiteSummary {
  suiteId: string;
  timestamp: string;
  configPath: string;
  outDir: string;
  variantCount: number;
  successfulSnapshotCount: number;
  failedSnapshotCount: number;
  variants: SnapshotSuiteVariantResult[];
}

export interface CreateSnapshotSuiteSummaryInput {
  suiteId: string;
  timestamp?: string;
  configPath: string;
  outDir: string;
  variants: SnapshotSuiteVariantResult[];
}

export function createSnapshotSuiteSummary(
  input: CreateSnapshotSuiteSummaryInput
): SnapshotSuiteSummary {
  const successfulSnapshotCount = input.variants.filter((variant) => variant.status === "success")
    .length;

  return {
    suiteId: input.suiteId,
    timestamp: input.timestamp ?? new Date().toISOString(),
    configPath: input.configPath,
    outDir: input.outDir,
    variantCount: input.variants.length,
    successfulSnapshotCount,
    failedSnapshotCount: input.variants.length - successfulSnapshotCount,
    variants: input.variants
  };
}

export function selectVariantStats(input: {
  cdpAx?: CdpAxSummary;
  aria?: AriaSnapshotSummary;
  dom?: DomCompactSummary;
}): SnapshotSuiteVariantStats {
  return {
    cdpAx: input.cdpAx
      ? {
          totalNodeCount: input.cdpAx.stats.totalNodeCount,
          interactiveNodeCount: input.cdpAx.stats.interactiveNodeCount,
          unnamedInteractiveNodeCount: input.cdpAx.stats.unnamedInteractiveNodeCount,
          duplicateInteractiveNameCount: input.cdpAx.stats.duplicateInteractiveNameCount
        }
      : undefined,
    aria: input.aria
      ? {
          charCount: input.aria.stats.charCount,
          lineCount: input.aria.stats.lineCount,
          nonEmptyLineCount: input.aria.stats.nonEmptyLineCount,
          approxTokenCount: input.aria.stats.approxTokenCount
        }
      : undefined,
    dom: input.dom
      ? {
          elementCount: input.dom.stats.elementCount,
          serializedElementCount: input.dom.stats.serializedElementCount,
          interactiveElementCount: input.dom.stats.interactiveElementCount,
          unnamedInteractiveElementCount: input.dom.stats.unnamedInteractiveElementCount,
          hiddenElementCount: input.dom.stats.hiddenElementCount,
          charCount: input.dom.stats.charCount,
          approxTokenCount: input.dom.stats.approxTokenCount
        }
      : undefined
  };
}

const csvColumns = [
  "suite_id",
  "variant_id",
  "url",
  "status",
  "out_dir",
  "cdp_total_node_count",
  "cdp_interactive_node_count",
  "cdp_unnamed_interactive_node_count",
  "cdp_duplicate_interactive_name_count",
  "aria_char_count",
  "aria_line_count",
  "aria_approx_token_count",
  "dom_element_count",
  "dom_serialized_element_count",
  "dom_interactive_element_count",
  "dom_unnamed_interactive_element_count",
  "dom_hidden_element_count",
  "dom_char_count",
  "dom_approx_token_count",
  "error_name",
  "error_message"
];

export function createSnapshotSuiteCsv(summary: SnapshotSuiteSummary): string {
  const rows = summary.variants.map((variant) =>
    [
      summary.suiteId,
      variant.id,
      variant.url,
      variant.status,
      variant.outDir,
      variant.stats?.cdpAx?.totalNodeCount,
      variant.stats?.cdpAx?.interactiveNodeCount,
      variant.stats?.cdpAx?.unnamedInteractiveNodeCount,
      variant.stats?.cdpAx?.duplicateInteractiveNameCount,
      variant.stats?.aria?.charCount,
      variant.stats?.aria?.lineCount,
      variant.stats?.aria?.approxTokenCount,
      variant.stats?.dom?.elementCount,
      variant.stats?.dom?.serializedElementCount,
      variant.stats?.dom?.interactiveElementCount,
      variant.stats?.dom?.unnamedInteractiveElementCount,
      variant.stats?.dom?.hiddenElementCount,
      variant.stats?.dom?.charCount,
      variant.stats?.dom?.approxTokenCount,
      variant.errorName,
      variant.errorMessage
    ]
      .map(csvCell)
      .join(",")
  );

  return `${csvColumns.join(",")}\n${rows.join("\n")}\n`;
}

export function errorToVariantFields(error: SerializedError): Pick<
  SnapshotSuiteVariantResult,
  "errorName" | "errorMessage" | "errorStack"
> {
  return {
    errorName: error.errorName,
    errorMessage: error.errorMessage,
    errorStack: error.errorStack
  };
}

function csvCell(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
