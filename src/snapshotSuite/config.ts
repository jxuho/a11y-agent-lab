import { readFile } from "node:fs/promises";

import YAML from "yaml";
import { z } from "zod";

import {
  defaultReadySelector,
  defaultSnapshotRoot
} from "../snapshot/options.js";

export const snapshotSuiteVariantSchema = z
  .object({
    id: z.string().min(1),
    path: z.string().min(1).optional(),
    query: z.string().min(1).optional()
  })
  .refine((variant) => !(variant.path && variant.query), {
    message: "Use either path or query for a variant, not both"
  });

export type SnapshotSuiteVariantConfig = z.infer<typeof snapshotSuiteVariantSchema>;

export const snapshotSuiteConfigSchema = z.object({
  id: z.string().min(1),
  baseUrl: z.string().url(),
  readySelector: z.string().min(1).default(defaultReadySelector),
  snapshotRoot: z.string().min(1).default(defaultSnapshotRoot),
  variants: z.array(snapshotSuiteVariantSchema).min(1)
});

export type SnapshotSuiteConfig = z.infer<typeof snapshotSuiteConfigSchema>;

export async function loadSnapshotSuiteConfig(configPath: string): Promise<SnapshotSuiteConfig> {
  const contents = await readFile(configPath, "utf8");
  const parsedYaml = YAML.parse(contents);
  const result = snapshotSuiteConfigSchema.safeParse(parsedYaml);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid snapshot suite config: ${message}`);
  }

  return result.data;
}

export function buildVariantUrl(
  baseUrl: string,
  variant: SnapshotSuiteVariantConfig
): string {
  if (variant.path) {
    return new URL(variant.path, baseUrl).toString();
  }

  if (variant.query) {
    const url = new URL(baseUrl);
    const query = variant.query.startsWith("?") ? variant.query.slice(1) : variant.query;

    url.search = query;
    url.hash = "";
    return url.toString();
  }

  return new URL(baseUrl).toString();
}
