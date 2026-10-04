import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { LangfuseOtelSpanAttributes as A, setLangfuseTracerProvider } from "@langfuse/tracing";
import { traceClaudeCall } from "./llmTrace";

const exporter = new InMemorySpanExporter();

beforeAll(() => {
  setLangfuseTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }));
});
afterAll(() => setLangfuseTracerProvider(null));
beforeEach(() => exporter.reset());

const fakeResponse = {
  model: "claude-opus-5",
  stop_reason: "end_turn",
  usage: { input_tokens: 1200, output_tokens: 340, cache_read_input_tokens: 0, cache_creation_input_tokens: null },
  content: [{ type: "text", text: "SECRET STUDENT TEXT" }],
};

describe("traceClaudeCall", () => {
  it("returns the call's result unchanged", async () => {
    const res = await traceClaudeCall("activity-classifier", "claude-opus-5", async () => fakeResponse);
    expect(res).toBe(fakeResponse);
  });

  it("records one generation with model, token usage and feature — and no prompt or response text", async () => {
    await traceClaudeCall("college-insight", "claude-opus-5", async () => fakeResponse);
    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    const attrs = spans[0].attributes;
    expect(attrs[A.OBSERVATION_TYPE]).toBe("generation");
    expect(attrs[A.OBSERVATION_MODEL]).toBe("claude-opus-5");
    expect(JSON.parse(String(attrs[A.OBSERVATION_USAGE_DETAILS]))).toEqual({ input: 1200, output: 340, cache_read_input_tokens: 0 });
    expect(attrs[`${A.OBSERVATION_METADATA}.feature`]).toBe("college-insight"); // metadata is flattened per key
    expect(attrs[`${A.OBSERVATION_METADATA}.stopReason`]).toBe("end_turn");
    expect(attrs[A.OBSERVATION_INPUT]).toBeUndefined();
    expect(attrs[A.OBSERVATION_OUTPUT]).toBeUndefined();
    expect(JSON.stringify(attrs)).not.toContain("SECRET STUDENT TEXT");
  });

  it("marks the generation as an error and rethrows when the call fails", async () => {
    await expect(
      traceClaudeCall("activity-classifier", "claude-opus-5", async () => {
        throw new Error("overloaded");
      }),
    ).rejects.toThrow("overloaded");
    const attrs = exporter.getFinishedSpans()[0].attributes;
    expect(attrs[A.OBSERVATION_LEVEL]).toBe("ERROR");
    expect(attrs[A.OBSERVATION_STATUS_MESSAGE]).toBe("overloaded");
  });
});
