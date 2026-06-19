import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { Page } from "playwright";
import { describe, expect, it, vi } from "vitest";

import { runAgentTask, type AgentObservation } from "../src/agent/runner.js";
import type { ActionResult } from "../src/actions/executor.js";
import type { AgentAction } from "../src/actions/schema.js";
import type { RefRegistry } from "../src/actions/refRegistry.js";
import type { AgentTaskConfig } from "../src/agent/config.js";
import type { EvaluationResult, Evaluator } from "../src/evaluators/types.js";
import { MockModelAdapter } from "../src/models/mock.js";

describe("agent run engine", () => {
  it("succeeds with mock model actions and writes trace/final files", async () => {
    const outputDir = await createOutputDir();
    const evaluator = createEvaluator([
      {
        success: true,
        elapsedMs: 1,
        assertions: [{ ok: true, type: "inputValue" }]
      }
    ]);
    const result = await runAgentTask({
      task: createTask({ maxSteps: 3 }),
      out: outputDir,
      runId: "run-test-success",
      modelAdapter: new MockModelAdapter({
        responses: ['{ "type": "type", "ref": "dom-2", "text": "test@example.com" }']
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([{ ok: true, actionType: "type", ref: "dom-2", elapsedMs: 1 }]),
        evaluator
      }
    });

    expect(result.final).toMatchObject({
      runId: "run-test-success",
      taskId: "checkout_email_001",
      status: "success",
      success: true,
      steps: 1
    });
    await expect(readFile(result.tracePath, "utf8")).resolves.toContain('"stopReason":"success"');
    await expect(readFile(result.finalPath, "utf8")).resolves.toContain('"status": "success"');
    await expect(readJsonl(result.tracePath)).resolves.toHaveLength(1);
  });

  it("treats finish without evaluator success as finished_without_success", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 3 }),
      out: await createOutputDir(),
      runId: "run-test-finish",
      modelAdapter: new MockModelAdapter({
        responses: ['{ "type": "finish", "answer": "done" }']
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([{ ok: true, actionType: "finish", elapsedMs: 1 }]),
        evaluator: createEvaluator([
          {
            success: false,
            elapsedMs: 1,
            assertions: [{ ok: false, type: "url" }]
          }
        ])
      }
    });

    expect(result.final.status).toBe("finished_without_success");
    expect(result.final.success).toBe(false);
    expect(result.final.errorName).toBe("FinishedWithoutSuccess");
  });

  it("enforces maxSteps", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 2 }),
      out: await createOutputDir(),
      runId: "run-test-max",
      modelAdapter: new MockModelAdapter({
        responses: [
          '{ "type": "wait", "ms": 1 }',
          '{ "type": "wait", "ms": 1 }'
        ]
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([
          { ok: true, actionType: "wait", elapsedMs: 1 },
          { ok: true, actionType: "wait", elapsedMs: 1 }
        ]),
        evaluator: createEvaluator([
          {
            success: false,
            elapsedMs: 1,
            assertions: [{ ok: false, type: "url" }]
          },
          {
            success: false,
            elapsedMs: 1,
            assertions: [{ ok: false, type: "url" }]
          }
        ])
      }
    });

    expect(result.final.status).toBe("max_steps_exceeded");
    expect(result.final.steps).toBe(2);
    expect(result.final.errorName).toBe("MaxStepsExceeded");
  });

  it("stops with parse_error and logs the parse failure", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 3 }),
      out: await createOutputDir(),
      runId: "run-test-parse",
      modelAdapter: new MockModelAdapter({
        responses: ["Here is the action"]
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([]),
        evaluator: createEvaluator([])
      }
    });
    const trace = await readJsonl(result.tracePath);

    expect(result.final.status).toBe("parse_error");
    expect(result.final.totals.parseErrors).toBe(1);
    expect(trace[0].parse).toMatchObject({
      ok: false,
      errorName: "JsonObjectModelResponseError"
    });
    expect(trace[0].error).toMatchObject({
      errorName: "JsonObjectModelResponseError"
    });
    expect(result.final.errorMessage).toContain("single JSON object");
  });

  it("stops with action_error when action execution fails", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 3 }),
      out: await createOutputDir(),
      runId: "run-test-action-error",
      modelAdapter: new MockModelAdapter({
        responses: ['{ "type": "click", "ref": "dom-404" }']
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([
          {
            ok: false,
            actionType: "click",
            ref: "dom-404",
            elapsedMs: 1,
            errorName: "RefNotFoundError",
            errorMessage: "No executable target found for ref: dom-404"
          }
        ]),
        evaluator: createEvaluator([])
      }
    });
    const trace = await readJsonl(result.tracePath);

    expect(result.final.status).toBe("action_error");
    expect(result.final.totals.failedActions).toBe(1);
    expect(trace[0].actionResult).toMatchObject({
      ok: false,
      errorName: "RefNotFoundError"
    });
    expect(result.final.errorName).toBe("RefNotFoundError");
  });

  it("stops with observer_error for non-executable observer modes", async () => {
    const result = await runAgentTask({
      task: createTask({ observer: "aria-snapshot" }),
      out: await createOutputDir(),
      runId: "run-test-non-executable-observer",
      modelAdapter: new MockModelAdapter({
        responses: ['{ "type": "finish", "answer": "done" }']
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([]),
        evaluator: createEvaluator([])
      }
    });
    const trace = await readJsonl(result.tracePath);

    expect(result.final.status).toBe("observer_error");
    expect(result.final.errorName).toBe("NonExecutableObserverError");
    expect(result.final.errorMessage).toContain("cannot currently provide executable refs");
    expect(trace[0]).toMatchObject({
      step: 0,
      stopReason: "observer_error",
      error: {
        errorName: "NonExecutableObserverError"
      }
    });
  });

  it("stops with model_error when the mock queue is exhausted", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 1 }),
      out: await createOutputDir(),
      runId: "run-test-model-error",
      modelAdapter: new MockModelAdapter(),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([]),
        evaluator: createEvaluator([])
      }
    });
    const trace = await readJsonl(result.tracePath);

    expect(result.final.status).toBe("model_error");
    expect(result.final.totals.modelErrors).toBe(1);
    expect(result.final.errorName).toBe("MockModelQueueExhaustedError");
    expect(trace[0].model).toMatchObject({
      adapterName: "mock",
      errorName: "MockModelQueueExhaustedError"
    });
  });

  it("stops with evaluation_error when evaluator throws", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 1 }),
      out: await createOutputDir(),
      runId: "run-test-evaluation-error",
      modelAdapter: new MockModelAdapter({
        responses: ['{ "type": "wait", "ms": 1 }']
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([{ ok: true, actionType: "wait", elapsedMs: 1 }]),
        evaluator: {
          name: "throwing-evaluator",
          async evaluate() {
            throw new Error("evaluation failed");
          }
        }
      }
    });
    const trace = await readJsonl(result.tracePath);

    expect(result.final.status).toBe("evaluation_error");
    expect(result.final.errorMessage).toBe("evaluation failed");
    expect(trace[0].error).toMatchObject({
      errorName: "Error",
      errorMessage: "evaluation failed"
    });
  });

  it("writes final.json for structured observer startup failures", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 1 }),
      out: await createOutputDir(),
      runId: "run-test-startup-observer-error",
      modelAdapter: new MockModelAdapter(),
      dependencies: {
        page: createPage({
          gotoError: new Error("navigation failed")
        }),
        observe: createObserver(),
        executeAction: createExecutor([]),
        evaluator: createEvaluator([])
      }
    });
    const finalJson = JSON.parse(await readFile(result.finalPath, "utf8"));

    expect(result.final.status).toBe("observer_error");
    expect(finalJson).toMatchObject({
      status: "observer_error",
      errorMessage: "navigation failed",
      steps: 0
    });
  });

  it("passes previous step summaries to prompts after step 1", async () => {
    const adapter = new MockModelAdapter({
      responses: [
        '{ "type": "wait", "ms": 1 }',
        '{ "type": "finish", "answer": "done" }'
      ]
    });

    await runAgentTask({
      task: createTask({ maxSteps: 2 }),
      out: await createOutputDir(),
      runId: "run-test-previous",
      modelAdapter: adapter,
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([
          { ok: true, actionType: "wait", elapsedMs: 1 },
          { ok: true, actionType: "finish", elapsedMs: 1 }
        ]),
        evaluator: createEvaluator([
          {
            success: false,
            elapsedMs: 1,
            assertions: [{ ok: false, type: "url" }]
          },
          {
            success: false,
            elapsedMs: 1,
            assertions: [{ ok: false, type: "url" }]
          }
        ])
      }
    });

    expect(adapter.requests).toHaveLength(2);
    expect(adapter.requests[0].userPrompt).not.toContain("Previous steps:");
    expect(adapter.requests[1].userPrompt).toContain("Previous steps:");
    expect(adapter.requests[1].userPrompt).toContain("Step 1: action wait -> ok");
  });

  it("defaults to compact traces without full observations or prompts", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 1 }),
      out: await createOutputDir(),
      runId: "run-test-compact-trace",
      modelAdapter: new MockModelAdapter({
        responses: ['{ "type": "wait", "ms": 1 }']
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([{ ok: true, actionType: "wait", elapsedMs: 1 }]),
        evaluator: createEvaluator([
          {
            success: false,
            elapsedMs: 1,
            assertions: [{ ok: false, type: "url" }]
          }
        ])
      }
    });
    const trace = await readJsonl(result.tracePath);

    expect(trace[0].observation.payload).toBeUndefined();
    expect(trace[0].observation.preview).toBeDefined();
    expect(trace[0].prompt.systemPrompt).toBeUndefined();
    expect(trace[0].prompt.charCount).toBeGreaterThan(0);
  });

  it("can include full observations and prompts only when explicitly requested", async () => {
    const result = await runAgentTask({
      task: createTask({ maxSteps: 1 }),
      out: await createOutputDir(),
      runId: "run-test-debug-trace",
      includeObservations: true,
      includePrompts: true,
      modelAdapter: new MockModelAdapter({
        responses: ['{ "type": "wait", "ms": 1 }']
      }),
      dependencies: {
        page: createPage(),
        observe: createObserver(),
        executeAction: createExecutor([{ ok: true, actionType: "wait", elapsedMs: 1 }]),
        evaluator: createEvaluator([
          {
            success: false,
            elapsedMs: 1,
            assertions: [{ ok: false, type: "url" }]
          }
        ])
      }
    });
    const trace = await readJsonl(result.tracePath);

    expect(trace[0].observation.payload).toBeDefined();
    expect(trace[0].prompt.systemPrompt).toContain("Output exactly one JSON action object");
    expect(trace[0].prompt.userPrompt).toContain("Enter test@example.com");
  });
});

