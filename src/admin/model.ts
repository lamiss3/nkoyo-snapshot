import type { Database } from "../integrations/supabase/types.ts";
import type { TraceSessionRow } from "../assessment-v2/trace-types.ts";

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type SavedAssessment = Omit<
  Database["public"]["Tables"]["assessment_sessions"]["Row"],
  "answers" | "followup_answers"
>;
export type Event = Pick<
  Database["public"]["Tables"]["snapshot_events"]["Row"],
  "id" | "session_key" | "event_type" | "created_at"
>;
export type TraceSummary = Pick<
  TraceSessionRow,
  "session_id" | "version" | "stage" | "status" | "created_at" | "updated_at" | "completed_at"
>;
export interface Assessment {
  id: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  status: string;
  stage: string;
  saved: SavedAssessment | undefined;
  trace: TraceSummary | undefined;
}

/** One row per saved session key, reconciling trace and final-result records. */
export function mergeAssessments(saved: SavedAssessment[], traces: TraceSummary[]): Assessment[] {
  const byId = new Map<string, Assessment>();
  for (const row of saved)
    byId.set(row.session_key, {
      id: row.session_key,
      startedAt: row.started_at,
      updatedAt: row.completed_at ?? row.started_at,
      completedAt: row.completed_at,
      status: row.completed_at ? "completed" : "active",
      stage: row.completed_at ? "complete" : "not recorded",
      saved: row,
      trace: undefined,
    });
  for (const trace of traces) {
    const prior = byId.get(trace.session_id);
    byId.set(trace.session_id, {
      id: trace.session_id,
      startedAt: trace.created_at,
      updatedAt: trace.updated_at,
      completedAt: trace.completed_at ?? prior?.completedAt ?? null,
      status: trace.completed_at || prior?.completedAt ? "completed" : trace.status,
      stage: trace.stage,
      saved: prior?.saved,
      trace,
    });
  }
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function uniqueContacts(leads: Lead[]) {
  const groups = new Map<string, Lead[]>();
  for (const lead of [...leads].sort(
    (a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  )) {
    const key = lead.email.trim().toLowerCase();
    const group = groups.get(key) ?? [];
    group.push(lead);
    groups.set(key, group);
  }
  return [...groups.values()].map((history) => ({ latest: history[0]!, history }));
}

export function withinDates(value: string, from: string, to: string) {
  const time = Date.parse(value);
  // Date inputs use the staff member's local calendar, including the entire end day.
  const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const endDate = to ? new Date(`${to}T00:00:00`) : null;
  if (endDate) endDate.setDate(endDate.getDate() + 1);
  return Number.isFinite(time) && time >= start && time < (endDate?.getTime() ?? Infinity);
}

export function exclusionSet(value: string, leads: Lead[]) {
  const tokens = new Set(
    value
      .split(/[\s,;]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  const ids = new Set(tokens);
  for (const lead of leads)
    if (tokens.has(lead.email.trim().toLowerCase()) && lead.session_key)
      ids.add(lead.session_key.toLowerCase());
  return ids;
}

export function dashboardMetrics(
  assessments: Assessment[],
  leads: Lead[],
  events: Event[],
  options: { from: string; to: string; excluded: string },
) {
  const excluded = exclusionSet(options.excluded, leads);
  const allowed = (id: string | null) => !id || !excluded.has(id.toLowerCase());
  const cohort = assessments.filter(
    (row) => allowed(row.id) && withinDates(row.startedAt, options.from, options.to),
  );
  const completed = cohort.filter((row) => row.completedAt).length;
  const filteredEvents = events.filter(
    (row) => allowed(row.session_key) && withinDates(row.created_at, options.from, options.to),
  );
  const filteredLeads = leads.filter(
    (row) =>
      allowed(row.session_key) &&
      !excluded.has(row.email.trim().toLowerCase()) &&
      withinDates(row.created_at, options.from, options.to),
  );
  const patterns = new Map<string, number>();
  for (const row of cohort.filter((row) => row.completedAt)) {
    const values = row.saved?.result_patterns;
    if (Array.isArray(values))
      for (const key of new Set(
        values.filter((value): value is string => typeof value === "string"),
      ))
        patterns.set(key, (patterns.get(key) ?? 0) + 1);
  }
  return {
    cohort,
    started: cohort.length,
    completed,
    completionRate: cohort.length ? completed / cohort.length : null,
    bookingClicks: filteredEvents.filter((row) => row.event_type === "booking_cta_click").length,
    rawStartEvents: filteredEvents.filter((row) => row.event_type === "snapshot_started").length,
    optIns: filteredLeads.filter((row) => row.marketing_consent).length,
    patterns: [...patterns].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]) {
  const headers = columns ?? Object.keys(rows[0] ?? {});
  if (!headers.length) return "";
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    // Protect spreadsheet exports against formulas in respondent-supplied fields.
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    headers.map(cell).join(","),
    ...rows.map((row) => headers.map((key) => cell(row[key])).join(",")),
  ].join("\r\n");
}

export function legacyAdminPath(hash: string): string | null {
  return (
    (
      {
        "#staff-accounts": "/admin/staff",
        "#leads": "/admin/leads",
        "#completed-snapshots": "/admin/assessments",
        "#assessment-logs": "/admin/assessments",
        "#assessment-logs-heading": "/admin/assessments",
        "#email-journeys": "/admin/email-journeys",
        "#email-journeys-title": "/admin/email-journeys",
      } as Record<string, string>
    )[hash] ?? null
  );
}
