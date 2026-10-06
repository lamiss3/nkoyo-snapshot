import { createHash, timingSafeEqual } from "node:crypto";
import { advanceAssessment, type AssessmentServices } from "./orchestrator.ts";
import { buildAdaptivePresentation } from "./result-content.ts";
import { AssessmentLogError, errorDetails, traceJson, type ModelCallRecorder, type ModelCallSpec, type ModelCallFinish } from "./provider-trace.server.ts";
import type { AssessmentSession } from "./types.ts";
import type { TraceSessionRow, TraceEventRow, ModelCallRow } from "./trace-types.ts";
import type { Json } from "../integrations/supabase/types.ts";

export interface TraceStore {
  open(row: TraceSessionRow): Promise<TraceSessionRow>;
  snapshot(row: TraceSessionRow, source: "browser" | "server"): Promise<void>;
  events(rows: TraceEventRow[]): Promise<void>;
  startCall(row: ModelCallRow): Promise<void>;
  finishCall(id: string, sessionId: string, data: Partial<ModelCallRow>): Promise<void>;
  completed(sessionId: string, data: { completed_at: string; answers: Json; followup_answers: Json; result_patterns: Json; summary_key: string | null }): Promise<void>;
}

const now = () => new Date().toISOString();
const digest = (data: string) => createHash("sha256").update(data).digest("hex");

export class AssessmentTrace {
  private store: TraceStore;
  private session: AssessmentSession;
  private secrets: readonly string[];
  constructor(store: TraceStore, session: AssessmentSession, secrets: readonly string[] = []) {
    this.store = store;
    this.session = session;
    this.secrets = secrets;
  }

  private clean(value: unknown) { return traceJson(value, [...this.secrets, this.session.traceToken ?? ""]); }

  private row(session: AssessmentSession, status: TraceSessionRow["status"]): TraceSessionRow {
    const { traceToken: _token, ...snapshot } = session;
    return {
      session_id: session.id, token_hash: digest(session.traceToken ?? ""), version: session.version,
      stage: session.stage, status, created_at: session.createdAt, updated_at: now(), snapshot_at: session.updatedAt,
      completed_at: session.result?.generatedAt ?? null, snapshot: this.clean(snapshot), last_error: null,
    };
  }

  async authorize(): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(this.session.traceToken ?? "")) throw new Error("Invalid assessment log token");
    const wanted = this.row(this.session, "active");
    const saved = await this.store.open(wanted);
    const a = Buffer.from(wanted.token_hash), b = Buffer.from(saved.token_hash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("This assessment log belongs to another session");
  }

  async event(type: string, payload: unknown, options: { source?: "browser" | "server"; attemptId?: string; occurredAt?: string; key?: string; stage?: string } = {}) {
    const occurredAt = options.occurredAt ?? now();
    const source = options.source ?? "server";
    const clean = this.clean(payload);
    const key = options.key ?? digest(JSON.stringify({ type, payload: clean, occurredAt, source, attempt: options.attemptId ?? null }));
    await this.store.events([{
      id: crypto.randomUUID(), session_id: this.session.id, event_key: key,
      attempt_id: options.attemptId ?? null, source, event_type: type, stage: options.stage ?? this.session.stage,
      occurred_at: occurredAt, recorded_at: now(), payload: clean,
    }]);
  }

  async checkpoint(session: AssessmentSession, source: "browser" | "server", action = "progress_saved", questionId?: string, attemptId?: string) {
    await this.authorize();
    const status = source === "server" && session.stage === "complete" ? "completed" : action === "session_restarted" ? "restarted" : "active";
    await this.store.snapshot(this.row(session, status), source);
    for (const event of session.events.filter((e) => e.type === "started" || e.type === "answer_submitted")) await this.event(event.type, event.details, {
      source: "browser", occurredAt: event.at, stage: event.stage, key: "browser:" + digest(JSON.stringify(event)),
    });
    const { traceToken: _token, ...snapshot } = session;
    await this.event(action, { questionId: questionId ?? null, snapshot }, {
      source, stage: session.stage, ...(attemptId ? { attemptId } : {}),
      key: `${source}:${action}:${digest(JSON.stringify({ snapshot, questionId: questionId ?? null, attemptId: attemptId ?? null }))}`,
    });
    if (source === "server" && session.result) await this.store.completed(session.id, {
      completed_at: session.result.generatedAt,
      answers: this.clean({ version: session.version, questions: session.questions, responses: session.answers }),
      followup_answers: this.clean({ report: buildAdaptivePresentation(session), result: session.result, evaluations: session.evaluations, events: session.events }),
      result_patterns: this.clean(session.result.priority), summary_key: session.result.priority[0] ?? null,
    });
  }

  recorder(attemptId: string): ModelCallRecorder {
    return {
      start: async (spec: ModelCallSpec) => {
        const id = crypto.randomUUID();
        await this.store.startCall({
          id, session_id: this.session.id, attempt_id: attemptId,
          provider: spec.provider, operation: spec.operation, configured_model: spec.configured_model,
          response_model: null, status: "started", request: this.clean(spec.request), response: null, output: null,
          usage: null, http_status: null, duration_ms: null, error: null, started_at: now(), completed_at: null,
        });
        return id;
      },
      finish: async (id: string, data: ModelCallFinish) => {
        await this.store.finishCall(id, this.session.id, {
          ...data, response: this.clean(data.response), output: this.clean(data.output), usage: this.clean(data.usage), error: this.clean(data.error),
        });
      },
    };
  }

  async failure(error: unknown, attemptId: string) {
    await this.event("advance_failed", errorDetails(error), { attemptId });
    const row = this.row(this.session, "error");
    row.last_error = this.clean(errorDetails(error));
    await this.store.snapshot(row, "server");
  }
}

/** Save all server decisions before returning a successful stage to the browser. */
export async function runTracedAdvance(session: AssessmentSession, services: AssessmentServices, trace?: AssessmentTrace, attemptId = crypto.randomUUID()) {
  if (!trace) return advanceAssessment(session, services);
  await trace.checkpoint(session, "server", "advance_started", undefined, attemptId);
  try {
    const next = await advanceAssessment(session, services);
    for (const event of next.events.slice(session.events.length)) await trace.event(event.type, event.details, {
      attemptId, stage: event.stage, occurredAt: event.at,
    });
    await trace.checkpoint(next, "server", "advance_completed", undefined, attemptId);
    return next;
  } catch (error) {
    try { await trace.failure(error, attemptId); } catch { throw new AssessmentLogError(); }
    throw error;
  }
}
