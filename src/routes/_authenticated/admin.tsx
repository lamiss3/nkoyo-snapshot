import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Logo } from "@/components/brand/Logo";
import { AssessmentLogPanel } from "@/components/snapshot/AssessmentLogPanel";
import { EmailJourneyPanel } from "@/components/snapshot/EmailJourneyPanel";
import { supabase } from "@/integrations/supabase/client";
import { dimensions, questions } from "@/config/questions";
import { questionPatterns } from "@/config/results";
import { problemById } from "@/assessment-v2/problem-bank";
import type { ProblemId } from "@/assessment-v2/types";
import type { TraceDatabase } from "@/assessment-v2/trace-types";

const traceDb = supabase as unknown as SupabaseClient<TraceDatabase>;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Snapshot admin | Iban Ison Solutions" },
      { name: "description", content: "Private dashboard for Snapshot activity." },
      { property: "og:title", content: "Snapshot admin" },
      { property: "og:description", content: "Private dashboard for Snapshot activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

interface SessionRow {
  id: string;
  session_key: string;
  completed_at: string | null;
  summary_key: string | null;
  result_patterns: unknown;
}

interface LeadRow {
  id: string;
  session_key: string | null;
  created_at: string;
  first_name: string;
  email: string;
  organization: string | null;
  role_title: string | null;
  challenge: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
}

function patternLabel(key: string) {
  if (key in problemById) return problemById[key as ProblemId].name;
  const [dimensionId, tail] = key.split(":");
  const dimension = dimensions.find((d) => d.id === dimensionId)?.name ?? dimensionId;
  const question = questions.find((q) => q.id === tail);
  const headline = question ? questionPatterns[question.id]?.headline : tail;
  return `${dimension} — ${headline ?? tail}`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join(
    "\n",
  );
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const accessQuery = useQuery({
    queryKey: ["admin", "access", user.id],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw error;
      return data?.some((entry) => entry.role === "admin" || entry.role === "staff") ?? false;
    },
  });
  const accessAllowed = accessQuery.data === true && !accessQuery.error;

  const sessionsQuery = useQuery({
    queryKey: ["admin", "sessions"],
    enabled: accessAllowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_sessions")
        .select("id, session_key, completed_at, summary_key, result_patterns")
        .order("completed_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });

  const leadsQuery = useQuery({
    queryKey: ["admin", "leads"],
    enabled: accessAllowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, session_key, created_at, first_name, email, organization, role_title, challenge, marketing_consent, marketing_consent_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["admin", "events"],
    enabled: accessAllowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("snapshot_events")
        .select("event_type, created_at")
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const adaptiveStartsQuery = useQuery({
    queryKey: ["admin", "adaptive-start-count"],
    enabled: accessAllowed,
    queryFn: async () => {
      const { count, error } = await traceDb.from("adaptive_assessment_traces")
        .select("session_id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const loading = accessQuery.isPending || (accessAllowed && (sessionsQuery.isLoading || leadsQuery.isLoading || eventsQuery.isLoading || adaptiveStartsQuery.isLoading));
  const error = accessQuery.error ?? (accessAllowed ? sessionsQuery.error ?? leadsQuery.error ?? eventsQuery.error ?? adaptiveStartsQuery.error : null);

  const sessions = sessionsQuery.data ?? [];
  const leads = leadsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const sessionsByKey = new Map(sessions.map((session) => [session.session_key, session]));
  const focusForLead = (lead: LeadRow) => {
    const key = lead.session_key ? sessionsByKey.get(lead.session_key)?.summary_key : null;
    return key ? patternLabel(key) : "—";
  };

  const completions = sessions.filter((s) => s.completed_at).length;
  const starts = events.filter((e) => e.event_type === "snapshot_started").length + (adaptiveStartsQuery.data ?? 0);
  const bookingClicks = events.filter((e) => e.event_type === "booking_cta_click").length;
  const optIns = leads.filter((l) => l.marketing_consent).length;

  const patternCounts = new Map<string, number>();
  for (const session of sessions) {
    const keys = Array.isArray(session.result_patterns) ? (session.result_patterns as string[]) : [];
    for (const key of keys) patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
  }
  const topPatterns = [...patternCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const stats = [
    { label: "Snapshots started", value: starts },
    { label: "Snapshots completed", value: completions },
    { label: "Booking CTA clicks", value: bookingClicks },
    { label: "Marketing opt-ins", value: optIns },
  ];

  return (
    <div className="min-h-dvh bg-blush">
      <header className="border-b border-border/60 bg-background/90">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Logo />
            <span className="hidden text-sm font-bold uppercase tracking-widest text-muted-foreground sm:inline">
              Snapshot admin
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        {!accessQuery.isPending && !accessQuery.error && !accessAllowed && (
          <section role="status" className="card-elevated p-7">
            <h1 className="text-2xl font-black">Your account is created. Dashboard access is pending.</h1>
            <p className="mt-3 text-sm text-muted-foreground">Signed in as {user.email ?? "your account"}.</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              An administrator needs to grant this account the staff or admin role before you can read assessment records.
              Signing up does not grant that permission. Your assessments may already be saved; they are hidden until access is granted.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Share your account email with the administrator. This page checks access every 10 seconds.</p>
            <button type="button" onClick={() => void accessQuery.refetch()} disabled={accessQuery.isFetching}
              className="mt-5 rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-50">Check access</button>
          </section>
        )}
        {loading && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading dashboard…
          </div>
        )}

        {error && (
          <div role="alert" className="card-elevated p-6">
            <h2 className="text-lg font-extrabold">We couldn't load this data</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account may not have the admin or staff role yet. An administrator needs to grant
              it before this dashboard shows data.
            </p>
          </div>
        )}

        {accessAllowed && !loading && !error && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="card-elevated p-6">
                  <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 font-display text-4xl font-black">{stat.value}</p>
                </div>
              ))}
            </section>

            <section className="mt-10 card-elevated p-7">
              <h2 className="text-xl font-black">Most common patterns</h2>
              {topPatterns.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No completed snapshots yet. Patterns appear here once people finish the
                  reflection.
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {topPatterns.map(([key, count]) => (
                    <li key={key} className="flex items-center justify-between gap-4 text-sm">
                      <span className="min-w-0 font-medium">{patternLabel(key)}</span>
                      <span className="shrink-0 rounded-full bg-lime px-3 py-1 font-bold text-lime-foreground">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-10 card-elevated p-7">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <h2 className="min-w-0 text-xl font-black">Leads</h2>
                <button
                  type="button"
                  onClick={() =>
                    download(
                      `snapshot-leads-${new Date().toISOString().slice(0, 10)}.csv`,
                      toCsv(leads as unknown as Record<string, unknown>[]),
                    )
                  }
                  disabled={leads.length === 0}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy px-5 py-2 text-sm font-bold text-navy-foreground disabled:opacity-50"
                >
                  <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
                </button>
              </div>

              {leads.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No leads submitted yet.</p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Snapshot focus</th>
                        <th className="py-2 pr-4">Organization</th>
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2 pr-4">Marketing</th>
                        <th className="py-2">Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.id} className="border-b border-border/60">
                          <td className="py-2 pr-4 font-medium">{lead.first_name || "—"}</td>
                          <td className="py-2 pr-4">{lead.email}</td>
                          <td className="py-2 pr-4">{focusForLead(lead)}</td>
                          <td className="py-2 pr-4">{lead.organization ?? "—"}</td>
                          <td className="py-2 pr-4">{lead.role_title ?? "—"}</td>
                          <td className="py-2 pr-4">
                            {lead.marketing_consent ? "Opted in" : "No"}
                          </td>
                          <td className="py-2">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="mt-10 card-elevated p-7">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <h2 className="min-w-0 text-xl font-black">Completed snapshots</h2>
                <button
                  type="button"
                  onClick={() =>
                    download(
                      `snapshot-sessions-${new Date().toISOString().slice(0, 10)}.csv`,
                      toCsv(
                        sessions.map((s) => ({
                          session_key: s.session_key,
                          completed_at: s.completed_at,
                          summary: s.summary_key,
                          patterns: Array.isArray(s.result_patterns)
                            ? (s.result_patterns as string[]).join(" | ")
                            : "",
                        })),
                      ),
                    )
                  }
                  disabled={sessions.length === 0}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy px-5 py-2 text-sm font-bold text-navy-foreground disabled:opacity-50"
                >
                  <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
                </button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {sessions.length === 0
                  ? "No completed snapshots yet."
                  : `${sessions.length} recorded snapshots. Individual answers stay private and are never shown publicly.`}
              </p>
            </section>
          </>
        )}
        {accessAllowed && !error && <AssessmentLogPanel />}
        {accessAllowed && !error && <EmailJourneyPanel />}
      </main>
    </div>
  );
}
