import { readFile } from "node:fs/promises";

import { agentActionSchema } from "../actions/schema.js";

export async function loadMockActionResponses(filePath: string): Promise<string[]> {
  let contents: string;
  let parsed: unknown;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Unable to read mock actions at ${filePath}: ${message}`);
  }

  try {
    parsed = JSON.parse(contents);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Invalid JSON in mock actions at ${filePath}: ${message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid mock actions at ${filePath}: expected a JSON array`);
  }

  return parsed.map((item, index) => {
    const result = agentActionSchema.safeParse(item);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || `actions.${index}`}: ${issue.message}`)
        .join("; ");

      throw new Error(`Invalid mock action at index ${index}: ${message}`);
    }

    return JSON.stringify(result.data);
  });
}
