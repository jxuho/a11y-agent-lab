import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "playwright";

import { executeAction as defaultExecuteAction, type ActionResult } from "../actions/executor.js";
import type { RefRegistry } from "../actions/refRegistry.js";
import { buildDomCompactRefRegistry } from "../actions/refRegistry.js";
import type { AgentAction } from "../actions/schema.js";
import { DomPageStateEvaluator } from "../evaluators/dom.js";
import type { EvaluationResult, Evaluator } from "../evaluators/types.js";
import type { ModelAdapter, ModelResponse } from "../models/adapter.js";
import { parseModelActionResponse } from "../models/actionParser.js";
import { observeAriaSnapshot } from "../observers/ariaSnapshot.js";
import { observeCdpAccessibility } from "../observers/cdpAx.js";
import {
  observeDomCompact,
  type DomCompactElement,
  type DomCompactObservation
} from "../observers/domCompact.js";
import { buildActionPrompt, type BuiltPrompt } from "../prompts/builder.js";
import type { AgentTaskConfig, ObserverMode } from "./config.js";

export type AgentRunStatus =
  | "success"
  | "finished_without_success"
  | "max_steps_exceeded"
  | "parse_error"
  | "model_error"
  | "observer_error"
  | "evaluation_error"
  | "action_error";

export interface AgentRunFinalResult {
  runId: string;
  taskId: string;
  status: AgentRunStatus;
  success: boolean;
  observer: ObserverMode;
  model: string;
  url: string;
  steps: number;
  maxSteps: number;
  totals: {
    elapsedMs: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    invalidActions: number;
    failedActions: number;
    parseErrors: number;
    modelErrors: number;
  };
  errorName?: string;
  errorMessage?: string;
}

export interface AgentStepTrace {
  runId: string;
  taskId: string;
  step: number;
  observer: string;
  url: string;
  observation?: {
    mode: string;
    payload?: unknown;
    preview?: unknown;
    stats?: Record<string, unknown>;
  };
  prompt?: {
    systemPrompt?: string;
    userPrompt?: string;
    charCount: number;
    approxTokens: number;
  };
  model?: {
    adapterName: string;
    responseText?: string;
    usage?: ModelResponse["usage"];
    errorName?: string;
    errorMessage?: string;
  };
  parse?: {
    ok: boolean;
    action?: unknown;
    errorName?: string;
    errorMessage?: string;
  };
  actionResult?: ActionResult;
  evaluation?: EvaluationResult;
  timingMs: {
    observe?: number;
    prompt?: number;
    model?: number;
    parse?: number;
    action?: number;
    evaluate?: number;
    total: number;
  };
  stopReason?: AgentRunStatus;
}

export interface AgentRunResult {
  final: AgentRunFinalResult;
  tracePath: string;
  finalPath: string;
}

export interface AgentObservation {
  mode: string;
  url: string;
  promptPayload: unknown;
  tracePreview?: unknown;
  stats?: Record<string, unknown>;
  refRegistry: RefRegistry;
}

export interface AgentRunDependencies {
  page?: Page;
  closePage?: () => Promise<void>;
  observe?: (page: Page, mode: ObserverMode) => Promise<AgentObservation>;
  executeAction?: (page: Page, action: AgentAction, registry: RefRegistry) => Promise<ActionResult>;
  evaluator?: Evaluator;
}

export interface RunAgentTaskInput {
  task: AgentTaskConfig;
  out: string;
  modelAdapter: ModelAdapter;
  headless?: boolean;
  observer?: ObserverMode;
  maxSteps?: number;
  runId?: string;
  includeObservations?: boolean;
  includePrompts?: boolean;
  allowJsAssertions?: boolean;
  dependencies?: AgentRunDependencies;
}

interface RunTotals {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  invalidActions: number;
  failedActions: number;
  parseErrors: number;
  modelErrors: number;
}

