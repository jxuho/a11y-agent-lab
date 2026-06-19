import { z } from "zod";

import { observerModeSchema } from "./config.js";

export const defaultAgentRunOut = "results/runs";

export const agentRunCliOptionsSchema = z.object({
  config: z.string().min(1),
  out: z.string().min(1),
  observer: observerModeSchema.optional(),
  model: z.enum(["mock", "placeholder"]).default("mock"),
  mockActions: z.string().min(1).optional(),
  maxSteps: z.number().int().positive().optional(),
  headless: z.boolean().default(true),
  includeObservations: z.boolean().default(false),
  includePrompts: z.boolean().default(false),
  allowJsAssertions: z.boolean().default(false)
});

export type AgentRunCliOptions = z.infer<typeof agentRunCliOptionsSchema>;

export function getAgentRunHelpText(): string {
  return [
    "Usage:",
    "  a11y-agent-lab run <task.yaml> --out <output-directory> [options]",
    "",
    "Agent run options:",
    "  --out <output-directory>          Directory for trace.jsonl and final.json",
    "  --observer <mode>                 dom-compact | aria-snapshot | cdp-ax",
    "  --model <mock|placeholder>        Model adapter to use (default: mock)",
    "  --mock-actions <path>             JSON array of mock AgentAction objects",
    "  --max-steps <number>              Override task maxSteps",
    "  --headless <true|false>           Run Chromium headlessly (default: true)",
    "  --include-observations <true|false> Store full observations in trace (default: false)",
    "  --include-prompts <true|false>    Store full prompts in trace (default: false)",
    "  --allow-js-assertions <true|false> Enable trusted JS evaluator assertions (default: false)",
    "  -h, --help                        Show run help"
  ].join("\n");
}

export function parseAgentRunArgs(argv: string[]): AgentRunCliOptions {
  const values: Record<string, unknown> = {};
  let positionalConfig: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      if (positionalConfig) {
        throw new Error(`Unexpected positional argument for run: ${arg}`);
      }

      positionalConfig = arg;
      continue;
    }

    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    index += 1;

    switch (arg) {
      case "--out":
        values.out = value;
        break;
      case "--observer":
        values.observer = value;
        break;
      case "--model":
        values.model = value;
        break;
      case "--mock-actions":
        values.mockActions = value;
        break;
      case "--max-steps":
        values.maxSteps = parseInteger(value, "--max-steps");
        break;
      case "--headless":
        values.headless = parseBoolean(value, "--headless");
        break;
      case "--include-observations":
        values.includeObservations = parseBoolean(value, "--include-observations");
        break;
      case "--include-prompts":
        values.includePrompts = parseBoolean(value, "--include-prompts");
        break;
      case "--allow-js-assertions":
        values.allowJsAssertions = parseBoolean(value, "--allow-js-assertions");
        break;
      default:
        throw new Error(`Unknown run option: ${arg}`);
    }
  }

  if (positionalConfig) {
    values.config = positionalConfig;
  }

  const result = agentRunCliOptionsSchema.safeParse(values);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid run options: ${message}`);
  }

  return result.data;
}

function parseInteger(value: string, flag: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${flag} value: ${value}`);
  }

  return parsed;
}

function parseBoolean(value: string, flag: string): boolean {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Invalid ${flag} value: ${value}. Expected true or false.`);
}
