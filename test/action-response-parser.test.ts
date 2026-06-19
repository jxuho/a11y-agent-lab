import { describe, expect, it } from "vitest";

import { parseModelActionResponse } from "../src/models/actionParser.js";

describe("model action response parser", () => {
  it("accepts a valid finish action", () => {
    expect(parseModelActionResponse('{ "type": "finish", "answer": "done" }')).toEqual({
      ok: true,
      action: {
        type: "finish",
        answer: "done"
      },
      rawText: '{ "type": "finish", "answer": "done" }'
    });
  });

  it("accepts a valid click action", () => {
    const result = parseModelActionResponse('\n{ "type": "click", "ref": "dom-1" }\n');

    expect(result).toEqual({
      ok: true,
      action: {
        type: "click",
        ref: "dom-1"
      },
      rawText: '\n{ "type": "click", "ref": "dom-1" }\n'
    });
  });

  it("accepts a valid type action", () => {
    const result = parseModelActionResponse(
      '{ "type": "type", "ref": "dom-2", "text": "Jordan Lee", "clear": false }'
    );

    expect(result).toMatchObject({
      ok: true,
      action: {
        type: "type",
        ref: "dom-2",
        text: "Jordan Lee",
        clear: false
      }
    });
  });

  it("rejects malformed JSON", () => {
    const result = parseModelActionResponse('{ "type": "finish", }');

    expect(result).toMatchObject({
      ok: false,
      errorName: "MalformedJsonModelResponseError"
    });
    expect(result.errorMessage).toContain("not valid JSON");
  });

  it("rejects markdown-fenced JSON", () => {
    const result = parseModelActionResponse('```json\n{ "type": "finish" }\n```');

    expect(result).toMatchObject({
      ok: false,
      errorName: "MarkdownModelResponseError"
    });
    expect(result.errorMessage).toContain("without markdown code fences");
  });

  it("rejects prose-wrapped JSON", () => {
    const result = parseModelActionResponse('Here is the action: { "type": "finish" }');

    expect(result).toMatchObject({
      ok: false,
      errorName: "JsonObjectModelResponseError"
    });
    expect(result.errorMessage).toContain("no prose before or after");
  });

  it("rejects unsupported action types", () => {
    const result = parseModelActionResponse('{ "type": "evaluate", "script": "alert(1)" }');

    expect(result).toMatchObject({
      ok: false,
      errorName: "InvalidActionModelResponseError"
    });
    expect(result.errorMessage).toContain("Invalid discriminator value");
  });

  it("rejects multiple JSON objects", () => {
    const result = parseModelActionResponse('{ "type": "finish" }\n{ "type": "finish" }');

    expect(result).toMatchObject({
      ok: false,
      errorName: "MalformedJsonModelResponseError"
    });
  });

  it("rejects JSON arrays", () => {
    const result = parseModelActionResponse('[{ "type": "finish" }]');

    expect(result).toMatchObject({
      ok: false,
      errorName: "JsonObjectModelResponseError"
    });
    expect(result.errorMessage).toContain("single JSON object");
  });

  it("surfaces action schema validation errors clearly", () => {
    const result = parseModelActionResponse('{ "type": "click", "ref": "[data-test=x]" }');

    expect(result).toMatchObject({
      ok: false,
      errorName: "InvalidActionModelResponseError"
    });
    expect(result.errorMessage).toContain("ref:");
    expect(result.errorMessage).toContain("stable observer ref");
  });
});