export async function runAgentTask(input: RunAgentTaskInput): Promise<AgentRunResult> {
  const runStartedAt = Date.now();
  const observer = input.observer ?? input.task.observer;
  const maxSteps = input.maxSteps ?? input.task.maxSteps;
  const runId = input.runId ?? createRunId();
  const tracePath = path.join(input.out, "trace.jsonl");
  const finalPath = path.join(input.out, "final.json");
  const totals: RunTotals = {
    invalidActions: 0,
    failedActions: 0,
    parseErrors: 0,
    modelErrors: 0
  };
  const previousStepSummaries: string[] = [];
  const evaluator = input.dependencies?.evaluator ?? new DomPageStateEvaluator();
  const executeAction = input.dependencies?.executeAction ?? defaultExecuteAction;
  const observe = input.dependencies?.observe ?? observePage;
  let page = input.dependencies?.page;
  let browserClose: (() => Promise<void>) | undefined;
  let final: AgentRunFinalResult | undefined;
  let steps = 0;

  await mkdir(input.out, { recursive: true });
  await writeFile(tracePath, "", "utf8");

  try {
    if (!page) {
      const browser = await chromium.launch({ headless: input.headless ?? true });
      page = await browser.newPage();
      browserClose = async () => {
        await browser.close();
      };
    }

    try {
      await page.goto(input.task.url, {
        waitUntil: "domcontentloaded",
        timeout: input.task.appReady?.timeoutMs
      });

      if (input.task.appReady?.selector) {
        await page.waitForSelector(input.task.appReady.selector, {
          state: "attached",
          timeout: input.task.appReady.timeoutMs
        });
      }
    } catch (error: unknown) {
      final = createFinalResult(input, {
        runId,
        observer,
        maxSteps,
        steps: 0,
        status: "observer_error",
        totals,
        startedAt: runStartedAt,
        page,
        error: serializeError(error)
      });
      await appendTrace(tracePath, {
        runId,
        taskId: input.task.id,
        step: 0,
        observer,
        url: page.url(),
        model: {
          adapterName: input.modelAdapter.name,
          ...serializeError(error)
        },
        timingMs: {
          total: Date.now() - runStartedAt
        },
        stopReason: "observer_error"
      });
    }

    for (let step = 1; !final && step <= maxSteps; step += 1) {
      steps = step;
      const stepStartedAt = Date.now();
      const trace: AgentStepTrace = {
        runId,
        taskId: input.task.id,
        step,
        observer,
        url: page.url(),
        timingMs: {
          total: 0
        }
      };

      let observation: AgentObservation;

      try {
        const observeStartedAt = Date.now();
        observation = await observe(page, observer);
        trace.timingMs.observe = Date.now() - observeStartedAt;
        trace.url = observation.url;
        trace.observation = {
          mode: observation.mode,
          ...(input.includeObservations ? { payload: observation.promptPayload } : {}),
          ...(observation.tracePreview !== undefined ? { preview: observation.tracePreview } : {}),
          ...(observation.stats ? { stats: observation.stats } : {})
        };
      } catch (error: unknown) {
        final = createFinalResult(input, {
          runId,
          observer,
          maxSteps,
          steps,
          status: "observer_error",
          totals,
          startedAt: runStartedAt,
          page,
          error: serializeError(error)
        });
        trace.stopReason = "observer_error";
        trace.model = {
          adapterName: input.modelAdapter.name,
          ...serializeError(error)
        };
        trace.timingMs.total = Date.now() - stepStartedAt;
        await appendTrace(tracePath, trace);
        break;
      }

      const promptStartedAt = Date.now();
      const prompt = buildActionPrompt({
        taskInstruction: input.task.instruction,
        currentUrl: observation.url,
        observationMode: observation.mode,
        observation: observation.promptPayload,
        stepNumber: step,
        previousStepSummaries
      });
      trace.timingMs.prompt = Date.now() - promptStartedAt;
      trace.prompt = createPromptTrace(prompt, input.includePrompts === true);

      let modelResponse: ModelResponse;

      try {
        const modelStartedAt = Date.now();
        modelResponse = await input.modelAdapter.complete({
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          metadata: {
            runId,
            taskId: input.task.id,
            step,
            observer
          }
        });
        trace.timingMs.model = Date.now() - modelStartedAt;
        addUsage(totals, modelResponse.usage);
        trace.model = {
          adapterName: input.modelAdapter.name,
          responseText: modelResponse.text,
          usage: modelResponse.usage
        };
      } catch (error: unknown) {
        totals.modelErrors += 1;
        final = createFinalResult(input, {
          runId,
          observer,
          maxSteps,
          steps,
          status: "model_error",
          totals,
          startedAt: runStartedAt,
          page,
          error: serializeError(error)
        });
        trace.model = {
          adapterName: input.modelAdapter.name,
          ...serializeError(error)
        };
        trace.stopReason = "model_error";
        trace.timingMs.total = Date.now() - stepStartedAt;
        await appendTrace(tracePath, trace);
        break;
      }

      const parseStartedAt = Date.now();
      const parsedAction = parseModelActionResponse(modelResponse.text);
      trace.timingMs.parse = Date.now() - parseStartedAt;

      if (!parsedAction.ok) {
        totals.parseErrors += 1;
        totals.invalidActions += 1;
        trace.parse = {
          ok: false,
          errorName: parsedAction.errorName,
          errorMessage: parsedAction.errorMessage
        };
        final = createFinalResult(input, {
          runId,
          observer,
          maxSteps,
          steps,
          status: "parse_error",
          totals,
          startedAt: runStartedAt,
          page,
          error: {
            errorName: parsedAction.errorName,
            errorMessage: parsedAction.errorMessage
          }
        });
        trace.stopReason = "parse_error";
        trace.timingMs.total = Date.now() - stepStartedAt;
        await appendTrace(tracePath, trace);
        break;
      }

      trace.parse = {
        ok: true,
        action: parsedAction.action
      };

      const actionStartedAt = Date.now();
      const actionResult = await executeAction(page, parsedAction.action, observation.refRegistry);
      trace.timingMs.action = Date.now() - actionStartedAt;
      trace.actionResult = actionResult;

      if (!actionResult.ok) {
        totals.failedActions += 1;
        final = createFinalResult(input, {
          runId,
          observer,
          maxSteps,
          steps,
          status: "action_error",
          totals,
          startedAt: runStartedAt,
          page,
          error: {
            errorName: actionResult.errorName ?? "ActionError",
            errorMessage: actionResult.errorMessage ?? "Action execution failed"
          }
        });
        trace.stopReason = "action_error";
        trace.timingMs.total = Date.now() - stepStartedAt;
        await appendTrace(tracePath, trace);
        break;
      }

      try {
        const evaluateStartedAt = Date.now();
        trace.evaluation = await evaluator.evaluate({
          page,
          config: input.task.evaluator,
          options: {
            allowJsAssertions: input.allowJsAssertions === true
          }
        });
        trace.timingMs.evaluate = Date.now() - evaluateStartedAt;
      } catch (error: unknown) {
        final = createFinalResult(input, {
          runId,
          observer,
          maxSteps,
          steps,
          status: "evaluation_error",
          totals,
          startedAt: runStartedAt,
          page,
          error: serializeError(error)
        });
        trace.stopReason = "evaluation_error";
        trace.timingMs.total = Date.now() - stepStartedAt;
        await appendTrace(tracePath, trace);
        break;
      }

      const stopReason = getStopReason(parsedAction.action, trace.evaluation.success, step, maxSteps);

      if (stopReason) {
        final = createFinalResult(input, {
          runId,
          observer,
          maxSteps,
          steps,
          status: stopReason,
          totals,
          startedAt: runStartedAt,
          page
        });
        trace.stopReason = stopReason;
        trace.timingMs.total = Date.now() - stepStartedAt;
        await appendTrace(tracePath, trace);
        break;
      }

      previousStepSummaries.push(createPreviousStepSummary(step, parsedAction.action, actionResult));
      trace.timingMs.total = Date.now() - stepStartedAt;
      await appendTrace(tracePath, trace);
    }

    if (!final) {
      final = createFinalResult(input, {
        runId,
        observer,
        maxSteps,
        steps,
        status: "max_steps_exceeded",
        totals,
        startedAt: runStartedAt,
        page
      });
    }
  } finally {
    if (input.dependencies?.closePage) {
      await input.dependencies.closePage();
    } else if (browserClose) {
      await browserClose();
    }
  }

  await writeFile(finalPath, `${JSON.stringify(final, null, 2)}\n`, "utf8");

  return {
    final,
    tracePath,
    finalPath
  };
}

