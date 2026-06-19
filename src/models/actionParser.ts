import { z } from "zod";

import { agentActionSchema, type AgentAction } from "../actions/schema.js";

export type ParsedActionResult =
  | {
      ok: true;
      action: AgentAction;
      rawText: string;
    }
  | {
      ok: false;
      rawText: string;
      errorName: string;
      errorMessage: string;
    };

export function parseModelActionResponse(rawText: string): ParsedActionResult {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return parseFailure(rawText, "EmptyModelResponseError", "Model response was empty.");
  }

  if (trimmed.startsWith("```") || trimmed.endsWith("```")) {
    return parseFailure(
      rawText,
      "MarkdownModelResponseError",
      "Model response must be a single JSON object without markdown code fences."
    );
  }

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return parseFailure(
      rawText,
      "JsonObjectModelResponseError",
      "Model response must be exactly one single JSON object with no prose before or after it."
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch (error: unknown) {
    return parseFailure(
      rawText,
      "MalformedJsonModelResponseError",
      error instanceof Error
        ? `Model response was not valid JSON: ${error.message}`
        : "Model response was not valid JSON."
    );
  }

  if (Array.isArray(parsed) || !parsed || typeof parsed !== "object") {
    return parseFailure(
      rawText,
      "JsonObjectModelResponseError",
      "Model response must parse to a single JSON object, not an array or primitive."
    );
  }

  const validation = agentActionSchema.safeParse(parsed);

  if (!validation.success) {
    return parseFailure(
      rawText,
      "InvalidActionModelResponseError",
      formatZodError(validation.error)
    );
  }

  return {
    ok: true,
    action: validation.data,
    rawText
  };
}

function parseFailure(
  rawText: string,
  errorName: string,
  errorMessage: string
): ParsedActionResult {
  return {
    ok: false,
    rawText,
    errorName,
    errorMessage
  };
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "action";

      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
