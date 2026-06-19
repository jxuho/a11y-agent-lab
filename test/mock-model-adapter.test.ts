import { describe, expect, it } from "vitest";

import { MockModelAdapter, MockModelQueueExhaustedError } from "../src/models/mock.js";
import {
  ModelAdapterNotConfiguredError,
  NotConfiguredModelAdapter
} from "../src/models/notConfigured.js";

const request = {
  systemPrompt: "System",
  userPrompt: "User",
  metadata: {
    test: true
  }
};

describe("mock model adapter", () => {
  it("returns queued responses in order and records requests", async () => {
    const adapter = new MockModelAdapter({
      name: "mock-test",
      responses: [
        '{ "type": "click", "ref": "dom-1" }',
        '{ "type": "finish", "answer": "done" }'
      ]
    });

    await expect(adapter.complete(request)).resolves.toMatchObject({
      text: '{ "type": "click", "ref": "dom-1" }',
      raw: {
        provider: "mock-test",
        queuedResponseIndex: 0
      }
    });
    await expect(adapter.complete(request)).resolves.toMatchObject({
      text: '{ "type": "finish", "answer": "done" }',
      raw: {
        queuedResponseIndex: 1
      }
    });
    expect(adapter.requests).toEqual([request, request]);
    expect(adapter.remainingResponses).toBe(0);
  });

  it("throws an explicit exhaustion error when the queue is empty", async () => {
    const adapter = new MockModelAdapter();

    await expect(adapter.complete(request)).rejects.toBeInstanceOf(MockModelQueueExhaustedError);
    await expect(adapter.complete(request)).rejects.toThrow(
      'Mock model adapter "mock" has no queued responses remaining.'
    );
  });
});

describe("not configured model adapter", () => {
  it("throws a clear configuration error without using credentials or network calls", async () => {
    const adapter = new NotConfiguredModelAdapter("real-placeholder");

    await expect(adapter.complete(request)).rejects.toBeInstanceOf(ModelAdapterNotConfiguredError);
    await expect(adapter.complete(request)).rejects.toThrow("real-placeholder");
  });
});