export async function observePage(page: Page, mode: ObserverMode): Promise<AgentObservation> {
  if (mode === "dom-compact") {
    const result = await observeDomCompact(page);
    const promptObservation = sanitizeDomCompactObservation(result.observation);

    return {
      mode,
      url: result.observation.finalUrl ?? result.observation.url,
      promptPayload: promptObservation,
      tracePreview: {
        elements: promptObservation.elements.slice(0, 20)
      },
      stats: result.summary.stats as unknown as Record<string, unknown>,
      refRegistry: buildDomCompactRefRegistry(page, result.observation)
    };
  }

  if (mode === "aria-snapshot") {
    const result = await observeAriaSnapshot(page);

    return {
      mode,
      url: result.summary.finalUrl ?? result.summary.url,
      promptPayload: result.snapshot,
      tracePreview: {
        previewLines: result.summary.previewLines
      },
      stats: result.summary.stats as unknown as Record<string, unknown>,
      refRegistry: emptyRefRegistry
    };
  }

  const result = await observeCdpAccessibility(page);

  return {
    mode,
    url: result.summary.finalUrl ?? result.summary.url,
    promptPayload: {
      mode: result.summary.mode,
      url: result.summary.url,
      title: result.summary.title,
      nodes: result.summary.nodes
    },
    tracePreview: {
      nodes: result.summary.nodes.slice(0, 20)
    },
    stats: result.summary.stats as unknown as Record<string, unknown>,
    refRegistry: emptyRefRegistry
  };
}

