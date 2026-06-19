import type { Page } from "playwright";

export const domCompactMode = "dom-compact" as const;
export const defaultDomRoot = "body";

export interface DomBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DomCompactElement {
  ref: string;
  tag: string;
  roleAttr?: string;
  text?: string;
  label?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  placeholder?: string;
  title?: string;
  alt?: string;
  type?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  selected?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  hiddenAttr?: boolean;
  dataTestId?: string;
  href?: string;
  bbox?: DomBoundingBox;
  visible: boolean;
  interactive: boolean;
  selectorHint?: string;
}

export interface DomCompactStats {
  elementCount: number;
  serializedElementCount: number;
  textNodeCount: number;
  interactiveElementCount: number;
  unnamedInteractiveElementCount: number;
  hiddenElementCount: number;
  linkCount: number;
  buttonCount: number;
  inputCount: number;
  formControlCount: number;
  charCount: number;
  approxTokenCount: number;
}

export interface DomCompactObservation {
  mode: typeof domCompactMode;
  url: string;
  title: string;
  timestamp: string;
  root: string;
  elements: DomCompactElement[];
}

export interface DomCompactSummary {
  mode: typeof domCompactMode;
  url: string;
  title: string;
  timestamp: string;
  stats: DomCompactStats;
  previewElements: DomCompactElement[];
}

export interface DomCompactBaseStats {
  elementCount: number;
  textNodeCount: number;
  hiddenElementCount: number;
}

export interface DomCompactPageResult {
  elements: DomCompactElement[];
  stats: DomCompactBaseStats;
}

export interface DomCompactObservationResult {
  observation: DomCompactObservation;
  summary: DomCompactSummary;
}

export interface ObserveDomCompactOptions {
  root?: string;
  timestamp?: string;
}

export interface CreateDomCompactObservationInput {
  elements: DomCompactElement[];
  url: string;
  title: string;
  root: string;
  timestamp?: string;
}

export async function observeDomCompact(
  page: Page,
  options: ObserveDomCompactOptions = {}
): Promise<DomCompactObservationResult> {
  const root = options.root ?? defaultDomRoot;
  const pageResult = await page.evaluate(serializeDomCompactInPage, { root });
  const observation = createDomCompactObservation({
    elements: pageResult.elements,
    url: page.url(),
    title: await page.title(),
    root,
    timestamp: options.timestamp
  });

  return {
    observation,
    summary: createDomCompactSummary(observation, pageResult.stats)
  };
}

export function createDomCompactObservation(
  input: CreateDomCompactObservationInput
): DomCompactObservation {
  return {
    mode: domCompactMode,
    url: input.url,
    title: input.title,
    timestamp: input.timestamp ?? new Date().toISOString(),
    root: input.root,
    elements: input.elements
  };
}

export function createDomCompactSummary(
  observation: DomCompactObservation,
  baseStats: DomCompactBaseStats
): DomCompactSummary {
  return {
    mode: domCompactMode,
    url: observation.url,
    title: observation.title,
    timestamp: observation.timestamp,
    stats: calculateDomCompactStats(observation.elements, baseStats),
    previewElements: observation.elements.slice(0, 20)
  };
}

export function calculateDomCompactStats(
  elements: DomCompactElement[],
  baseStats: DomCompactBaseStats
): DomCompactStats {
  const serializedText = JSON.stringify(elements);
  const interactiveElements = elements.filter((element) => element.interactive);

  return {
    elementCount: baseStats.elementCount,
    serializedElementCount: elements.length,
    textNodeCount: baseStats.textNodeCount,
    interactiveElementCount: interactiveElements.length,
    unnamedInteractiveElementCount: interactiveElements.filter(isUnnamedInteractiveElement).length,
    hiddenElementCount: baseStats.hiddenElementCount,
    linkCount: elements.filter((element) => element.tag === "a").length,
    buttonCount: elements.filter((element) => element.tag === "button").length,
    inputCount: elements.filter((element) => element.tag === "input").length,
    formControlCount: elements.filter((element) => isFormControlTag(element.tag)).length,
    charCount: serializedText.length,
    approxTokenCount: Math.ceil(serializedText.length / 4)
  };
}

