# AGENTS.md

## Project Overview

This project is an experimental platform for measuring how frontend DOM and accessibility-tree changes affect AI web agents.

The goal is not to build a general browser automation tool, accessibility linter, or production RPA system.

The core research question is:

> How do different web observation modes, such as CDP Accessibility tree, Playwright ARIA snapshot, and custom compact DOM serialization, affect an AI agent's success rate, step count, token usage, latency, and invalid-action rate?

## Product Name

Working name: `a11y-agent-lab`

## Core Concepts

The project is organized around these concepts:

* `Browser Runner`: launches and controls Chromium with Playwright.
* `Observer`: converts the current browser page into an AI-readable observation.
* `CDP AX Observer`: reads Chrome's accessibility tree through Chrome DevTools Protocol.
* `ARIA Snapshot Observer`: reads Playwright's ARIA snapshot representation.
* `DOM Compact Observer`: serializes selected DOM information into compact JSON.
* `Agent Loop`: performs observe → model → action → evaluate steps.
* `Action Executor`: executes a constrained action schema against the browser.
* `Evaluator`: determines task success from actual browser/page state.
* `Trace Logger`: records step-level observations, actions, timings, tokens, screenshots, and outcomes.

## Version Plan

### v0.1 — Snapshot Lab

Purpose: collect and compare page observations without using an LLM.

Scope:

* Playwright browser launch
* URL navigation
* app-ready waiting
* screenshot capture
* CDP AX tree export
* Playwright ARIA snapshot export
* custom compact DOM export
* observation statistics
* JSON/YAML output
* fixture app with UI variants

Do not implement in v0.1:

* LLM calls
* agent loop
* action executor
* evaluator
* experiment matrix runner
* report viewer

Definition of done:

* A fixture page can be opened.
* `cdp-ax.json`, `aria.yml`, `dom-compact.json`, `screenshot.png`, and `stats.json` can be saved.
* At least one good-a11y variant and one degraded-a11y variant produce visibly different observations.
* Build and tests pass.

### v0.2 — Agent Runner

Purpose: run a single AI-agent task using one selected observation mode.

Scope:

* task YAML loading
* observer selection
* prompt builder
* model adapter interface
* mock model adapter
* real model adapter
* constrained JSON action schema
* ref-based action executor
* DOM evaluator
* step-level trace logging

Definition of done:

* A simple checkout task can be run from CLI.
* The agent can click/type/scroll/wait/finish using stable refs.
* Success or failure is determined by evaluator assertions, not by the model's final message.
* Each run produces `trace.jsonl` and `final.json`.

### v0.3 — Experiment Suite

Purpose: run repeated experiments across tasks, variants, observers, and models.

Scope:

* matrix runner
* repeat runs
* aggregate metrics
* CSV/JSON export
* summary report
* minimal trace viewer

Definition of done:

* Multiple observers and variants can be run repeatedly.
* Success rate, average steps, token usage, latency, and invalid-action rate are summarized.
* Failed runs can be inspected step by step.

## Architecture Rules

Keep modules separate:

* Browser control must live in browser runner code.
* Observation logic must live in observer modules.
* LLM/model calls must live behind model adapter interfaces.
* Action execution must use constrained action schemas.
* Evaluation must be independent from model output.
* Logging must be structured and machine-readable.

Do not mix these concerns in one large file.

## Action Schema

Agents must not output arbitrary Playwright code or CSS selectors.

Preferred action format:

```ts
type AgentAction =
  | { type: "click"; ref: string }
  | { type: "type"; ref: string; text: string }
  | { type: "select"; ref: string; value: string }
  | { type: "press"; key: string }
  | { type: "scroll"; direction: "up" | "down"; amount?: number }
  | { type: "wait"; ms: number }
  | { type: "finish"; answer?: string };
```

The agent should act on stable element refs produced by observers.

## Observer Requirements

Every observer should return:

* `mode`
* `url`
* `title`
* `timestamp`
* `elements` or `nodes`
* stable refs for actionable targets when possible
* observation stats

Observation stats should include, when applicable:

* character count
* approximate token count
* DOM node count
* AX node count
* interactive element count
* unnamed interactive element count
* duplicate accessible name count
* hidden node count

## Fixture App Requirements

Fixture apps should be small, deterministic, and intentionally varied.

Initial fixture candidates:

* checkout form
* settings page
* modal confirmation
* data grid
* virtualized list

Initial variants:

* `good-a11y`
* `no-label`
* `icon-only-button`
* `duplicate-names`
* `hidden-noise`
* `virtualized`

Every fixture page should expose an app-ready marker:

```html
<body data-ai-ready="true">
```

Tests and runners should wait for this marker before collecting observations.

## Coding Conventions

Use TypeScript.

Prefer:

* strict TypeScript
* small modules
* explicit interfaces
* zod for config validation
* vitest for unit tests
* Playwright for browser automation
* JSONL for step traces
* JSON/YAML for observations

Avoid:

* hidden global state
* arbitrary sleeps unless testing wait behavior
* selector-based model actions
* model-specific logic inside core runner code
* mixing fixture app code with runner code
* adding complex UI before trace data is reliable

## CLI Expectations

Planned CLI commands:

```bash
a11y-agent-lab snapshot
a11y-agent-lab snapshot-suite
a11y-agent-lab run
a11y-agent-lab experiment
a11y-agent-lab report
```

For early versions, commands may be partially implemented, but they should fail with clear messages.

## Testing Expectations

Before marking work complete, run:

```bash
npm run build
npm test
```

If linting is configured, also run:

```bash
npm run lint
```

When browser-dependent tests are added, document any required setup.

## Research Integrity Rules

Do not optimize for making the agent succeed at all costs.

The goal is to measure differences between observation modes and frontend variants.

Avoid changes that hide or collapse experimental differences, such as:

* giving the model privileged selectors in one mode but not another
* allowing arbitrary Playwright code generation
* changing evaluator criteria between variants
* changing prompts without recording the change
* silently skipping failed runs
* judging success from the model's final message instead of page state

## Security and Safety

Do not commit secrets.

Do not store API keys in source files.

Use environment variables for model credentials.

Do not run experiments against third-party websites without explicit permission.

The initial target should be local fixture apps only.

## Pull Request Expectations

Each PR should be small and have a clear definition of done.

Preferred PR sequence:

1. project scaffold
2. fixture app
3. snapshot command
4. CDP AX observer
5. ARIA snapshot observer
6. custom DOM serializer
7. snapshot suite and stats
8. action schema and executor
9. model adapter and prompt builder
10. evaluator
11. agent run command
12. experiment matrix runner
13. report command
14. minimal trace viewer

Each PR should update README or docs when behavior changes.
