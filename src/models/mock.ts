import type { ModelAdapter, ModelRequest, ModelResponse } from "./adapter.js";

export class MockModelQueueExhaustedError extends Error {
  constructor(adapterName: string) {
    super(`Mock model adapter "${adapterName}" has no queued responses remaining.`);
    this.name = "MockModelQueueExhaustedError";
  }
}

export class MockModelAdapter implements ModelAdapter {
  readonly name: string;
  private readonly responseQueue: string[];
  readonly requests: ModelRequest[] = [];

  constructor(options: { name?: string; responses?: string[] } = {}) {
    this.name = options.name ?? "mock";
    this.responseQueue = [...(options.responses ?? [])];
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push(request);

    const text = this.responseQueue.shift();

    if (text === undefined) {
      throw new MockModelQueueExhaustedError(this.name);
    }

    return {
      text,
      raw: {
        provider: this.name,
        queuedResponseIndex: this.requests.length - 1
      }
    };
  }

  get remainingResponses(): number {
    return this.responseQueue.length;
  }
}