function sanitizeDomCompactObservation(observation: DomCompactObservation): DomCompactObservation {
  return {
    ...observation,
    elements: observation.elements.map(sanitizeDomCompactElement)
  };
}

function sanitizeDomCompactElement(element: DomCompactElement): DomCompactElement {
  const { selectorHint: _selectorHint, ...safeElement } = element;

  return safeElement;
}

const emptyRefRegistry: RefRegistry = {
  async resolve() {
    return null;
  }
};

function getStopReason(
  action: AgentAction,
  evaluationSuccess: boolean,
  step: number,
  maxSteps: number
): AgentRunStatus | null {
  if (evaluationSuccess) {
    return "success";
  }

  if (action.type === "finish") {
    return "finished_without_success";
  }

  if (step >= maxSteps) {
    return "max_steps_exceeded";
  }

  return null;
}

function createPromptTrace(prompt: BuiltPrompt, includePrompts: boolean): AgentStepTrace["prompt"] {
  const charCount = prompt.systemPrompt.length + prompt.userPrompt.length;

  return {
    ...(includePrompts
      ? {
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt
        }
      : {}),
    charCount,
    approxTokens: Math.ceil(charCount / 4)
  };
}

function createPreviousStepSummary(
  step: number,
  action: AgentAction,
  result: ActionResult
): string {
  const refText = "ref" in action ? ` ref=${action.ref}` : "";
  const textSummary =
    action.type === "type" ? ` textLength=${action.text.length}` : "";
  const status = result.ok
    ? "ok"
    : `failed ${result.errorName ?? "ActionError"}: ${result.errorMessage ?? "unknown error"}`;

  return `Step ${step}: action ${action.type}${refText}${textSummary} -> ${status}`;
}

function createRunId(): string {
  return `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

async function appendTrace(tracePath: string, trace: AgentStepTrace): Promise<void> {
  await appendFile(tracePath, `${JSON.stringify(trace)}\n`, "utf8");
}

function addUsage(totals: RunTotals, usage: ModelResponse["usage"]): void {
  if (!usage) {
    return;
  }

  totals.inputTokens = addOptional(totals.inputTokens, usage.inputTokens);
  totals.outputTokens = addOptional(totals.outputTokens, usage.outputTokens);
  totals.totalTokens = addOptional(totals.totalTokens, usage.totalTokens);
}

function addOptional(current: number | undefined, next: number | undefined): number | undefined {
  if (next === undefined) {
    return current;
  }

  return (current ?? 0) + next;
}

function createFinalResult(
  input: RunAgentTaskInput,
  details: {
    runId: string;
    observer: ObserverMode;
    maxSteps: number;
    steps: number;
    status: AgentRunStatus;
    totals: RunTotals;
    startedAt: number;
    page: Page;
    error?: {
      errorName?: string;
      errorMessage?: string;
    };
  }
): AgentRunFinalResult {
  return {
    runId: details.runId,
    taskId: input.task.id,
    status: details.status,
    success: details.status === "success",
    observer: details.observer,
    model: input.modelAdapter.name,
    url: details.page.url(),
    steps: details.steps,
    maxSteps: details.maxSteps,
    totals: {
      elapsedMs: Date.now() - details.startedAt,
      ...copyDefinedUsage(details.totals),
      invalidActions: details.totals.invalidActions,
      failedActions: details.totals.failedActions,
      parseErrors: details.totals.parseErrors,
      modelErrors: details.totals.modelErrors
    },
    ...details.error
  };
}

function copyDefinedUsage(totals: RunTotals): Pick<
  AgentRunFinalResult["totals"],
  "inputTokens" | "outputTokens" | "totalTokens"
> {
  return {
    ...(totals.inputTokens !== undefined ? { inputTokens: totals.inputTokens } : {}),
    ...(totals.outputTokens !== undefined ? { outputTokens: totals.outputTokens } : {}),
    ...(totals.totalTokens !== undefined ? { totalTokens: totals.totalTokens } : {})
  };
}

function serializeError(error: unknown): {
  errorName: string;
  errorMessage: string;
} {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message
    };
  }

  return {
    errorName: "Error",
    errorMessage: String(error)
  };
}
