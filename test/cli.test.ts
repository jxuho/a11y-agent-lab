import { describe, expect, it, vi } from "vitest";

import { getCommandMessage, getHelpText, getVersionText, runCli } from "../src/cli.js";

describe("CLI skeleton", () => {
  it("prints help text with planned commands", () => {
    const helpText = getHelpText();

    expect(helpText).toContain("snapshot");
    expect(helpText).toContain("run");
    expect(helpText).toContain("experiment");
  });

  it("prints the current scaffold version", () => {
    expect(getVersionText()).toBe("a11y-agent-lab 0.1.0");
  });

  it("returns a clear placeholder message for command skeletons", () => {
    expect(getCommandMessage("snapshot")).toContain("v0.1 command skeleton");
    expect(getCommandMessage("run")).toContain("intentionally out of scope");
    expect(getCommandMessage("experiment")).toContain("intentionally out of scope");
  });

  it("returns success for help", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(runCli(["--help"])).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("A11y Agent Lab"));

    logSpy.mockRestore();
  });
});