export function isInteractiveDomElementLike(input: {
  tag: string;
  roleAttr?: string;
  href?: string;
  type?: string;
  disabled?: boolean;
}): boolean {
  if (input.disabled) {
    return false;
  }

  const tag = input.tag.toLowerCase();
  const role = input.roleAttr?.toLowerCase();

  if (role && interactiveRoles.has(role)) {
    return true;
  }

  if (tag === "a") {
    return Boolean(input.href);
  }

  if (tag === "input") {
    return input.type?.toLowerCase() !== "hidden";
  }

  return ["button", "select", "textarea", "summary"].includes(tag);
}

export function isPasswordLikeField(input: {
  tag: string;
  type?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  autocomplete?: string;
}): boolean {
  const type = input.type?.toLowerCase();

  if (type === "password") {
    return true;
  }

  const joined = [
    input.name,
    input.label,
    input.placeholder,
    input.autocomplete
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(password|passcode|secret|token)\b/.test(joined);
}

function isUnnamedInteractiveElement(element: DomCompactElement): boolean {
  const accessibleText = [
    element.label,
    element.text,
    element.ariaLabel,
    element.title,
    element.alt,
    element.placeholder,
    element.value
  ]
    .filter(Boolean)
    .join("")
    .trim();

  return accessibleText.length === 0;
}

function isFormControlTag(tag: string): boolean {
  return ["input", "select", "textarea", "button"].includes(tag);
}

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

function serializeDomCompactInPage(input: { root: string }): DomCompactPageResult {
  const maxElements = 500;
  const maxTextLength = 180;
  const skipTags = new Set([
    "script",
    "style",
    "noscript",
    "template",
    "svg",
    "path",
    "g",
    "defs",
    "symbol",
    "use",
    "canvas"
  ]);
  const structuralTags = new Set([
    "main",
    "nav",
    "section",
    "article",
    "aside",
    "header",
    "footer",
    "form",
    "fieldset",
    "legend",
    "label",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "ul",
    "ol",
    "li",
    "dialog"
  ]);
  const interactiveRoleValues = new Set([
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
  const usefulRoles = new Set(["alert", "dialog", "status", "navigation", "main", "form"]);
  const elements: DomCompactElement[] = [];
  const stats: DomCompactBaseStats = {
    elementCount: 0,
    textNodeCount: 0,
    hiddenElementCount: 0
  };
  let refIndex = 1;

  const root = document.querySelector(input.root) ?? document.body;

  traverse(root);

  return {
    elements,
    stats
  };

  function traverse(node: Node): void {
    if (elements.length >= maxElements) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      stats.textNodeCount += 1;
      serializeTextNode(node);
      return;
    }

    if (!(node instanceof Element)) {
      return;
    }

    stats.elementCount += 1;

    const tag = node.tagName.toLowerCase();

    if (skipTags.has(tag)) {
      return;
    }

    const visible = isVisibleElement(node);

    if (!visible) {
      stats.hiddenElementCount += 1;
      return;
    }

    const interactive = isInteractiveElement(node);
    const useful = isUsefulElement(node, interactive);

    if (useful) {
      elements.push(serializeElement(node, interactive, visible));
    }

    for (const child of Array.from(node.childNodes)) {
      traverse(child);
    }
  }

  function serializeTextNode(node: Node): void {
    const text = normalizeText(node.textContent ?? "");

    if (!text || !node.parentElement || !isVisibleElement(node.parentElement)) {
      return;
    }

    const parent = node.parentElement;

    if (isInteractiveElement(parent) || isTextBearingElement(parent)) {
      return;
    }

    elements.push({
      ref: nextRef(),
      tag: "#text",
      text: limitText(text),
      visible: true,
      interactive: false
    });
  }

  function serializeElement(node: Element, interactive: boolean, visible: boolean): DomCompactElement {
    const tag = node.tagName.toLowerCase();
    const element = node as HTMLElement;
    const inputElement = node as HTMLInputElement;
    const selectElement = node as HTMLSelectElement;
    const optionElement = node as HTMLOptionElement;
    const textAreaElement = node as HTMLTextAreaElement;
    const ariaLabel = attr(node, "aria-label");
    const ariaLabelledBy = attr(node, "aria-labelledby");
    const label = getLabel(node, ariaLabel, ariaLabelledBy);
    const roleAttr = attr(node, "role");
    const type = attr(node, "type");
    const name = attr(node, "name");
    const placeholder = attr(node, "placeholder");
    const safeValue = getSafeValue(node, label, placeholder);
    const compact: DomCompactElement = {
      ref: nextRef(),
      tag,
      visible,
      interactive
    };
    const text = getTextForElement(node);
    const href = node instanceof HTMLAnchorElement ? node.href : "";

    assign(compact, "roleAttr", roleAttr);
    assign(compact, "text", text);
    assign(compact, "label", label);
    assign(compact, "ariaLabel", ariaLabel);
    assign(compact, "ariaLabelledBy", ariaLabelledBy);
    assign(compact, "ariaDescribedBy", attr(node, "aria-describedby"));
    assign(compact, "placeholder", placeholder);
    assign(compact, "title", attr(node, "title"));
    assign(compact, "alt", attr(node, "alt"));
    assign(compact, "type", type);
    assign(compact, "name", name);
    assign(compact, "value", safeValue);
    assign(compact, "dataTestId", attr(node, "data-test"));
    assign(compact, "href", href);
    assign(compact, "selectorHint", getSelectorHint(node));

    if ("checked" in inputElement && typeof inputElement.checked === "boolean") {
      compact.checked = inputElement.checked;
    }

    if (tag === "option") {
      compact.selected = optionElement.selected;
    } else if (tag === "select") {
      compact.value = selectElement.value;
    } else if (tag === "textarea" && !isPasswordLike(node, label, placeholder)) {
      assign(compact, "value", textAreaElement.value);
    }

    if ("disabled" in inputElement && typeof inputElement.disabled === "boolean") {
      compact.disabled = inputElement.disabled;
    }

    const expanded = attr(node, "aria-expanded");

    if (expanded === "true" || expanded === "false") {
      compact.expanded = expanded === "true";
    }

    if (node.hasAttribute("hidden")) {
      compact.hiddenAttr = true;
    }

    const bbox = getBoundingBox(node);

    if (bbox) {
      compact.bbox = bbox;
    }

    return compact;
  }

  function isUsefulElement(node: Element, interactive: boolean): boolean {
    const tag = node.tagName.toLowerCase();
    const role = attr(node, "role");

    return (
      interactive ||
      structuralTags.has(tag) ||
      /^h[1-6]$/.test(tag) ||
      usefulRoles.has(role) ||
      node.hasAttribute("data-test")
    );
  }

  function isInteractiveElement(node: Element): boolean {
    const tag = node.tagName.toLowerCase();
    const role = attr(node, "role");
    const disabled = (node as HTMLButtonElement).disabled === true;

    if (disabled) {
      return false;
    }

    if (role && interactiveRoleValues.has(role)) {
      return true;
    }

    if (tag === "a") {
      return node.hasAttribute("href");
    }

    if (tag === "input") {
      return attr(node, "type") !== "hidden";
    }

    if (["button", "select", "textarea", "summary"].includes(tag)) {
      return true;
    }

    if ((node as HTMLElement).isContentEditable) {
      return true;
    }

    const tabIndex = attr(node, "tabindex");

    return tabIndex !== "" && tabIndex !== "-1";
  }

  function isTextBearingElement(node: Element): boolean {
    const tag = node.tagName.toLowerCase();

    return /^h[1-6]$/.test(tag) || ["button", "label", "legend", "option", "textarea"].includes(tag);
  }

  function isVisibleElement(node: Element): boolean {
    if (node.hasAttribute("hidden") || attr(node, "aria-hidden") === "true") {
      return false;
    }

    const style = window.getComputedStyle(node);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.opacity === "0"
    ) {
      return false;
    }

    const rect = node.getBoundingClientRect();

    return rect.width > 0 && rect.height > 0;
  }

  function getBoundingBox(node: Element): DomBoundingBox | undefined {
    const rect = node.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return undefined;
    }

    return {
      x: round(rect.x),
      y: round(rect.y),
      width: round(rect.width),
      height: round(rect.height)
    };
  }

  function getLabel(node: Element, ariaLabel: string, ariaLabelledBy: string): string {
    if (ariaLabel) {
      return ariaLabel;
    }

    if (ariaLabelledBy) {
      const labelledText = ariaLabelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
      const normalized = normalizeText(labelledText);

      if (normalized) {
        return limitText(normalized);
      }
    }

    if (isFormControl(node)) {
      const labels = (node as HTMLInputElement).labels;

      if (labels && labels.length > 0) {
        const labelText = Array.from(labels)
          .map((labelNode) => labelNode.textContent ?? "")
          .join(" ");
        const normalized = normalizeText(labelText);

        if (normalized) {
          return limitText(normalized);
        }
      }

      const wrappingLabel = node.closest("label");

      if (wrappingLabel) {
        const normalized = normalizeText(wrappingLabel.textContent ?? "");

        if (normalized) {
          return limitText(normalized);
        }
      }

      const placeholder = attr(node, "placeholder");

      if (placeholder) {
        return placeholder;
      }
    }

    return "";
  }

  function getTextForElement(node: Element): string {
    const tag = node.tagName.toLowerCase();

    if (
      /^h[1-6]$/.test(tag) ||
      ["button", "legend", "label", "option", "th", "td", "li", "a"].includes(tag)
    ) {
      return limitText(normalizeText((node as HTMLElement).innerText || node.textContent || ""));
    }

    const directText = Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent ?? "")
      .join(" ");

    return limitText(normalizeText(directText));
  }

  function getSafeValue(node: Element, label: string, placeholder: string): string {
    if (!isFormControl(node) || isPasswordLike(node, label, placeholder)) {
      return "";
    }

    const tag = node.tagName.toLowerCase();

    if (tag === "select") {
      return (node as HTMLSelectElement).value;
    }

    if (tag === "textarea") {
      return (node as HTMLTextAreaElement).value;
    }

    if (tag === "input") {
      const type = attr(node, "type");

      if (["checkbox", "radio", "button", "submit", "reset", "file"].includes(type)) {
        return "";
      }

      return (node as HTMLInputElement).value;
    }

    return "";
  }

  function isPasswordLike(node: Element, label: string, placeholder: string): boolean {
    const fields = [
      attr(node, "type"),
      attr(node, "name"),
      attr(node, "id"),
      attr(node, "autocomplete"),
      label,
      placeholder
    ]
      .join(" ")
      .toLowerCase();

    return /\b(password|passcode|secret|token)\b/.test(fields);
  }

  function isFormControl(node: Element): boolean {
    return ["input", "select", "textarea", "button"].includes(node.tagName.toLowerCase());
  }

  function getSelectorHint(node: Element): string {
    const dataTest = attr(node, "data-test");

    if (dataTest) {
      return `[data-test="${cssEscape(dataTest)}"]`;
    }

    const id = attr(node, "id");

    if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) {
      return `#${cssEscape(id)}`;
    }

    const name = attr(node, "name");

    if (name && isFormControl(node)) {
      return `${node.tagName.toLowerCase()}[name="${cssEscape(name)}"]`;
    }

    return "";
  }

  function attr(node: Element, name: string): string {
    return limitText(node.getAttribute(name) ?? "");
  }

  function assign<T extends keyof DomCompactElement>(
    target: DomCompactElement,
    key: T,
    value: DomCompactElement[T] | string
  ): void {
    if (value !== "" && value !== undefined && value !== null) {
      target[key] = value as DomCompactElement[T];
    }
  }

  function nextRef(): string {
    const ref = `dom-${refIndex}`;

    refIndex += 1;
    return ref;
  }

  function normalizeText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  }

  function limitText(text: string): string {
    const normalized = normalizeText(text);

    if (normalized.length <= maxTextLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxTextLength - 3)}...`;
  }

  function round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  function cssEscape(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
}
