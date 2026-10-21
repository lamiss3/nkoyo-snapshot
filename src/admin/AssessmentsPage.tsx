import { displayDate, patternLabel, downloadFile } from "./format";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, RefreshCw } from "lucide-react";
import { useSavedAssessments, useTraceSummaries } from "./data";
import { mergeAssessments, toCsv, withinDates } from "./model";
import {
  Card,
  DateFilters,
  Empty,
  PageIntro,
  Pagination,
  QueryState,
  Status,
  adminButton,
  adminInput,
} from "./ui";

export function AssessmentsPage() {
  const saved = useSavedAssessments(),
    traces = useTraceSummaries();
  const [tab, setTab] = useState("all"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1);
  const rows = mergeAssessments(saved.data ?? [], traces.data ?? []).filter(
    (row) =>
      (tab !== "completed" || row.completedAt) &&
      (tab !== "logs" || row.trace) &&
      (status === "all" || row.status === status) &&
      row.id.toLowerCase().includes(search.trim().toLowerCase()) &&
      withinDates(row.startedAt, from, to),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 20)));
  const reset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  const exportSaved = () =>
    downloadFile(
      `snapshot-sessions-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        rows.flatMap((row) =>
          row.saved
            ? [
                {
                  session_key: row.saved.session_key,
                  completed_at: row.saved.completed_at,
                  summary: row.saved.summary_key,
                  patterns: Array.isArray(row.saved.result_patterns)
                    ? row.saved.result_patterns.join(" | ")
                    : "",
                },
              ]
            : [],
        ),
      ),
    );
  return (
    <>
      <PageIntro description="Saved results and adaptive assessment activity in one place. Open an assessment for its responses, evaluations, report and technical logs.">
        <button
          className={adminButton}
          onClick={() => {
            void saved.refetch();
            void traces.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh assessments
        </button>
      </PageIntro>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Assessment views">
        {[
          ["all", "All Assessments"],
          ["completed", "Completed Reports"],
          ["logs", "Activity & Logs"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            className={`${adminButton} ${tab === value ? "!bg-navy !text-white" : ""}`}
            onClick={() => {
              setTab(value!);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-44 flex-1 text-xs font-bold">
            Assessment ID
            <input
              className={`${adminInput} mt-1`}
              value={search}
              onChange={(event) => reset(setSearch)(event.target.value)}
              placeholder="Search full or partial ID"
            />
          </label>
          <label className="text-xs font-bold">
            Status
            <select
              className={`${adminInput} mt-1`}
              value={status}
              onChange={(event) => reset(setStatus)(event.target.value)}
            >
              <option value="all">All statuses</option>
              {["active", "completed", "restarted", "error"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <DateFilters from={from} to={to} onFrom={reset(setFrom)} onTo={reset(setTo)} />
          <button
            className={adminButton}
            onClick={() => {
              setSearch("");
              setStatus("all");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Dates filter when an assessment started. Activity & Logs includes recorded traces; full
          logs load only when you open a detail page. Use Refresh for updates.
        </p>
        <QueryState queries={[saved, traces]}>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black">{rows.length} matching assessments</h2>
            <button
              className={adminButton}
              onClick={exportSaved}
              disabled={!rows.some((row) => row.saved)}
            >
              <Download className="h-4 w-4" />
              Export saved snapshots CSV
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            CSV keeps the original session, completion, summary and pattern fields for all matching
            saved snapshots, across every page. Trace-only records have Markdown and JSON exports in
            their detail page.
          </p>
          {!rows.length ? (
            <Empty>No matching assessments. Try another ID, status or date range.</Empty>
          ) : (
            <div className="admin-table-wrap mt-4">
              <table className="admin-table">
                <caption className="sr-only">Saved assessment records</caption>
                <thead>
                  <tr>
                    {["Assessment", "Status", "Focus / stage", "Started", "Last activity"].map(
                      (title) => (
                        <th scope="col" key={title}>
                          {title}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * 20, current * 20).map((row) => (
                    <tr key={row.id}>
                      <td className="min-w-52">
                        <Link
                          to="/admin/assessments/$id"
                          params={{ id: row.id }}
                          className="break-all font-bold underline underline-offset-4"
                        >
                          {row.id}
                        </Link>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {row.trace ? "Adaptive trace" : "Saved snapshot"}
                          {row.saved && row.trace ? " + saved result" : ""}
                        </p>
                      </td>
                      <td>
                        <Status>{row.status}</Status>
                      </td>
                      <td className="min-w-48">
                        {row.saved?.summary_key
                          ? patternLabel(row.saved.summary_key)
                          : row.stage.replaceAll("_", " ")}
                      </td>
                      <td className="min-w-36 text-xs">{displayDate(row.startedAt)}</td>
                      <td className="min-w-36 text-xs">{displayDate(row.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={current} count={rows.length} onChange={setPage} />
        </QueryState>
      </Card>
    </>
  );
}
