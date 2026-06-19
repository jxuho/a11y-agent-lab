export interface ModelRequest {
  systemPrompt: string;
  userPrompt: string;
  metadata?: Record<string, unknown>;
}

export interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ModelResponse {
  text: string;
  usage?: ModelUsage;
  raw?: unknown;
}

export interface ModelAdapter {
  readonly name: string;
  complete(request: ModelRequest): Promise<ModelResponse>;
}
