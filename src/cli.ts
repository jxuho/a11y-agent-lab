#!/usr/bin/env node

import { appConfigSchema } from "./config/schema.js";

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
    "Early scaffold commands intentionally stop before browser automation, observers, LLM calls, action execution, evaluation, or experiment running."
  ].join("\n");
}

export function getVersionText(): string {
  return "a11y-agent-lab 0.1.0";
}

export function getCommandMessage(commandName: CommandName): string {
  const command = commands.find((item) => item.name === commandName);

  if (!command) {
    throw new Error(`Unknown command: ${commandName}`);
  }

  return [
    `${command.name} is a ${command.version} command skeleton.`,
    "It is declared now so the CLI shape is stable, but its implementation is intentionally out of scope for this initial scaffold."
  ].join("\n");
}

export function runCli(argv: string[]): number {
  appConfigSchema.parse({});

  const [firstArg] = argv;

  if (!firstArg || firstArg === "--help" || firstArg === "-h") {
    console.log(getHelpText());
    return 0;
  }

  if (firstArg === "--version" || firstArg === "-v") {
    console.log(getVersionText());
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
  process.exitCode = runCli(process.argv.slice(2));
}
