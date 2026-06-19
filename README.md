# A11y Agent Lab

`a11y-agent-lab` is an experimental platform for measuring how frontend DOM and accessibility-tree changes affect AI web agents.

The core research question is how different web observation modes, such as Chrome DevTools Protocol accessibility trees, Playwright ARIA snapshots, and compact DOM serialization, affect an AI agent's success rate, step count, token usage, latency, and invalid-action rate.

This repository is currently an initial TypeScript scaffold. It intentionally does not implement browser automation, observers, LLM calls, action executors, evaluators, experiment runners, or report viewers yet.

## Current Scope

- CLI skeleton with `snapshot`, `run`, and `experiment` commands
- Strict TypeScript configuration
- zod-based config schema placeholders
- Vitest setup

## Commands

```bash
npm run build
npm test
npm run cli -- --help
```

The command skeletons are present so the project shape is clear, but they fail with explicit placeholder messages until their roadmap phase is implemented.

## Roadmap

The project will be developed in small, reviewable phases. Each phase should produce a useful intermediate tool and should avoid implementing later-phase behavior prematurely.

### Phase 0 - Project Foundation

Purpose: establish the repository structure and development baseline.

Scope:

* CLI skeleton with `snapshot`, `run`, and `experiment` commands
* Strict TypeScript configuration
* zod-based config schema placeholders
* Vitest setup
* README and AGENTS.md project guidance

Definition of done:

* Dependencies are declared in `package.json`.
* `npm run build` passes.
* `npm test` passes.
* CLI help runs locally.
* Placeholder commands fail with clear messages until implemented.

### PR 2 - Fixture App

Purpose: create deterministic local pages that later observers and agent experiments can run against.

Scope:

* local fixture app
* checkout fixture page
* query-parameter-based variant selection
* app-ready marker using `body[data-ai-ready="true"]`
* stable `data-test` hooks
* initial UI variants:

  * `good-a11y`
  * `no-label`
  * `icon-only-button`
  * `duplicate-names`
  * `hidden-noise`

Definition of done:

* The fixture app can be started locally with an npm script.
* Each checkout variant is reachable via a URL query parameter.
* The page exposes `body[data-ai-ready="true"]` when ready.
* README documents how to run the fixture app and open each variant.
* Build and tests pass.

### v0.1 - Snapshot Lab

Purpose: collect and compare page observations without using an LLM.

Scope:

* Playwright browser launch
* URL navigation
* app-ready waiting using `body[data-ai-ready="true"]`
* screenshot capture
* metadata output
* CDP accessibility tree export
* Playwright ARIA snapshot export
* custom compact DOM export
* observation statistics
* JSON/YAML output
* snapshot suite support for fixture variants

Out of scope:

* LLM calls
* agent loop
* action executor
* evaluator
* experiment matrix runner
* report viewer

Definition of done:

* A fixture page can be opened with Playwright.
* `cdp-ax.json`, `aria.yml`, `dom-compact.json`, `screenshot.png`, `metadata.json`, and `stats.json` can be saved.
* At least one good-a11y variant and one degraded-a11y variant produce visibly different observations.
* Basic observation statistics are generated, such as interactive element count, unnamed interactive count, and duplicate accessible name count.
* Build and tests pass.

### v0.2 - Agent Runner

Purpose: run a single AI-agent task using one selected observation mode.

Scope:

* task YAML loading
* observer selection
* prompt builder
* model adapter interface
* mock model adapter
* real model adapter
* constrained JSON action schema
* stable-ref-based action executor
* DOM evaluator
* step-level trace logging

Out of scope:

* repeated experiment matrix
* aggregate statistics
* report viewer
* multi-model benchmarking

Definition of done:

* A simple checkout task can be run from the CLI.
* The agent can click, type, scroll, wait, and finish using stable refs.
* Success or failure is determined by evaluator assertions, not by the model's final message.
* Each run produces `trace.jsonl` and `final.json`.
* Failed runs contain enough trace data to inspect what the agent observed and attempted.

### v0.3 - Experiment Suite

Purpose: run repeated experiments across tasks, variants, observers, and models.

Scope:

* experiment matrix runner
* repeated runs
* run ID and seed management
* aggregate metrics
* CSV/JSON export
* summary report
* minimal trace viewer

Definition of done:

* Multiple observers and variants can be run repeatedly.
* Success rate, average steps, token usage, latency, and invalid-action rate are summarized.
* Results can be grouped by task, variant, observer, and model.
* Failed runs can be inspected step by step.
* Summary outputs are suitable for comparing how DOM and accessibility-tree changes affect AI web agents.
