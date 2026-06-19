import { describe, expect, it } from "vitest";

import {
  defaultReadySelector,
  defaultSnapshotTimeoutMs,
  parseSnapshotArgs
} from "../src/snapshot/options.js";
import { createSnapshotMetadata } from "../src/snapshot/runner.js";

describe("snapshot CLI options", () => {
  it("parses required snapshot arguments with defaults", () => {
    const { options } = parseSnapshotArgs([
      "--url",
      "http://localhost:4310/checkout?variant=good-a11y",
      "--out",
      "results/snapshots/checkout-good"
    ]);

    expect(options).toEqual({
      url: "http://localhost:4310/checkout?variant=good-a11y",
      out: "results/snapshots/checkout-good",
      readySelector: defaultReadySelector,
      timeoutMs: defaultSnapshotTimeoutMs,
      headless: true
    });
  });

  it("parses optional snapshot arguments", () => {
    const { options } = parseSnapshotArgs([
      "--url",
      "http://localhost:4310/checkout?variant=no-label",
      "--out",
      "tmp/snapshot",
      "--ready-selector",
      "main",
      "--timeout-ms",
      "5000",
      "--headless",
      "false"
    ]);

    expect(options.readySelector).toBe("main");
    expect(options.timeoutMs).toBe(5000);
    expect(options.headless).toBe(false);
  });

  it("rejects unknown options and invalid values", () => {
    expect(() => parseSnapshotArgs(["--url", "not-a-url", "--out", "tmp"])).toThrow(
      "Invalid snapshot options"
    );
    expect(() =>
      parseSnapshotArgs([
        "--url",
        "http://localhost:4310",
        "--out",
        "tmp",
        "--headless",
        "maybe"
      ])
    ).toThrow("Invalid --headless value");
    expect(() => parseSnapshotArgs(["--url", "http://localhost:4310", "--bogus", "x"])).toThrow(
      "Unknown snapshot option"
    );
  });
});

describe("snapshot metadata", () => {
  it("captures the expected metadata shape", () => {
    const { options } = parseSnapshotArgs([
      "--url",
      "http://localhost:4310/checkout?variant=good-a11y",
      "--out",
      "results/snapshots/checkout-good"
    ]);
    const metadata = createSnapshotMetadata({
      options,
      finalUrl: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      viewport: {
        width: 1280,
        height: 720
      },
      timestamp: "2026-06-19T00:00:00.000Z",
      userAgent: "test-agent"
    });

    expect(metadata).toEqual({
      url: "http://localhost:4310/checkout?variant=good-a11y",
      finalUrl: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      timestamp: "2026-06-19T00:00:00.000Z",
      viewport: {
        width: 1280,
        height: 720
      },
      readySelector: defaultReadySelector,
      timeoutMs: defaultSnapshotTimeoutMs,
      userAgent: "test-agent"
    });
  });
});
