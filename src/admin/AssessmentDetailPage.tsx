import { displayDate, downloadFile } from "./format";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, ArrowLeft } from "lucide-react";
import { buildSessionReport, sessionReportMarkdown } from "@/assessment-v2/session-report";
import { AssessmentSessionReport } from "@/components/snapshot/AssessmentSessionReport";
import { loadAssessmentDetail } from "./data";
import { Card, Empty, PageIntro, QueryState, Status, adminButton } from "./ui";

function JsonDetails({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="mt-3 rounded-xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export function AssessmentDetailPage({ id }: { id: string }) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const detail = useQuery({
    queryKey: ["admin", "assessment-trace", id],
    queryFn: () => loadAssessmentDetail(id),
    staleTime: 30_000,
    refetchInterval: autoRefresh ? 10_000 : false,
  });
  const data = detail.data;
  const report = data?.session ? buildSessionReport({ ...data, session: data.session }) : null;
  const snapshot = data?.session?.snapshot;
  const result =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? snapshot["result"]
      : null;
  const exportMarkdown = () => {
    const content = report
      ? sessionReportMarkdown(report)
      : `# Saved Snapshot\n\nAssessment: ${id}\n\nCompleted: ${displayDate(data?.saved?.completed_at ?? null)}\n\n## Saved answers\n\n\`\`\`json\n${JSON.stringify(data?.saved?.answers, null, 2)}\n\`\`\`\n\n## Saved findings\n\n\`\`\`json\n${JSON.stringify({ summary: data?.saved?.summary_key, patterns: data?.saved?.result_patterns, followup: data?.saved?.followup_answers }, null, 2)}\n\`\`\`\n`;
    downloadFile(`nkoyo-assessment-${id}.md`, content, "text/markdown;charset=utf-8");
  };
  return (
    <>
      <PageIntro description="A private record of what the respondent shared, what the models returned and the findings saved by the assessment.">
        <Link to="/admin/assessments" className={adminButton}>
          <ArrowLeft className="h-4 w-4" />
          All assessments
        </Link>
      </PageIntro>
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assessment ID
            </p>
            <h2 className="mt-2 break-all text-base font-black sm:text-xl">{id}</h2>
          </div>
          <button
            className={adminButton}
            disabled={detail.isFetching}
            onClick={() => void detail.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh record
          </button>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
          />
          Auto-refresh this detail page every 10 seconds
        </label>
      </Card>
      <QueryState queries={[detail]}>
        {data && (data.session || data.saved) ? (
          <>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Status>
                    {data.session?.status ?? (data.saved?.completed_at ? "completed" : "active")}
                  </Status>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Started{" "}
                    {displayDate(data.session?.created_at ?? data.saved?.started_at ?? null)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.events.length} recorded events · {data.calls.length} model calls
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={adminButton}
                    disabled={detail.isFetching || Boolean(detail.error)}
                    onClick={exportMarkdown}
                  >
                    <Download className="h-4 w-4" />
                    Download Markdown
                  </button>
                  <button
                    className={adminButton}
                    disabled={detail.isFetching || Boolean(detail.error)}
                    onClick={() =>
                      downloadFile(
                        `assessment-${id}.json`,
                        JSON.stringify(data, null, 2),
                        "application/json",
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export full JSON
                  </button>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Notion: import the Markdown file. Imported copies do not sync automatically. Exports
                contain private assessment information.
              </p>
            </Card>
            {report ? (
              <Card className="mt-6">
                <AssessmentSessionReport report={report} />
              </Card>
            ) : (
              <Card className="mt-6">
                <h2 className="text-xl font-black">Saved snapshot</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  This earlier snapshot has no adaptive processing trace. Its original answers and
                  saved result remain available.
                </p>
                <JsonDetails title="Saved responses" value={data.saved?.answers} />
                <JsonDetails
                  title="Saved findings and follow-up answers"
                  value={{
                    summary: data.saved?.summary_key,
                    patterns: data.saved?.result_patterns,
                    followup: data.saved?.followup_answers,
                  }}
                />
                {data.contacts.length > 0 && (
                  <JsonDetails title="Linked contact submissions" value={data.contacts} />
                )}
              </Card>
            )}
            {data.session && (
              <Card className="mt-6">
                <details>
                  <summary className="cursor-pointer text-lg font-black">
                    Technical logs & model records
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Exact inputs and outputs are visible only through existing staff access
                    controls. A scheduled or started operation does not prove successful completion.
                  </p>
                  {data.session.last_error && (
                    <JsonDetails title="Latest assessment error" value={data.session.last_error} />
                  )}
                  <JsonDetails title="Questions, answers and saved state" value={snapshot} />
                  {result && <JsonDetails title="Final result and scoring" value={result} />}
                  <h3 className="mt-7 text-lg font-bold">Model calls</h3>
                  {!data.calls.length && (
                    <Empty>No model calls were recorded for this assessment.</Empty>
                  )}
                  {data.calls.map((call) => (
                    <article
                      key={call.id}
                      className="mt-4 rounded-2xl border border-border bg-blush/40 p-4"
                    >
                      <h4 className="font-bold">
                        {call.provider === "gemini" && call.configured_model.startsWith("google/")
                          ? "GEMINI VIA OPENROUTER"
                          : call.provider.toUpperCase()}{" "}
                        · {call.operation} · {call.status}
                      </h4>
                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        Configured model: {call.configured_model} · Returned model:{" "}
                        {call.response_model ?? "not supplied"}
                        <br />
                        {displayDate(call.started_at)} ·{" "}
                        {call.duration_ms === null ? "duration pending" : `${call.duration_ms} ms`}{" "}
                        · HTTP {call.http_status ?? "no response"}
                        <br />
                        Attempt: {call.attempt_id}
                      </p>
                      {call.status === "started" && (
                        <p className="mt-2 text-xs">
                          The call began but no final record was saved. It may still be running or
                          have been interrupted.
                        </p>
                      )}
                      <JsonDetails title="Exact model input / request body" value={call.request} />
                      <JsonDetails title="Raw model response" value={call.response} />
                      <JsonDetails
                        title="Processed output and usage"
                        value={{ output: call.output, usage: call.usage }}
                      />
                      {call.error && <JsonDetails title="Call error" value={call.error} />}
                    </article>
                  ))}
                  <h3 className="mt-7 text-lg font-bold">Step timeline</h3>
                  {!data.events.length && <Empty>No events were recorded.</Empty>}
                  <ol className="mt-3 space-y-3">
                    {data.events.map((event) => (
                      <li key={event.id} className="rounded-xl border border-border p-4">
                        <p className="text-sm font-semibold">
                          {event.event_type.replaceAll("_", " ")} · {event.stage}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {displayDate(event.recorded_at)} · {event.source}
                          {event.attempt_id ? ` · Attempt ${event.attempt_id}` : ""}
                        </p>
                        <JsonDetails title="Event details" value={event.payload} />
                      </li>
                    ))}
                  </ol>
                </details>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <h2 className="text-xl font-black">Assessment not found</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              No accessible saved result or trace matches this ID. Check the ID or return to the
              assessment list.
            </p>
          </Card>
        )}
      </QueryState>
    </>
  );
}
