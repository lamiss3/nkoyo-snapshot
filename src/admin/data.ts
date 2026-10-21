import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { TraceDatabase, TraceEventRow, ModelCallRow } from "@/assessment-v2/trace-types";
import type { ReportContact } from "@/assessment-v2/session-report";
import type { Lead, SavedAssessment, TraceSummary, Event } from "./model";
import type { EmailDatabase } from "@/assessment-v2/email-job-types";

const db = supabase as unknown as SupabaseClient<TraceDatabase>;
const emailDb = supabase as unknown as SupabaseClient<EmailDatabase>;
const traceFields =
  "session_id, version, stage, status, created_at, updated_at, completed_at" as const;

async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await page(offset, offset + 499);
    if (result.error) throw new Error(result.error.message);
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return rows;
  }
}

export const adminKeys = {
  sessions: ["admin", "sessions"] as const,
  leads: ["admin", "leads"] as const,
  traces: ["admin", "assessment-summaries"] as const,
  events: ["admin", "events"] as const,
};
const options = { staleTime: 60_000, refetchOnWindowFocus: true };
export function useSavedAssessments() {
  return useQuery({
    ...options,
    queryKey: adminKeys.sessions,
    queryFn: () =>
      allRows<SavedAssessment>((from, to) =>
        supabase
          .from("assessment_sessions")
          .select("id, session_key, started_at, completed_at, summary_key, result_patterns")
          .order("started_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}
export function useLeads() {
  return useQuery({
    ...options,
    queryKey: adminKeys.leads,
    queryFn: () =>
      allRows<Lead>((from, to) =>
        supabase
          .from("leads")
          .select(
            "id, session_key, created_at, first_name, email, organization, role_title, challenge, marketing_consent, marketing_consent_at",
          )
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}
export function useTraceSummaries() {
  return useQuery({
    ...options,
    queryKey: adminKeys.traces,
    queryFn: () =>
      allRows<TraceSummary>((from, to) =>
        db
          .from("adaptive_assessment_traces")
          .select(traceFields)
          .order("updated_at", { ascending: false })
          .order("session_id")
          .range(from, to),
      ),
  });
}
export function useRecordedEvents() {
  return useQuery({
    ...options,
    queryKey: adminKeys.events,
    queryFn: () =>
      allRows<Event>((from, to) =>
        supabase
          .from("snapshot_events")
          .select("id, session_key, event_type, created_at")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
  });
}

export function useEmailJourneyEvents(id: string | null) {
  return useQuery({
    ...options,
    queryKey: ["admin", "email-journey-events", id],
    enabled: Boolean(id),
    queryFn: () =>
      allRows((from, to) =>
        emailDb
          .from("email_journey_events")
          .select("id, event_type, details, created_at")
          .eq("journey_id", id!)
          .order("created_at")
          .order("id")
          .range(from, to),
      ),
  });
}

export async function loadAssessmentDetail(id: string) {
  const { data: session, error } =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ? await db
          .from("adaptive_assessment_traces")
          .select(`${traceFields}, snapshot, last_error`)
          .eq("session_id", id)
          .maybeSingle()
      : { data: null, error: null };
  if (error) throw error;
  // Legacy records need not have an adaptive trace. Do not fail the saved report.
  const [events, calls, contacts, saved] = await Promise.all([
    session
      ? allRows<TraceEventRow>((from, to) =>
          db
            .from("adaptive_assessment_events")
            .select("*")
            .eq("session_id", id)
            .order("recorded_at")
            .order("id")
            .range(from, to),
        )
      : Promise.resolve([]),
    session
      ? allRows<ModelCallRow>((from, to) =>
          db
            .from("adaptive_model_calls")
            .select("*")
            .eq("session_id", id)
            .order("started_at")
            .order("id")
            .range(from, to),
        )
      : Promise.resolve([]),
    allRows<ReportContact>((from, to) =>
      db
        .from("leads")
        .select(
          "email, first_name, organization, role_title, challenge, marketing_consent, created_at",
        )
        .eq("session_key", id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    supabase.from("assessment_sessions").select("*").eq("session_key", id).maybeSingle(),
  ]);
  if (saved.error) throw saved.error;
  return { session, events, calls, contacts, saved: saved.data };
}
