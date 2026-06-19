# A11y Agent Lab

`a11y-agent-lab` is an experimental platform for measuring how frontend DOM and accessibility-tree changes affect AI web agents.

The core research question is how different web observation modes, such as Chrome DevTools Protocol accessibility trees, Playwright ARIA snapshots, and compact DOM serialization, affect an AI agent's success rate, step count, token usage, latency, and invalid-action rate.

This repository currently contains v0.1 Snapshot Lab: a deterministic checkout fixture app, single-page snapshots, CDP AX output, Playwright ARIA snapshots, compact DOM serialization, and a snapshot suite runner. It intentionally does not implement LLM calls, action executors, evaluators, agent experiment runners, or report viewers yet.

## Current Scope

- v0.1 Snapshot Lab is implemented and hardened
- CLI skeleton with `snapshot`, `run`, and `experiment` commands
- Strict TypeScript configuration
- zod-based config schema placeholders
- Vitest setup
- Local checkout fixture app with accessibility variants
- Playwright snapshot command with screenshot, metadata, CDP AX output, ARIA snapshot output, and compact DOM output
- YAML-based `snapshot-suite` command with suite `summary.json` and `results.csv`

## Commands

```bash
npm run build
npm test
npm run cli -- --help
npm run fixture:checkout
```

The `snapshot` command can open a local fixture page, wait for readiness, and write a screenshot, basic metadata, CDP AX output, Playwright ARIA snapshot output, and compact DOM output. The `run` and `experiment` commands remain placeholders until their roadmap phases.

See [docs/output-contracts.md](docs/output-contracts.md) for v0.1 output schemas and [docs/v0.1-validation.md](docs/v0.1-validation.md) for a manual validation checklist.

## Checkout Fixture App

The local checkout fixture is a deterministic HTML app used by future snapshot and agent experiments. It is intentionally small and has stable `data-test` hooks for tests and future observation tooling.

Start it locally:

```bash
npm run fixture:checkout
```

By default, the fixture server listens on `http://localhost:4310`. To use a different port:

```bash
FIXTURE_PORT=4321 npm run fixture:checkout
```

Open the checkout variants:

- `http://localhost:4310/checkout?variant=good-a11y`
- `http://localhost:4310/checkout?variant=no-label`
- `http://localhost:4310/checkout?variant=icon-only-button`
- `http://localhost:4310/checkout?variant=duplicate-names`
- `http://localhost:4310/checkout?variant=hidden-noise`

Every fixture page renders `body[data-ai-ready="true"]` when ready. Unknown or omitted variants fall back to `good-a11y`.

Variant intent:

- `good-a11y`: semantic checkout form with headings, labels, meaningful buttons, and accessible controls.
- `no-label`: intentionally weakens or removes labels from selected form fields.
- `icon-only-button`: includes an icon-only discount button without a useful accessible name.
- `duplicate-names`: includes multiple interactive controls with the same accessible name.
- `hidden-noise`: includes hidden legacy DOM content that does not affect the visual UI but can affect future DOM serialization experiments.

## Snapshot Command

The snapshot command is the first v0.1 browser foundation. It launches Chromium with Playwright, opens the provided URL, waits for a ready selector, captures the browser-computed CDP accessibility tree, Playwright ARIA snapshot, and compact live DOM, creates the output directory if needed, and writes:

```text
<out>/
  screenshot.png
  metadata.json
  cdp-ax.json
  cdp-ax-summary.json
  aria.yml
  aria-summary.json
  dom-compact.json
  dom-summary.json
```

`cdp-ax.json` preserves the raw Chrome DevTools Protocol `Accessibility.getFullAXTree` response. `cdp-ax-summary.json` contains normalized node fields and basic CDP AX stats, including total node count, ignored node count, interactive node count, unnamed interactive count, and duplicate interactive name count.

`aria.yml` preserves the string returned by Playwright `locator.ariaSnapshot()`. `aria-summary.json` contains lightweight text-derived stats, including character count, line count, role-specific line counts, unnamed interactive line count, and the first 20 non-empty preview lines.

`dom-compact.json` contains a compact JSON serialization of visible, useful, and actionable DOM elements from `document.body`. It assigns stable `dom-*` refs, includes fields such as labels, ARIA attributes, placeholders, safe form values, `data-test`, hrefs, and bounding boxes, and skips noisy or hidden subtrees by default. `dom-summary.json` contains lightweight stats such as element counts, serialized element count, hidden element count, interactive counts, unnamed interactive count, form-control counts, character count, approximate token count, and the first 20 serialized elements.

Run it against the checkout fixture:

```bash
npm run fixture:checkout
```

In another terminal:

```bash
npm run build
npm run cli -- snapshot \
  --url "http://localhost:4310/checkout?variant=good-a11y" \
  --out "results/snapshots/checkout-good"
```

Options:

- `--url <url>`: page URL to open.
- `--out <output-directory>`: where the snapshot output files are written.
- `--ready-selector <selector>`: selector to wait for before capturing. Defaults to `body[data-ai-ready="true"]`.
- `--snapshot-root <selector>`: root locator for the Playwright ARIA snapshot. Defaults to `body`.
- `--timeout-ms <number>`: navigation and ready wait timeout. Defaults to `15000`.
- `--headless <true|false>`: run Chromium headlessly. Defaults to `true`.

Example with a narrower ARIA snapshot root:

```bash
npm run cli -- snapshot \
  --url "http://localhost:4310/checkout?variant=good-a11y" \
  --out "results/snapshots/checkout-good-form" \
  --snapshot-root "form"
```

Example variant snapshots:

```bash
npm run cli -- snapshot --url "http://localhost:4310/checkout?variant=no-label" --out "results/snapshots/checkout-no-label"
npm run cli -- snapshot --url "http://localhost:4310/checkout?variant=icon-only-button" --out "results/snapshots/checkout-icon-only-button"
npm run cli -- snapshot --url "http://localhost:4310/checkout?variant=duplicate-names" --out "results/snapshots/checkout-duplicate-names"
npm run cli -- snapshot --url "http://localhost:4310/checkout?variant=hidden-noise" --out "results/snapshots/checkout-hidden-noise"
```

## Snapshot Suite

The snapshot suite command loads a YAML config, runs the existing snapshot pipeline once per variant, and writes suite-level comparison files.

Example config:

```yaml
id: checkout
baseUrl: "http://localhost:4310/checkout"
readySelector: 'body[data-ai-ready="true"]'
snapshotRoot: "body"
variants:
  - id: good-a11y
    query: "?variant=good-a11y"
  - id: no-label
    query: "?variant=no-label"
```

Run the included checkout suite:

```bash
npm run fixture:checkout
```

In another terminal:

```bash
npm run build
npm run cli -- snapshot-suite \
  --config "experiments/checkout.snapshot.yaml" \
  --out "results/snapshots"
```

Expected output:

```text
results/snapshots/checkout/
  summary.json
  results.csv
  good-a11y/
    screenshot.png
    metadata.json
    cdp-ax.json
    cdp-ax-summary.json
    aria.yml
    aria-summary.json
    dom-compact.json
    dom-summary.json
  no-label/
    ...
```

`summary.json` records suite metadata, success and failure counts, one entry per variant, and selected stats from CDP AX, ARIA snapshot, and compact DOM summaries. `results.csv` flattens those values into one row per variant for quick comparison. If one variant fails, the suite continues and records the error in both files.

Quick inspection examples:

```bash
node -e "const s=require('./results/snapshots/checkout/summary.json'); console.log(s.successfulSnapshotCount, s.failedSnapshotCount)"
sed -n '1,6p' results/snapshots/checkout/results.csv
```

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
