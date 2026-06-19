export interface SerializedError {
  errorName: string;
  errorMessage: string;
  errorStack?: string;
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      errorName: error.name || "Error",
      errorMessage: getHelpfulErrorMessage(error),
      errorStack: shouldIncludeStack(error.stack) ? error.stack : undefined
    };
  }

  return {
    errorName: "NonError",
    errorMessage: String(error)
  };
}

function getHelpfulErrorMessage(error: Error): string {
  const message = error.message || String(error);

  if (message.includes("ERR_CONNECTION_REFUSED")) {
    return `${message}\nHint: the fixture server may not be running. Start it with \`npm run fixture:checkout\`.`;
  }

  if (message.includes("Timeout") || message.includes("waiting for selector")) {
    return `${message}\nHint: check that the page exposes the ready selector before the timeout.`;
  }

  if (message.includes("strict mode violation") || message.includes("Unexpected token")) {
    return `${message}\nHint: check selector syntax and whether the snapshot root matches exactly one useful region.`;
  }

  return message;
}

function shouldIncludeStack(stack: string | undefined): stack is string {
  if (!stack) {
    return false;
  }

  return !/(api[_-]?key|token|secret|password)=/i.test(stack);
}
