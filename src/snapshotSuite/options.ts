import { z } from "zod";

import { defaultSnapshotTimeoutMs } from "../snapshot/options.js";

export const snapshotSuiteOptionsSchema = z.object({
  config: z.string().min(1),
  out: z.string().min(1),
  headless: z.boolean().default(true),
  timeoutMs: z.number().int().positive().default(defaultSnapshotTimeoutMs)
});

export type SnapshotSuiteOptions = z.infer<typeof snapshotSuiteOptionsSchema>;

export function getSnapshotSuiteHelpText(): string {
  return [
    "Usage:",
    "  a11y-agent-lab snapshot-suite --config <path> --out <output-directory> [options]",
    "",
    "Snapshot suite options:",
    "  --config <path>          YAML suite config path",
    "  --out <output-directory> Root output directory",
    "  --headless <true|false>  Run Chromium headlessly (default: true)",
    `  --timeout-ms <number>    Snapshot timeout per variant (default: ${defaultSnapshotTimeoutMs})`,
    "  -h, --help               Show snapshot-suite help"
  ].join("\n");
}

export function parseSnapshotSuiteArgs(argv: string[]): SnapshotSuiteOptions {
  const values: Record<string, unknown> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument for snapshot-suite: ${arg}`);
    }

    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    index += 1;

    switch (arg) {
      case "--config":
        values.config = value;
        break;
      case "--out":
        values.out = value;
        break;
      case "--headless":
        values.headless = parseBoolean(value, "--headless");
        break;
      case "--timeout-ms":
        values.timeoutMs = parseTimeoutMs(value);
        break;
      default:
        throw new Error(`Unknown snapshot-suite option: ${arg}`);
    }
  }

  const result = snapshotSuiteOptionsSchema.safeParse(values);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid snapshot-suite options: ${message}`);
  }

  return result.data;
}

function parseTimeoutMs(value: string): number {
  const timeoutMs = Number(value);

  if (!Number.isInteger(timeoutMs)) {
    throw new Error(`Invalid --timeout-ms value: ${value}`);
  }

  return timeoutMs;
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
