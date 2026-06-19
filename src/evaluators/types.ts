import type { Page } from "playwright";

import type { EvaluatorConfig } from "./schema.js";

export interface AssertionResult {
  ok: boolean;
  type: string;
  description?: string;
  selector?: string;
  actual?: unknown;
  expected?: unknown;
  errorName?: string;
  errorMessage?: string;
}

export interface EvaluationResult {
  success: boolean;
  elapsedMs: number;
  assertions: AssertionResult[];
}

export interface EvaluationOptions {
  allowJsAssertions?: boolean;
}

export interface EvaluationContext {
  page: Page;
  config: EvaluatorConfig;
  options?: EvaluationOptions;
}

export interface Evaluator {
  readonly name: string;
  evaluate(context: EvaluationContext): Promise<EvaluationResult>;
}