function createTask(overrides: Partial<AgentTaskConfig> = {}): AgentTaskConfig {
  return {
    id: "checkout_email_001",
    url: "http://localhost:4310/checkout?variant=good-a11y",
    instruction: "Enter test@example.com into the email field.",
    maxSteps: 8,
    observer: "dom-compact",
    evaluator: {
      assertions: [
        {
          type: "inputValue",
          selector: "[data-test='email']",
          equals: "test@example.com"
        }
      ]
    },
    ...overrides
  };
}

function createPage(options: { gotoError?: Error } = {}): Page {
  return {
    goto: vi.fn(async () => {
      if (options.gotoError) {
        throw options.gotoError;
      }
    }),
    waitForSelector: vi.fn(async () => undefined),
    url: vi.fn(() => "http://localhost:4310/checkout?variant=good-a11y")
  } as unknown as Page;
}

function createObserver(): () => Promise<AgentObservation> {
  return async () => ({
    mode: "dom-compact",
    url: "http://localhost:4310/checkout?variant=good-a11y",
    promptPayload: {
      mode: "dom-compact",
      elements: [
        {
          ref: "dom-2",
          tag: "input",
          label: "Email",
          interactive: true
        }
      ]
    },
    tracePreview: {
      elements: [{ ref: "dom-2", tag: "input", label: "Email" }]
    },
    stats: {
      interactiveElementCount: 1
    },
    refRegistry: emptyRegistry
  });
}

function createExecutor(results: ActionResult[]) {
  const queue = [...results];

  return async (_page: Page, action: AgentAction): Promise<ActionResult> => {
    return (
      queue.shift() ?? {
        ok: true,
        actionType: action.type,
        ...("ref" in action ? { ref: action.ref } : {}),
        elapsedMs: 1
      }
    );
  };
}

function createEvaluator(results: EvaluationResult[]): Evaluator {
  const queue = [...results];

  return {
    name: "mock-evaluator",
    async evaluate() {
      return (
        queue.shift() ?? {
          success: false,
          elapsedMs: 1,
          assertions: [{ ok: false, type: "mock" }]
        }
      );
    }
  };
}

async function createOutputDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "a11y-agent-runner-"));
}

async function readJsonl(filePath: string): Promise<any[]> {
  const contents = await readFile(filePath, "utf8");

  return contents
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const emptyRegistry: RefRegistry = {
  async resolve() {
    return null;
  }
};
