import type { Page } from "playwright";

export const cdpAxMode = "cdp-ax" as const;

const interactiveRoles = new Set([
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "combobox",
  "listbox",
  "menuitem",
  "option",
  "switch",
  "tab",
  "slider",
  "spinbutton"
]);

const selectedPropertyNames = new Set([
  "disabled",
  "checked",
  "expanded",
  "selected",
  "level",
  "focused"
]);

type CdpAxPrimitive = string | number | boolean;
type SummaryPropertyValue = CdpAxPrimitive | null;

export interface CdpAxValue {
  type?: string;
  value?: CdpAxPrimitive;
}

export interface CdpAxProperty {
  name: string;
  value?: CdpAxValue;
}

export interface CdpAxNode {
  nodeId: string;
  ignored?: boolean;
  role?: CdpAxValue;
  name?: CdpAxValue;
  description?: CdpAxValue;
  value?: CdpAxValue;
  childIds?: string[];
  properties?: CdpAxProperty[];
}

export interface CdpAxTree {
  nodes: CdpAxNode[];
}

export interface CdpAxSummaryNode {
  nodeId: string;
  role: string;
  name: string;
  description: string;
  value: string;
  ignored: boolean;
  childIds: string[];
  properties: Record<string, SummaryPropertyValue>;
}

export interface CdpAxSummaryStats {
  totalNodeCount: number;
  ignoredNodeCount: number;
  nonIgnoredNodeCount: number;
  interactiveNodeCount: number;
  unnamedInteractiveNodeCount: number;
  duplicateInteractiveNameCount: number;
}

export interface CdpAxSummary {
  mode: typeof cdpAxMode;
  url: string;
  finalUrl?: string;
  title: string;
  timestamp: string;
  variantId?: string;
  suiteId?: string;
  stats: CdpAxSummaryStats;
  nodes: CdpAxSummaryNode[];
}

export interface CdpAxObservation {
  rawTree: CdpAxTree;
  summary: CdpAxSummary;
}

export interface ObserveCdpAccessibilityOptions {
  timestamp?: string;
  variantId?: string;
  suiteId?: string;
}

export interface CdpAxSummaryInput {
  tree: CdpAxTree;
  url: string;
  finalUrl?: string;
  title: string;
  timestamp?: string;
  variantId?: string;
  suiteId?: string;
}

export async function observeCdpAccessibility(
  page: Page,
  options: ObserveCdpAccessibilityOptions = {}
): Promise<CdpAxObservation> {
  const session = await page.context().newCDPSession(page);

  try {
    await session.send("Accessibility.enable");

    const rawTree = (await session.send("Accessibility.getFullAXTree")) as CdpAxTree;

    return {
      rawTree,
      summary: createCdpAxSummary({
        tree: rawTree,
        url: page.url(),
        finalUrl: page.url(),
        title: await page.title(),
        timestamp: options.timestamp,
        variantId: options.variantId,
        suiteId: options.suiteId
      })
    };
  } finally {
    await session.detach();
  }
}

export function createCdpAxSummary(input: CdpAxSummaryInput): CdpAxSummary {
  const nodes = input.tree.nodes.map(normalizeCdpAxNode);

  return {
    mode: cdpAxMode,
    url: input.url,
    ...(input.finalUrl ? { finalUrl: input.finalUrl } : {}),
    title: input.title,
    timestamp: input.timestamp ?? new Date().toISOString(),
    ...(input.variantId ? { variantId: input.variantId } : {}),
    ...(input.suiteId ? { suiteId: input.suiteId } : {}),
    stats: calculateCdpAxStats(nodes),
    nodes
  };
}

export function normalizeCdpAxNode(node: CdpAxNode): CdpAxSummaryNode {
  return {
    nodeId: node.nodeId,
    role: valueToString(node.role),
    name: valueToString(node.name),
    description: valueToString(node.description),
    value: valueToString(node.value),
    ignored: node.ignored ?? false,
    childIds: node.childIds ?? [],
    properties: extractSelectedProperties(node.properties ?? [])
  };
}

export function calculateCdpAxStats(nodes: CdpAxSummaryNode[]): CdpAxSummaryStats {
  const interactiveNames = new Map<string, number>();
  let ignoredNodeCount = 0;
  let interactiveNodeCount = 0;
  let unnamedInteractiveNodeCount = 0;

  for (const node of nodes) {
    if (node.ignored) {
      ignoredNodeCount += 1;
      continue;
    }

    if (!isInteractiveRole(node.role)) {
      continue;
    }

    interactiveNodeCount += 1;

    const name = node.name.trim();

    if (!name) {
      unnamedInteractiveNodeCount += 1;
      continue;
    }

    interactiveNames.set(name, (interactiveNames.get(name) ?? 0) + 1);
  }

  const duplicateInteractiveNameCount = [...interactiveNames.values()].filter((count) => count > 1)
    .length;

  return {
    totalNodeCount: nodes.length,
    ignoredNodeCount,
    nonIgnoredNodeCount: nodes.length - ignoredNodeCount,
    interactiveNodeCount,
    unnamedInteractiveNodeCount,
    duplicateInteractiveNameCount
  };
}

export function isInteractiveRole(role: string): boolean {
  return interactiveRoles.has(role.toLowerCase());
}

function extractSelectedProperties(properties: CdpAxProperty[]): Record<string, SummaryPropertyValue> {
  const selected: Record<string, SummaryPropertyValue> = {};

  for (const property of properties) {
    if (!selectedPropertyNames.has(property.name)) {
      continue;
    }

    selected[property.name] = valueToPrimitive(property.value);
  }

  return selected;
}

function valueToString(value: CdpAxValue | undefined): string {
  const primitive = valueToPrimitive(value);

  if (primitive === null) {
    return "";
  }

  return String(primitive);
}

function valueToPrimitive(value: CdpAxValue | undefined): SummaryPropertyValue {
  return value?.value ?? null;
}
