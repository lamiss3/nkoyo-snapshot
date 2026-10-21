import { displayDate, patternLabel } from "./format";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { getEmailJourneys } from "@/assessment-v2/email-actions";
import { useSavedAssessments, useTraceSummaries, useLeads, useRecordedEvents } from "./data";
import { dashboardMetrics, mergeAssessments } from "./model";
import {
  Card,
  DateFilters,
  Empty,
  PageIntro,
  QueryState,
  Status,
  adminButton,
  adminInput,
} from "./ui";

export function DashboardPage() {
  const saved = useSavedAssessments(),
    traces = useTraceSummaries(),
    leads = useLeads(),
    events = useRecordedEvents();
  const jobs = useQuery({
    queryKey: ["admin-email-journeys"],
    queryFn: () => getEmailJourneys(),
    staleTime: 60_000,
  });
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [excluded, setExcluded] = useState("");
  const metrics = dashboardMetrics(
    mergeAssessments(saved.data ?? [], traces.data ?? []),
    leads.data ?? [],
    events.data ?? [],
    { from, to, excluded },
  );
  const refresh = () =>
    [saved, traces, leads, events, jobs].forEach((query) => void query.refetch());
  const stats = [
    { label: "Snapshots started", value: metrics.started, note: "Distinct saved assessment IDs" },
    {
      label: "Snapshots completed",
      value: metrics.completed,
      note: "Completed in the selected start cohort",
    },
    {
      label: "Completion rate",
      value: metrics.completionRate === null ? "—" : `${Math.round(metrics.completionRate * 100)}%`,
      note: "Completed / started assessment records",
    },
    {
      label: "Booking CTA clicks",
      value: metrics.bookingClicks,
      note: "Recorded clicks, including repeat clicks",
    },
    {
      label: "Marketing opt-ins",
      value: metrics.optIns,
      note: "Opted-in submissions, not current Kit subscriptions",
    },
  ];
  const failures = (jobs.data?.jobs ?? [])
    .filter(
      (job) =>
        job.last_error ||
        job.kit_state.error ||
        job.status === "failed" ||
        job.kit_state.status === "reconcile",
    )
    .slice(0, 4);
  return (
    <>
      <PageIntro description="An overview of recorded assessments and follow-up activity. Counts describe saved records, not unique visitors.">
        <button className={adminButton} onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
          Refresh overview
        </button>
      </PageIntro>
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <button
            className={adminButton}
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            All dates
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Assessment counts use the date each assessment started; completed means completed as of
          now. Event and opt-in counts use their own recorded dates. Calendar dates follow your
          browser’s timezone.
        </p>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-bold">
            Exclude known internal or test submissions
          </summary>
          <label className="mt-3 block text-sm">
            Exact email addresses or assessment IDs
            <input
              className={`${adminInput} mt-2`}
              value={excluded}
              onChange={(event) => setExcluded(event.target.value)}
              placeholder="Separate values with commas"
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            This view only. Email matches exclude their linked assessment IDs and identifiable
            events. Unlinked activity cannot be classified. No records are deleted or changed.
          </p>
        </details>
      </Card>
      <QueryState queries={[saved, traces, leads, events]}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <p className="text-sm font-bold text-muted-foreground">{stat.label}</p>
              <p className="mt-3 font-display text-4xl font-black">{stat.value}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{stat.note}</p>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {metrics.rawStartEvents} raw start events in this date range are retained separately. They
          are not added to saved assessment counts because events may repeat or lack an assessment
          record.
        </p>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <h2 className="text-lg font-black">Most common patterns</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Recorded patterns on completed assessments in the selected cohort. One assessment may
              have multiple patterns.
            </p>
            {!metrics.patterns.length ? (
              <Empty>No recorded patterns in this view yet.</Empty>
            ) : (
              <ul className="mt-6 space-y-5">
                {metrics.patterns.map(([key, count]) => (
                  <li key={key}>
                    <div className="mb-2 flex justify-between gap-4 text-sm">
                      <span className="font-semibold">{patternLabel(key)}</span>
                      <span className="shrink-0 font-bold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary" aria-hidden="true">
                      <div
                        className="h-2 rounded-full bg-navy"
                        style={{ width: `${(count / Math.max(1, metrics.completed)) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-black">Recent assessment activity</h2>
              <Link className="text-sm font-bold underline" to="/admin/assessments">
                View all
              </Link>
            </div>
            {!metrics.cohort.length ? (
              <Empty>No saved assessments in this view yet.</Empty>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {metrics.cohort.slice(0, 6).map((row) => (
                  <li key={row.id} className="py-4">
                    <Link
                      to="/admin/assessments/$id"
                      params={{ id: row.id }}
                      className="flex items-center gap-2 text-sm font-bold"
                    >
                      <span className="min-w-0 truncate">{row.id}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Status>{row.status}</Status>
                      <span className="text-xs text-muted-foreground">
                        {displayDate(row.updatedAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </QueryState>
      <Card className="mt-6">
        <div className="flex flex-wrap justify-between gap-3">
          <h2 className="text-lg font-black">Email failures & system warnings</h2>
          <Link to="/admin/email-journeys" className="text-sm font-bold underline">
            Open email journeys
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Latest 100 email requests, across all dates. Scheduled status is not proof of delivery.
        </p>
        {jobs.isPending ? (
          <p role="status" className="mt-4 text-sm">
            Checking email status…
          </p>
        ) : jobs.error ? (
          <p role="alert" className="mt-4 text-sm">
            Email status is unavailable. Open Email Journeys to check access or retry loading.
          </p>
        ) : (
          <>
            {!jobs.data?.kitConfigured && (
              <p className="mt-4 rounded-xl bg-blush p-4 text-sm">
                Kit is not configured for this environment.
              </p>
            )}
            {jobs.data?.kitConfigured && !jobs.data.deliveryEnabled && (
              <p className="mt-4 text-sm">Automatic sending is disabled in this environment.</p>
            )}
            {failures.length ? (
              <ul className="mt-4 space-y-3">
                {failures.map((job) => (
                  <li key={job.id} className="rounded-xl border border-border p-4">
                    <p className="break-all text-sm font-bold">{job.email}</p>
                    <p className="mt-1 break-words text-sm text-destructive">
                      {job.last_error ?? job.kit_state.error ?? "This journey needs review."}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {displayDate(job.updated_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No failures recorded among the latest email requests.
              </p>
            )}
          </>
        )}
      </Card>
    </>
  );
}
