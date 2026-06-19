import { z } from "zod";

export const snapshotConfigSchema = z.object({
  url: z.string().url().optional(),
  outputDir: z.string().min(1).default("artifacts/snapshots"),
  variant: z.string().min(1).optional()
});

export type SnapshotConfig = z.infer<typeof snapshotConfigSchema>;

export const cliConfigSchema = z.object({
  configPath: z.string().min(1).optional(),
  verbose: z.boolean().default(false)
});

export type CliConfig = z.infer<typeof cliConfigSchema>;

export const appConfigSchema = z.object({
  projectName: z.literal("a11y-agent-lab").default("a11y-agent-lab"),
  snapshot: snapshotConfigSchema.default({})
});

export type AppConfig = z.infer<typeof appConfigSchema>;
