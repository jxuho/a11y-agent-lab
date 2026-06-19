import { z } from "zod";

export const defaultReadySelector = 'body[data-ai-ready="true"]';
export const defaultSnapshotTimeoutMs = 15_000;

export const snapshotOptionsSchema = z.object({
  url: z.string().url(),
  out: z.string().min(1),
  readySelector: z.string().min(1).default(defaultReadySelector),
  timeoutMs: z.number().int().positive().default(defaultSnapshotTimeoutMs),
  headless: z.boolean().default(true)
});

export type SnapshotOptions = z.infer<typeof snapshotOptionsSchema>;

export interface ParsedSnapshotArgs {
  options: SnapshotOptions;
}

export function getSnapshotHelpText(): string {
  return [
    "Usage:",
    "  a11y-agent-lab snapshot --url <url> --out <output-directory> [options]",
    "",
    "Snapshot options:",
    "  --url <url>                    Page URL to open",
    "  --out <output-directory>       Directory for snapshot output files",
    `  --ready-selector <selector>    Ready selector to wait for (default: ${defaultReadySelector})`,
    `  --timeout-ms <number>          Navigation and ready wait timeout (default: ${defaultSnapshotTimeoutMs})`,
    "  --headless <true|false>        Run Chromium headlessly (default: true)",
    "  -h, --help                     Show snapshot help"
  ].join("\n");
}

export function parseSnapshotArgs(argv: string[]): ParsedSnapshotArgs {
  const values: Record<string, unknown> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument for snapshot: ${arg}`);
    }

    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    index += 1;

    switch (arg) {
      case "--url":
        values.url = value;
        break;
      case "--out":
        values.out = value;
        break;
      case "--ready-selector":
        values.readySelector = value;
        break;
      case "--timeout-ms":
        values.timeoutMs = parseTimeoutMs(value);
        break;
      case "--headless":
        values.headless = parseBoolean(value, "--headless");
        break;
      default:
        throw new Error(`Unknown snapshot option: ${arg}`);
    }
  }

  const result = snapshotOptionsSchema.safeParse(values);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid snapshot options: ${message}`);
  }

  return {
    options: result.data
  };
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
