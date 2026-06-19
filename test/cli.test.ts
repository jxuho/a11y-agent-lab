import { describe, expect, it, vi } from "vitest";

import { getCommandMessage, getHelpText, getVersionText, runCli } from "../src/cli.js";

describe("CLI skeleton", () => {
  it("prints help text with planned commands", () => {
    const helpText = getHelpText();

    expect(helpText).toContain("snapshot");
    expect(helpText).toContain("--url <url>");
    expect(helpText).toContain("--out <output-directory>");
    expect(helpText).toContain("run");
    expect(helpText).toContain("experiment");
  });

  it("prints the current scaffold version", () => {
    expect(getVersionText()).toBe("a11y-agent-lab 0.1.0");
  });

  it("returns a clear placeholder message for command skeletons", () => {
    expect(getCommandMessage("run")).toContain("intentionally out of scope");
    expect(getCommandMessage("experiment")).toContain("intentionally out of scope");
  });

  it("returns success for help", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(runCli(["--help"])).resolves.toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("A11y Agent Lab"));

    logSpy.mockRestore();
  });

  it("returns success for snapshot help", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(runCli(["snapshot", "--help"])).resolves.toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Snapshot options"));

    logSpy.mockRestore();
  });
});
