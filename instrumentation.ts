// Next.js instrumentation hook — runs once when the server starts.
//
// Turns on Langfuse tracing for Claude calls (lib/llmTrace.ts) only when its keys are
// set. Without LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY nothing is registered and
// tracing is a no-op. LANGFUSE_BASE_URL picks the region (e.g. https://us.cloud.langfuse.com).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return;

  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { LangfuseSpanProcessor } = await import("@langfuse/otel");

  const sdk = new NodeSDK({
    serviceName: "uniseek",
    // No auto-detected host/process attributes (host name, OS user, file paths) — we
    // only want call metrics in Langfuse.
    resourceDetectors: [],
    spanProcessors: [new LangfuseSpanProcessor({ environment: process.env.NODE_ENV })],
  });
  sdk.start();
}
