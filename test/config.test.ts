import { describe, expect, it } from "vitest";

import { appConfigSchema, snapshotConfigSchema } from "../src/config/schema.js";

describe("config schemas", () => {
  it("provides placeholder defaults for the app config", () => {
    expect(appConfigSchema.parse({})).toEqual({
      projectName: "a11y-agent-lab",
      snapshot: {
        outputDir: "artifacts/snapshots"
      }
    });
  });

  it("validates snapshot URLs when provided", () => {
    expect(() => snapshotConfigSchema.parse({ url: "not-a-url" })).toThrow();
    expect(snapshotConfigSchema.parse({ url: "http://localhost:3000" }).url).toBe(
      "http://localhost:3000"
    );
  });
});
