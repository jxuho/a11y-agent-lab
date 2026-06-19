import { describe, expect, it } from "vitest";

import {
  calculateCdpAxStats,
  createCdpAxSummary,
  isInteractiveRole,
  type CdpAxTree
} from "../src/observers/cdpAx.js";

const sampleTree: CdpAxTree = {
  nodes: [
    {
      nodeId: "1",
      role: {
        type: "internalRole",
        value: "RootWebArea"
      },
      name: {
        type: "computedString",
        value: "Checkout"
      },
      ignored: false,
      childIds: ["2", "3", "4", "5", "6", "7"]
    },
    {
      nodeId: "2",
      role: {
        type: "role",
        value: "button"
      },
      name: {
        type: "computedString",
        value: "Place order"
      },
      ignored: false,
      properties: [
        {
          name: "disabled",
          value: {
            type: "boolean",
            value: false
          }
        },
        {
          name: "focused",
          value: {
            type: "boolean",
            value: true
          }
        }
      ]
    },
    {
      nodeId: "3",
      role: {
        type: "role",
        value: "textbox"
      },
      name: {
        type: "computedString",
        value: ""
      },
      ignored: false
    },
    {
      nodeId: "4",
      role: {
        type: "role",
        value: "link"
      },
      name: {
        type: "computedString",
        value: "Apply"
      },
      ignored: false
    },
    {
      nodeId: "5",
      role: {
        type: "role",
        value: "button"
      },
      name: {
        type: "computedString",
        value: "Apply"
      },
      ignored: false
    },
    {
      nodeId: "6",
      role: {
        type: "role",
        value: "button"
      },
      name: {
        type: "computedString",
        value: "Hidden"
      },
      ignored: true
    },
    {
      nodeId: "7",
      role: {
        type: "role",
        value: "heading"
      },
      name: {
        type: "computedString",
        value: "Shipping details"
      },
      ignored: false,
      properties: [
        {
          name: "level",
          value: {
            type: "integer",
            value: 2
          }
        }
      ]
    }
  ]
};

describe("CDP AX observer normalization", () => {
  it("creates the expected summary shape from raw AX nodes", () => {
    const summary = createCdpAxSummary({
      tree: sampleTree,
      url: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      timestamp: "2026-06-19T00:00:00.000Z"
    });

    expect(summary).toMatchObject({
      mode: "cdp-ax",
      url: "http://localhost:4310/checkout?variant=good-a11y",
      title: "A11y Agent Lab - Checkout Fixture",
      timestamp: "2026-06-19T00:00:00.000Z",
      stats: {
        totalNodeCount: 7,
        ignoredNodeCount: 1,
        nonIgnoredNodeCount: 6,
        interactiveNodeCount: 4,
        unnamedInteractiveNodeCount: 1,
        duplicateInteractiveNameCount: 1
      }
    });
    expect(summary.nodes[0]).toEqual({
      nodeId: "1",
      role: "RootWebArea",
      name: "Checkout",
      description: "",
      value: "",
      ignored: false,
      childIds: ["2", "3", "4", "5", "6", "7"],
      properties: {}
    });
    expect(summary.nodes[1].properties).toEqual({
      disabled: false,
      focused: true
    });
    expect(summary.nodes[6].properties).toEqual({
      level: 2
    });
  });

  it("detects interactive roles conservatively", () => {
    expect(isInteractiveRole("button")).toBe(true);
    expect(isInteractiveRole("link")).toBe(true);
    expect(isInteractiveRole("textbox")).toBe(true);
    expect(isInteractiveRole("checkbox")).toBe(true);
    expect(isInteractiveRole("RootWebArea")).toBe(false);
    expect(isInteractiveRole("heading")).toBe(false);
  });

  it("counts unnamed interactive nodes and duplicate interactive names", () => {
    const summary = createCdpAxSummary({
      tree: sampleTree,
      url: "http://localhost:4310/checkout?variant=duplicate-names",
      title: "Checkout"
    });

    expect(summary.stats.unnamedInteractiveNodeCount).toBe(1);
    expect(summary.stats.duplicateInteractiveNameCount).toBe(1);
  });

  it("calculates stats from normalized nodes without launching a browser", () => {
    const summary = createCdpAxSummary({
      tree: sampleTree,
      url: "http://localhost:4310/checkout?variant=no-label",
      title: "Checkout"
    });

    expect(calculateCdpAxStats(summary.nodes)).toEqual(summary.stats);
  });
});
