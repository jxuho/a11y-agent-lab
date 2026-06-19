import { readFile } from "node:fs/promises";

import YAML from "yaml";
import { z } from "zod";

import { evaluatorConfigSchema } from "../evaluators/schema.js";

export const observerModeSchema = z.enum(["dom-compact", "aria-snapshot", "cdp-ax"]);

export const agentTaskConfigSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    url: z.string().url(),
    instruction: z.string().min(1),
    maxSteps: z.number().int().positive().max(100).default(8),
    observer: observerModeSchema.default("dom-compact"),
    appReady: z
      .object({
        selector: z.string().min(1).optional(),
        timeoutMs: z.number().int().positive().default(10_000)
      })
      .strict()
      .optional(),
    evaluator: evaluatorConfigSchema
  })
  .strict();

export type ObserverMode = z.infer<typeof observerModeSchema>;
export type AgentTaskConfig = z.infer<typeof agentTaskConfigSchema>;

export async function loadAgentTaskConfig(configPath: string): Promise<AgentTaskConfig> {
  let contents: string;
  let parsedYaml: unknown;

  try {
    contents = await readFile(configPath, "utf8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Unable to read agent task config at ${configPath}: ${message}`);
  }

  try {
    parsedYaml = YAML.parse(contents);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Invalid YAML in agent task config at ${configPath}: ${message}`);
  }

  const result = agentTaskConfigSchema.safeParse(parsedYaml);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid agent task config: ${message}`);
  }

  return result.data;
}
