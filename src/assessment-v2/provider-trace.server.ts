import type { Json } from "../integrations/supabase/types.ts";

export interface ModelCallSpec {
  provider: "jev" | "gemini";
  operation: string;
  configured_model: string;
  request: unknown;
}

export interface ModelCallFinish {
  status: "succeeded" | "failed";
  response_model: string | null;
  response: unknown;
  output: unknown;
  usage: unknown;
  http_status: number | null;
  duration_ms: number;
  error: unknown;
  completed_at: string;
}

export interface ModelCallRecorder {
  start(spec: ModelCallSpec): Promise<string>;
  finish(id: string, data: ModelCallFinish): Promise<void>;
}

export class AssessmentLogError extends Error {
  constructor() {
    super("We could not save your assessment progress securely. Please try again.");
    this.name = "AssessmentLogError";
  }
}

export function errorDetails(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack ?? null }
    : { name: "Error", message: String(error), stack: null };
}

/** Headers, credentials and the browser capability token never enter trace payloads. */
export function traceJson(value: unknown, secrets: readonly string[] = []): Json {
  const redact = (text: string) => secrets.filter(Boolean).reduce((out, secret) => out.split(secret).join("[REDACTED]"), text);
  const walk = (item: unknown): Json => {
    if (item === null || item === undefined) return null;
    if (typeof item === "string") return redact(item);
    if (typeof item === "boolean") return item;
    if (typeof item === "number") return Number.isFinite(item) ? item : null;
    if (Array.isArray(item)) return item.map(walk);
    if (typeof item === "object") return Object.fromEntries(Object.entries(item).map(([key, child]) => [key,
      /^(traceToken|authorization|cookie|set-cookie|api[_-]?key|x-goog-api-key|service[_-]?role[_-]?key)$/i.test(key) ? "[REDACTED]" : walk(child),
    ]));
    return String(item);
  };
  return walk(value);
}

/** Log the exact request body before network I/O and preserve the raw response,
 * including HTTP failures, invalid JSON and provider-output validation failures. */
export async function recordedModelCall<T>(
  spec: ModelCallSpec,
  recorder: ModelCallRecorder | undefined,
  run: (capture: (response: Response) => Promise<void>) => Promise<T>,
): Promise<T> {
  const id = recorder ? await recorder.start(spec) : null;
  const started = Date.now();
  let responseData: unknown = null;
  let httpStatus: number | null = null;
  let responseModel: string | null = null;
  let usage: unknown = null;
  const capture = async (response: Response) => {
    httpStatus = response.status;
    if (!recorder) return;
    const raw = await response.clone().text();
    let body: Record<string, unknown> | null = null;
    try { body = JSON.parse(raw) as Record<string, unknown>; } catch { /* retain non-JSON errors verbatim */ }
    responseData = { raw, body };
    if (body && typeof body === "object") {
      const model = body['modelVersion'] ?? body['model'];
      responseModel = typeof model === "string" ? model : null;
      usage = body['usageMetadata'] ?? body['usage'] ?? null;
    }
  };
  let output: T;
  try {
    output = await run(capture);
  } catch (error) {
    if (recorder && id) await recorder.finish(id, {
      status: "failed", response: responseData, output: null, response_model: responseModel,
      usage, http_status: httpStatus, duration_ms: Date.now() - started,
      error: errorDetails(error), completed_at: new Date().toISOString(),
    });
    throw error;
  }
  if (recorder && id) await recorder.finish(id, {
    status: "succeeded", response: responseData, output, response_model: responseModel,
    usage, http_status: httpStatus, duration_ms: Date.now() - started,
    error: null, completed_at: new Date().toISOString(),
  });
  return output;
}
