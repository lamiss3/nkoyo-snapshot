import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { TraceDatabase, TraceEventRow, ModelCallRow } from "@/assessment-v2/trace-types";
import { buildSessionReport, sessionReportMarkdown } from "@/assessment-v2/session-report";
import { AssessmentSessionReport } from "./AssessmentSessionReport";

const db = supabase as unknown as SupabaseClient<TraceDatabase>;
const buttonClass = "inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50";
const sessionFields = "session_id, version, stage, status, created_at, updated_at, completed_at" as const;
const date = (value: string) => new Date(value).toLocaleString();

function JsonDetails({ title, value }: { title: string; value: unknown }) {
  return <details className="mt-3 rounded-xl border border-border bg-card p-4">
    <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed">{JSON.stringify(value, null, 2)}</pre>
  </details>;
}

function exportJson(sessionId: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `assessment-${sessionId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportMarkdown(sessionId: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `nkoyo-assessment-${sessionId}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AssessmentLogPanel() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [searchError, setSearchError] = useState("");
  const sessions = useQuery({
    queryKey: ["admin", "assessment-traces", filter],
    refetchInterval: 10000,
    queryFn: async () => {
      let query = db.from("adaptive_assessment_traces").select(sessionFields).order("updated_at", { ascending: false }).limit(100);
      if (filter) query = query.eq("session_id", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  const detail = useQuery({
    queryKey: ["admin", "assessment-trace", selectedId],
    enabled: Boolean(selectedId),
    refetchInterval: 10000,
    queryFn: async () => {
      const id = selectedId!;
      const { data: session, error } = await db.from("adaptive_assessment_traces")
        .select(`${sessionFields}, snapshot, last_error`).eq("session_id", id).single();
      if (error) throw error;
      const events: TraceEventRow[] = [];
      const calls: ModelCallRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const result = await db.from("adaptive_assessment_events").select("*").eq("session_id", id)
          .order("recorded_at").order("id").range(offset, offset + 499);
        if (result.error) throw result.error;
        events.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 500) break;
      }
      for (let offset = 0; ; offset += 500) {
        const result = await db.from("adaptive_model_calls").select("*").eq("session_id", id)
          .order("started_at").order("id").range(offset, offset + 499);
        if (result.error) throw result.error;
        calls.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 500) break;
      }
      const contacts = [];
      for (let offset = 0; ; offset += 500) {
        const result = await db.from("leads")
          .select("email, first_name, organization, role_title, challenge, marketing_consent, created_at")
          .eq("session_key", id).order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
        if (result.error) throw result.error;
        contacts.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 500) break;
      }
      return { session, events, calls, contacts };
    },
  });
  const snapshot = detail.data?.session.snapshot;
  const result = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot['result'] : null;
  const report = detail.data ? buildSessionReport(detail.data) : null;

  return <section className="mt-10 card-elevated p-5 sm:p-7" aria-labelledby="assessment-logs-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="assessment-logs-heading" className="text-xl font-black">Assessment reports and logs</h2>
        <p className="mt-2 text-sm text-muted-foreground">Open a session for a readable report of the answers, Jev evaluations, Gemini questions and result. Refreshes every 10 seconds while this page is open.</p></div>
      <button type="button" className={buttonClass} onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin"] })}><RefreshCw className="h-4 w-4" /> Refresh logs</button>
    </div>
    <form className="mt-5 flex flex-wrap gap-3" onSubmit={(event) => {
      event.preventDefault();
      const value = search.trim();
      if (value && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) { setSearchError("Enter a complete assessment ID."); return; }
      setSearchError(""); setFilter(value);
    }}>
      <label className="min-w-0 flex-1"><span className="sr-only">Assessment ID</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an assessment by its ID" className="w-full rounded-xl border border-input bg-card px-4 py-2 text-sm" /></label>
      <button className={buttonClass} type="submit">Find assessment</button>
      {filter && <button className={buttonClass} type="button" onClick={() => { setSearch(""); setFilter(""); }}>Show recent</button>}
    </form>
    {searchError && <p role="alert" className="mt-2 text-sm text-destructive">{searchError}</p>}
    {sessions.isLoading && <p className="mt-5 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading assessment logs…</p>}
    {sessions.error && <p role="alert" className="mt-5 rounded-xl bg-blush p-4 text-sm">Logging tables could not be loaded. Confirm the logging SQL migration is installed and this account has the admin or staff role.</p>}
    {sessions.data?.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No matching logs yet. New assessments appear here after server logging is enabled.</p>}
    {Boolean(sessions.data?.length) && <div className="mt-5 max-h-80 overflow-auto">
      <table className="w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="py-2 pr-4">Assessment ID</th><th className="pr-4">Status</th><th className="pr-4">Stage</th><th>Last activity</th></tr></thead>
        <tbody>{sessions.data?.map((session) => <tr key={session.session_id} className="border-b border-border/60">
          <td className="py-3 pr-4"><button type="button" onClick={() => setSelectedId(session.session_id)} className="text-left font-semibold text-magenta underline">{session.session_id}</button></td>
          <td className="pr-4">{session.status}</td><td className="pr-4">{session.stage}</td><td className="whitespace-nowrap">{date(session.updated_at)}</td>
        </tr>)}</tbody></table>
    </div>}
    {selectedId && <div className="mt-8 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="break-all text-lg font-black">Assessment {selectedId}</h3>
        <button type="button" className={buttonClass} disabled={!report || detail.isFetching || Boolean(detail.error)} onClick={() => report && exportMarkdown(selectedId, sessionReportMarkdown(report))}><Download className="h-4 w-4" /> Download Markdown</button></div>
      {detail.isLoading && <p className="mt-4 text-sm">Loading full history…</p>}
      {detail.error && <p role="alert" className="mt-4 text-sm text-destructive">We could not load this assessment’s history. Try refreshing the logs.</p>}
      {detail.data && <>
        <p className="mt-3 text-sm text-muted-foreground">{detail.data.events.length} events · {detail.data.calls.length} model calls · Started {date(detail.data.session.created_at)}</p>
        <p className="mt-2 text-sm text-muted-foreground">For Notion: import the downloaded .md file using Notion’s Markdown import. Imported copies will not sync automatically.</p>
        {report && <AssessmentSessionReport report={report} />}
        <details className="mt-6 rounded-2xl border border-border p-4"><summary className="cursor-pointer font-semibold">Technical logs and full JSON export</summary>
        <button type="button" className={`${buttonClass} mt-4`} disabled={detail.isFetching || Boolean(detail.error)} onClick={() => exportJson(selectedId, detail.data)}><Download className="h-4 w-4" /> Export full JSON</button>
        {detail.data.session.last_error && <JsonDetails title="Latest assessment error" value={detail.data.session.last_error} />}
        <JsonDetails title="Questions, answers and saved state" value={snapshot} />
        {result && <JsonDetails title="Final result and scoring" value={result as Json} />}
        <h4 className="mt-6 font-bold">Model calls</h4>
        {detail.data.calls.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No model calls were made for this session.</p>}
        {detail.data.calls.map((call) => <article key={call.id} className="mt-4 rounded-2xl border border-border bg-blush/40 p-4">
          <h5 className="font-bold">{call.provider.toUpperCase()} · {call.operation} · {call.status}</h5>
          <p className="mt-2 break-words text-xs text-muted-foreground">Configured model: {call.configured_model} · Returned model: {call.response_model ?? "not supplied"}<br />{date(call.started_at)} · {call.duration_ms === null ? "duration pending" : `${call.duration_ms} ms`} · HTTP {call.http_status ?? "no response"}<br />Attempt: {call.attempt_id}</p>
          {call.status === "started" && <p className="mt-2 text-xs">The call began but no final record was saved. It may still be running or have been interrupted.</p>}
          <JsonDetails title="Exact model input / request body" value={call.request} />
          <JsonDetails title="Raw model response" value={call.response} />
          <JsonDetails title="Processed output and usage" value={{ output: call.output, usage: call.usage }} />
          {call.error && <JsonDetails title="Call error" value={call.error} />}
        </article>)}
        <h4 className="mt-6 font-bold">Step timeline</h4>
        <ol className="mt-3 space-y-3">{detail.data.events.map((event) => <li key={event.id} className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">{event.event_type.replaceAll("_", " ")} · {event.stage}</p>
          <p className="mt-1 text-xs text-muted-foreground">{date(event.recorded_at)} · {event.source}{event.attempt_id ? ` · Attempt ${event.attempt_id}` : ""}</p>
          <JsonDetails title="Event details" value={event.payload} />
        </li>)}</ol>
        </details>
      </>}
    </div>}
  </section>;
}
