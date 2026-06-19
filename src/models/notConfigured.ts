import type { ModelAdapter, ModelRequest, ModelResponse } from "./adapter.js";

export class ModelAdapterNotConfiguredError extends Error {
  constructor(adapterName: string) {
    super(
      `Model adapter "${adapterName}" is not configured. Provide an opt-in provider adapter with environment-based credentials before using real model calls.`
    );
    this.name = "ModelAdapterNotConfiguredError";
  }
}

export class NotConfiguredModelAdapter implements ModelAdapter {
  readonly name: string;

  constructor(name = "not-configured") {
    this.name = name;
  }

  async complete(_request: ModelRequest): Promise<ModelResponse> {
    throw new ModelAdapterNotConfiguredError(this.name);
  }
}
