#!/usr/bin/env node

import { appConfigSchema } from "./config/schema.js";
import { loadAgentTaskConfig } from "./agent/config.js";
import { loadMockActionResponses } from "./agent/mockActions.js";
import { getAgentRunHelpText, parseAgentRunArgs } from "./agent/options.js";
import { runAgentTask } from "./agent/runner.js";
import { MockModelAdapter } from "./models/mock.js";
import { NotConfiguredModelAdapter } from "./models/notConfigured.js";
import { getSnapshotHelpText, parseSnapshotArgs } from "./snapshot/options.js";
import { runSnapshot } from "./snapshot/runner.js";
import {
  getSnapshotSuiteHelpText,
  parseSnapshotSuiteArgs
} from "./snapshotSuite/options.js";
import { runSnapshotSuite } from "./snapshotSuite/runner.js";

type CommandName = "snapshot" | "snapshot-suite" | "run" | "experiment";

interface CliCommand {
  name: CommandName;
  summary: string;
  version: string;
}

const commands: CliCommand[] = [
  {
    name: "snapshot",
    summary: "Collect page observations for v0.1 Snapshot Lab.",
    version: "v0.1"
  },
  {
    name: "snapshot-suite",
    summary: "Run snapshots across variants from a YAML config.",
    version: "v0.1"
  },
  {
    name: "run",
    summary: "Run one AI-agent task with a selected observer.",
    version: "v0.2"
  },
  {
    name: "experiment",
    summary: "Run repeated experiments across tasks and variants.",
    version: "v0.3"
  }
];

const commandNames = new Set<string>(commands.map((command) => command.name));

export function getHelpText(): string {
  const commandList = commands
    .map((command) => `  ${command.name.padEnd(16)} ${command.summary}`)
    .join("\n");

  return [
    "A11y Agent Lab",
    "",
    "Usage:",
    "  a11y-agent-lab <command>",
    "  a11y-agent-lab --help",
    "",
    "Commands:",
    commandList,
    "",
    "Options:",
    "  -h, --help     Show this help message",
    "  -v, --version  Show package version",
    "",
    "Snapshot options:",
    "  --url <url>",
    "  --out <output-directory>",
    '  --ready-selector <selector>    Default: body[data-ai-ready="true"]',
    "  --snapshot-root <selector>     Default: body",
    "  --timeout-ms <number>          Default: 15000",
    "  --headless <true|false>        Default: true",
    "",
    "Snapshot suite options:",
    "  --config <path>",
    "  --out <output-directory>",
    "  --timeout-ms <number>          Default: 15000",
    "  --headless <true|false>        Default: true",
    "",
    "Run options:",
    "  a11y-agent-lab run <task.yaml> --out <output-directory>",
    "  --observer <dom-compact|aria-snapshot|cdp-ax>",
    "  --model <mock|placeholder>     Default: mock",
    "  --mock-actions <path>",
    "  --max-steps <number>",
    "  --headless <true|false>        Default: true",
    "",
    "Experiment matrices and aggregate reporting are planned for v0.3."
  ].join("\n");
}

export function getVersionText(): string {
  return "a11y-agent-lab 0.1.0";
}

export function getCommandMessage(commandName: CommandName): string {
  if (commandName === "snapshot" || commandName === "snapshot-suite" || commandName === "run") {
    return `${commandName} is implemented. Run \`a11y-agent-lab ${commandName} --help\` for options.`;
  }

  const command = commands.find((item) => item.name === commandName);

  if (!command) {
    throw new Error(`Unknown command: ${commandName}`);
  }

  return [
    `${command.name} is a ${command.version} command skeleton.`,
    "It is declared now so the CLI shape is stable, but its implementation is intentionally out of scope for this initial scaffold."
  ].join("\n");
}

export async function runCli(argv: string[]): Promise<number> {
  appConfigSchema.parse({});

  const [firstArg, ...restArgs] = argv;

  if (!firstArg || firstArg === "--help" || firstArg === "-h") {
    console.log(getHelpText());
    return 0;
  }

  if (firstArg === "--version" || firstArg === "-v") {
    console.log(getVersionText());
    return 0;
  }

  if (firstArg === "snapshot") {
    if (restArgs[0] === "--help" || restArgs[0] === "-h") {
      console.log(getSnapshotHelpText());
      return 0;
    }

    const { options } = parseSnapshotArgs(restArgs);
    const result = await runSnapshot(options);

    console.log(`Saved screenshot: ${result.screenshotPath}`);
    console.log(`Saved metadata: ${result.metadataPath}`);
    console.log(`Saved CDP AX tree: ${result.cdpAxPath}`);
    console.log(`Saved CDP AX summary: ${result.cdpAxSummaryPath}`);
    console.log(`Saved ARIA snapshot: ${result.ariaPath}`);
    console.log(`Saved ARIA summary: ${result.ariaSummaryPath}`);
    console.log(`Saved compact DOM: ${result.domCompactPath}`);
    console.log(`Saved DOM summary: ${result.domSummaryPath}`);
    return 0;
  }

  if (firstArg === "snapshot-suite") {
    if (restArgs[0] === "--help" || restArgs[0] === "-h") {
      console.log(getSnapshotSuiteHelpText());
      return 0;
    }

    const options = parseSnapshotSuiteArgs(restArgs);
    const result = await runSnapshotSuite(options);

    console.log(`Saved suite summary: ${result.summaryPath}`);
    console.log(`Saved suite CSV: ${result.csvPath}`);
    console.log(
      `Snapshot suite complete: ${result.summary.successfulSnapshotCount} succeeded, ${result.summary.failedSnapshotCount} failed`
    );
    return result.summary.failedSnapshotCount > 0 ? 1 : 0;
  }

  if (firstArg === "run") {
    if (restArgs[0] === "--help" || restArgs[0] === "-h") {
      console.log(getAgentRunHelpText());
      return 0;
    }

    const options = parseAgentRunArgs(restArgs);
    const task = await loadAgentTaskConfig(options.config);
    const modelAdapter =
      options.model === "mock"
        ? new MockModelAdapter({
            responses: options.mockActions ? await loadMockActionResponses(options.mockActions) : []
          })
        : new NotConfiguredModelAdapter("placeholder");
    const result = await runAgentTask({
      task,
      out: options.out,
      modelAdapter,
      headless: options.headless,
      observer: options.observer,
      maxSteps: options.maxSteps,
      includeObservations: options.includeObservations,
      includePrompts: options.includePrompts,
      allowJsAssertions: options.allowJsAssertions
    });

    console.log(`Saved trace: ${result.tracePath}`);
    console.log(`Saved final result: ${result.finalPath}`);
    console.log(`Agent run complete: ${result.final.status}`);
    return result.final.success ? 0 : 1;
  }

  if (commandNames.has(firstArg)) {
    console.error(getCommandMessage(firstArg as CommandName));
    return 1;
  }

  console.error(`Unknown command: ${firstArg}`);
  console.error("");
  console.error(getHelpText());
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);

      console.error(message);
      process.exitCode = 1;
    });
}
