#!/usr/bin/env node

import { appConfigSchema } from "./config/schema.js";
import { getSnapshotHelpText, parseSnapshotArgs } from "./snapshot/options.js";
import { runSnapshot } from "./snapshot/runner.js";

type CommandName = "snapshot" | "run" | "experiment";

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
    .map((command) => `  ${command.name.padEnd(12)} ${command.summary}`)
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
    "  --timeout-ms <number>          Default: 15000",
    "  --headless <true|false>        Default: true",
    "",
    "ARIA snapshots, compact DOM serialization, LLM calls, action execution, evaluation, and experiment running are intentionally out of scope for this command foundation."
  ].join("\n");
}

export function getVersionText(): string {
  return "a11y-agent-lab 0.1.0";
}

export function getCommandMessage(commandName: CommandName): string {
  if (commandName === "snapshot") {
    return "snapshot is implemented. Run `a11y-agent-lab snapshot --help` for options.";
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
    return 0;
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
