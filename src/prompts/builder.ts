export interface PreviousStepSummary {
  step: number;
  actionType: string;
  ref?: string;
  ok: boolean;
  summary?: string;
}

export interface BuildPromptInput {
  taskInstruction: string;
  currentUrl: string;
  observationMode: string;
  observation: unknown;
  stepNumber?: number;
  previousStepSummaries?: Array<string | PreviousStepSummary | Record<string, unknown>>;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

const actionSchemaSummary = [
  '{ "type": "click", "ref": "dom-1" }',
  '{ "type": "type", "ref": "dom-1", "text": "text", "clear": true }',
  '{ "type": "select", "ref": "dom-1", "value": "option-value" }',
  '{ "type": "press", "key": "Enter" }',
  '{ "type": "scroll", "direction": "down", "amount": 700 }',
  '{ "type": "wait", "ms": 250 }',
  '{ "type": "finish", "answer": "done" }'
].join("\n");

export function buildActionPrompt(input: BuildPromptInput): BuiltPrompt {
  return {
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildUserPrompt(input)
  };
}

export function buildSystemPrompt(): string {
  return [
    "You are an AI web agent choosing the next browser action.",
    "Output exactly one JSON action object.",
    "Do not output markdown.",
    "Do not output prose.",
    "Do not output code fences.",
    "Use only the supported action schema.",
    "Use refs from the observation for element actions.",
    "Do not invent refs.",
    "Do not output arbitrary Playwright code.",
    "Do not output JavaScript.",
    "Do not output CSS selectors.",
    "Do not ask for clarification.",
    "Choose the next best action from the current observation."
  ].join("\n");
}

function buildUserPrompt(input: BuildPromptInput): string {
  const lines = [
    "Task:",
    input.taskInstruction,
    "",
    "Current URL:",
    input.currentUrl,
    "",
    "Observation mode:",
    input.observationMode,
    ""
  ];

  if (input.stepNumber !== undefined) {
    lines.push("Step:", String(input.stepNumber), "");
  }

  lines.push("Supported action schema:", actionSchemaSummary, "");

  if (input.previousStepSummaries && input.previousStepSummaries.length > 0) {
    lines.push(
      "Previous steps:",
      ...input.previousStepSummaries.map((summary) => formatPromptValue(summary)),
      ""
    );
  }

  lines.push("Observation:", formatPromptValue(input.observation));

  return lines.join("\n");
}

function formatPromptValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return stableStringify(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value), null, 2);
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const key of Object.keys(input).sort()) {
    output[key] = sortJsonValue(input[key]);
  }

  return output;
}
