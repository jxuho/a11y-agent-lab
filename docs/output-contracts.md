# v0.1 Output Contracts

This document describes the stable output files produced by A11y Agent Lab v0.1 Snapshot Lab.

## Snapshot Output

Each `snapshot` run writes these files into the requested output directory:

```text
screenshot.png
metadata.json
cdp-ax.json
cdp-ax-summary.json
aria.yml
aria-summary.json
dom-compact.json
dom-summary.json
```

### `metadata.json`

Run metadata for the browser capture.

Required fields:

- `mode`: `"snapshot-metadata"`
- `url`
- `finalUrl`
- `title`
- `timestamp`
- `viewport`
- `readySelector`
- `snapshotRoot`
- `timeoutMs`

Optional fields:

- `variantId`
- `suiteId`
- `userAgent`

### `cdp-ax.json`

Raw Chrome DevTools Protocol `Accessibility.getFullAXTree` response. This file intentionally preserves the CDP response shape as much as practical.

### `cdp-ax-summary.json`

Normalized CDP accessibility summary.

Common fields:

- `mode`: `"cdp-ax"`
- `url`
- `finalUrl`
- `title`
- `timestamp`
- `variantId`, when available
- `suiteId`, when available

Stats include:

- `totalNodeCount`
- `ignoredNodeCount`
- `nonIgnoredNodeCount`
- `interactiveNodeCount`
- `unnamedInteractiveNodeCount`
- `duplicateInteractiveNameCount`

### `aria.yml`

Raw string returned by Playwright `locator.ariaSnapshot()`.

### `aria-summary.json`

Text-derived summary of `aria.yml`.

Common fields:

- `mode`: `"aria-snapshot"`
- `url`
- `finalUrl`
- `title`
- `timestamp`
- `variantId`, when available
- `suiteId`, when available
- `snapshotRoot`

Stats include:

- `charCount`
- `lineCount`
- `nonEmptyLineCount`
- `approxTokenCount`
- `roleLineCount`
- `buttonLineCount`
- `textboxLineCount`
- `checkboxLineCount`
- `linkLineCount`
- `unnamedInteractiveLineCount`

### `dom-compact.json`

Compact live DOM serialization from `document.body`. This is not full HTML. It focuses on visible, useful, and actionable elements.

Common fields:

- `mode`: `"dom-compact"`
- `url`
- `finalUrl`
- `title`
- `timestamp`
- `variantId`, when available
- `suiteId`, when available
- `root`
- `elements`

Element refs use the deterministic `dom-*` format in traversal order. Password-like values are not serialized.

### `dom-summary.json`

Summary of `dom-compact.json`.

Stats include:

- `elementCount`
- `serializedElementCount`
- `textNodeCount`
- `interactiveElementCount`
- `unnamedInteractiveElementCount`
- `hiddenElementCount`
- `linkCount`
- `buttonCount`
- `inputCount`
- `formControlCount`
- `charCount`
- `approxTokenCount`

## Snapshot Suite Output

Each `snapshot-suite` run writes suite-level files plus one subdirectory per variant:

```text
summary.json
results.csv
<variant-id>/
  screenshot.png
  metadata.json
  cdp-ax.json
  cdp-ax-summary.json
  aria.yml
  aria-summary.json
  dom-compact.json
  dom-summary.json
```

### `summary.json`

Suite-level JSON with:

- `suiteId`
- `timestamp`
- `configPath`
- `outDir`
- `variantCount`
- `successfulSnapshotCount`
- `failedSnapshotCount`
- `variants`

Each variant entry has:

- `id`
- `url`
- `outDir`
- `status`: `"success"` or `"failed"`
- selected `stats` for successful runs
- `errorName`, `errorMessage`, and optionally `errorStack` for failed runs

### `results.csv`

One row per variant, with flat columns for selected CDP AX, ARIA, DOM, status, output path, and error message fields.
