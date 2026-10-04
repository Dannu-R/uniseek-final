// Langfuse tracing for Claude API calls — METRICS ONLY.
//
// Records model, token usage, latency, feature and success/failure for each call so
// API-key spend can be broken down in Langfuse. Deliberately records NO prompt or
// response text: prompts carry students' (often minors') profiles and activities.
//
// When Langfuse isn't configured (no LANGFUSE_* keys → instrumentation.ts registers
// nothing), the tracer is a no-op and this just runs the call.

import { startActiveObservation } from "@langfuse/tracing";

export type ClaudeFeature = "activity-classifier" | "college-insight";

interface ClaudeResponseLike {
  model?: string;
  stop_reason?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
}

// Langfuse's Anthropic price definitions key on input / output / cache_* token counts.
function usageDetails(usage: NonNullable<ClaudeResponseLike["usage"]>): Record<string, number> {
  const out: Record<string, number> = { input: usage.input_tokens, output: usage.output_tokens };
  if (usage.cache_read_input_tokens != null) out.cache_read_input_tokens = usage.cache_read_input_tokens;
  if (usage.cache_creation_input_tokens != null) out.cache_creation_input_tokens = usage.cache_creation_input_tokens;
  return out;
}

export function traceClaudeCall<T extends ClaudeResponseLike>(
  feature: ClaudeFeature,
  model: string,
  call: () => Promise<T>,
): Promise<T> {
  return startActiveObservation(
    `claude:${feature}`,
    async (generation) => {
      generation.update({ model, metadata: { feature } });
      try {
        const res = await call();
        generation.update({
          model: res.model ?? model,
          ...(res.usage ? { usageDetails: usageDetails(res.usage) } : {}),
          metadata: { feature, stopReason: res.stop_reason ?? null },
        });
        return res;
      } catch (err) {
        generation.update({ level: "ERROR", statusMessage: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },
    { asType: "generation" },
  );
}
