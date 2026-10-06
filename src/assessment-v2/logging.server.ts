import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../integrations/supabase/client.server";
import { AssessmentTrace, type TraceStore } from "./trace-runtime.server.ts";
import { AssessmentLogError } from "./provider-trace.server.ts";
import type { TraceDatabase } from "./trace-types.ts";
import type { AssessmentSession } from "./types.ts";

function checked(error: unknown) {
  if (error) {
    console.error("Assessment log storage write failed");
    throw new AssessmentLogError();
  }
}

export function supabaseTraceStore(db: SupabaseClient<TraceDatabase>): TraceStore {
  return {
    async open(row) {
      // A racing second request cannot replace the existing capability hash.
      const inserted = await db.from("adaptive_assessment_traces").upsert(row, { onConflict: "session_id", ignoreDuplicates: true });
      checked(inserted.error);
      const existing = await db.from("adaptive_assessment_traces").select("*").eq("session_id", row.session_id).single();
      checked(existing.error);
      if (!existing.data) throw new AssessmentLogError();
      return existing.data;
    },
    async snapshot(row, source) {
      const { session_id, token_hash, created_at, ...update } = row;
      let query = db.from("adaptive_assessment_traces").update(update).eq("session_id", session_id).eq("token_hash", token_hash);
      if (source === "browser") {
        // Late autosaves cannot erase a server-generated stage or completed result.
        query = query.eq("stage", row.stage).in("status", ["active", "error"]).lte("snapshot_at", row.snapshot_at);
      } else {
        const stages = ["opening", "probes", "bridge", "finalists", "complete"];
        query = query.in("stage", stages.slice(0, stages.indexOf(row.stage) + 1));
        if (row.status !== "completed") query = query.neq("status", "completed");
      }
      checked((await query).error);
    },
    async events(rows) {
      checked((await db.from("adaptive_assessment_events").upsert(rows, { onConflict: "session_id,event_key", ignoreDuplicates: true })).error);
    },
    async startCall(row) { checked((await db.from("adaptive_model_calls").insert(row)).error); },
    async finishCall(id, sessionId, data) {
      checked((await db.from("adaptive_model_calls").update(data).eq("id", id).eq("session_id", sessionId)).error);
    },
    async completed(sessionId, data) {
      checked((await db.from("assessment_sessions").upsert({ session_key: sessionId, ...data }, { onConflict: "session_key" })).error);
    },
  };
}

export function assessmentLoggingEnabled() { return process.env['ASSESSMENT_LOGGING_ENABLED'] === "true"; }

export function assessmentTrace(session: AssessmentSession): AssessmentTrace | undefined {
  if (!assessmentLoggingEnabled()) return undefined;
  if (!process.env['SUPABASE_SERVICE_ROLE_KEY'] || !process.env['SUPABASE_URL']) {
    console.error("Assessment logging needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server");
    throw new AssessmentLogError();
  }
  const secrets = ["JEV_API_KEY", "GEMINI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PUBLISHABLE_KEY"].map((name) => process.env[name] ?? "");
  return new AssessmentTrace(supabaseTraceStore(supabaseAdmin as unknown as SupabaseClient<TraceDatabase>), session, secrets);
}
