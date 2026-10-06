import type { Database, Json } from "../integrations/supabase/types";

export type TraceSessionRow = {
  session_id: string;
  token_hash: string;
  version: string;
  stage: string;
  status: "active" | "completed" | "restarted" | "error";
  created_at: string;
  updated_at: string;
  snapshot_at: string;
  completed_at: string | null;
  snapshot: Json;
  last_error: Json | null;
};

export type TraceEventRow = {
  id: string;
  session_id: string;
  event_key: string;
  attempt_id: string | null;
  source: "browser" | "server";
  event_type: string;
  stage: string;
  occurred_at: string;
  recorded_at: string;
  payload: Json;
};

export type ModelCallRow = {
  id: string;
  session_id: string;
  attempt_id: string;
  provider: "jev" | "gemini";
  operation: string;
  configured_model: string;
  response_model: string | null;
  status: "started" | "succeeded" | "failed";
  request: Json;
  response: Json | null;
  output: Json | null;
  usage: Json | null;
  http_status: number | null;
  duration_ms: number | null;
  error: Json | null;
  started_at: string;
  completed_at: string | null;
};

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

// Extend generated Supabase types for the separately checked-in logging migration.
export type TraceDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      adaptive_assessment_traces: Table<TraceSessionRow, "session_id" | "token_hash" | "version" | "stage">;
      adaptive_assessment_events: Table<TraceEventRow, "session_id" | "event_key" | "source" | "event_type" | "stage">;
      adaptive_model_calls: Table<ModelCallRow, "session_id" | "attempt_id" | "provider" | "operation" | "configured_model" | "request">;
    };
  };
};
