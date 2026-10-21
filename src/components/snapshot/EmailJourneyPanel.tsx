import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pagination, Status } from "@/admin/ui";
import { useEmailJourneyEvents } from "@/admin/data";
import {
  getEmailJourneys,
  manageEmailJourney,
  prepareFixedTestEmails,
} from "@/assessment-v2/email-actions";
import {
  emailDayOffsets,
  emailJourneyMarkdown,
  eligibleJourneyEmails,
  emailSupportInvitation,
} from "@/assessment-v2/email-journey";
import { emailSlotsForVersion } from "@/assessment-v2/email-contract";
import { problemById } from "@/assessment-v2/problem-bank";
import type { EmailJobView } from "@/assessment-v2/email-job-types";

const button =
  "rounded-full border border-border px-4 py-2 text-sm font-bold disabled:opacity-50 hover:bg-muted";
const date = (value: string) => new Date(value).toLocaleString();
export function EmailJourneyPanel() {
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testSession, setTestSession] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testAgreed, setTestAgreed] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [timelineVisible, setTimelineVisible] = useState(25);
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: "generate" | "approve" | "kit_drafts";
  } | null>(null);
  const query = useQuery({
    queryKey: ["admin-email-journeys"],
    queryFn: () => getEmailJourneys(),
    refetchInterval: 10000,
  });
  const jobs = query.data?.jobs ?? [];
  const job = jobs.find((item) => item.id === selected);
  const timeline = useEmailJourneyEvents(job?.id ?? null);
  const statuses = [...new Set(jobs.map((item) => item.kit_state.status || item.status))];
  const filteredJobs = jobs.filter(
    (item) =>
      `${item.email} ${item.session_id}`.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === "all" || (item.kit_state.status || item.status) === statusFilter),
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredJobs.length / 20)));
  const act = async (id: string, action: "generate" | "approve" | "kit_drafts") => {
    setPendingAction(null);
    setBusy(true);
    setError("");
    try {
      await manageEmailJourney({ data: { id, action } });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update this journey.");
    } finally {
      await cache.invalidateQueries({ queryKey: ["admin-email-journeys"] });
      setBusy(false);
    }
  };
  const exportDraft = (job: EmailJobView) => {
    if (!job.content) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          `Recipient: ${job.email}\nFollow-up consent: ${job.followup_consent ? "Yes" : "No"}\n\n${emailJourneyMarkdown(job.content)}`,
        ],
        { type: "text/markdown;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `nkoyo-email-journey-${job.session_id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const prepareTest = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await prepareFixedTestEmails({
        data: { sessionId: testSession.trim(), email: testEmail },
      });
      setSelected(result.jobId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not prepare the fixed test.");
    } finally {
      await cache.invalidateQueries({ queryKey: ["admin-email-journeys"] });
      setBusy(false);
    }
  };
  return (
    <section className="card-elevated min-w-0 p-5 sm:p-7" aria-labelledby="email-journeys-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="email-journeys-title" className="text-2xl font-black">
          Personalized email journeys
        </h2>
        <button
          className={button}
          onClick={() => {
            void query.refetch();
            if (job) void timeline.refetch();
          }}
        >
          Refresh emails
        </button>
      </div>
      <p className="mt-3 text-muted-foreground">
        Review five emails based on each person’s saved answers. Planned timing: report, then days
        2, 4, 7 and 10.{" "}
        {query.data?.deliveryEnabled
          ? "New requests are automatically prepared and scheduled according to consent. Earlier review drafts are not enrolled."
          : "Sending is not activated."}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        New journeys: finding and first check → locate the obstacle → bounded test → interpret
        possible results → next decision.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {query.data?.kitConfigured
          ? `Kit connected in ${query.data.kitMode} mode. ${query.data.deliveryEnabled ? "Automatic emails remain private and target one verified contact." : "Uploads create private, unscheduled drafts."}`
          : "Kit credentials are not connected yet. You can generate, review and export drafts here."}
      </p>
      {query.isPending && (
        <p role="status" className="mt-4">
          Loading email journeys…
        </p>
      )}
      {query.isError && (
        <p role="alert" className="mt-4 text-destructive">
          {query.error.message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-destructive">
          {error}
        </p>
      )}
      {query.data?.fixedTestEnabled && (
        <details className="mt-5 rounded-xl border border-border p-4">
          <summary className="cursor-pointer font-bold">
            Test delivery with legacy v2 templates (no Gemini)
          </summary>
          <p className="mt-3 text-sm text-muted-foreground">
            These v2 templates test the delivery integration, not the new v3 editorial flow. Use a
            completed test assessment and your allowed test address. This saves five clearly marked
            template drafts using the assessment's topics and an answer excerpt. Review them below,
            then upload to Kit. Nothing is sent.
          </p>
          <label className="mt-4 block text-sm font-semibold" htmlFor="fixed-email-assessment">
            Completed test assessment ID
          </label>
          <input
            id="fixed-email-assessment"
            value={testSession}
            onChange={(event) => setTestSession(event.target.value)}
            className="mt-2 w-full rounded-xl border border-input bg-card p-3"
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="fixed-email-address">
            Allowed test email
          </label>
          <input
            id="fixed-email-address"
            type="email"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-input bg-card p-3"
          />
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={testAgreed}
              onChange={(event) => setTestAgreed(event.target.checked)}
              className="mt-1"
            />
            Prepare all five test drafts for this address. I understand this creates an email
            request and does not send email.
          </label>
          <button
            className={`${button} mt-4`}
            disabled={busy || !testAgreed || !testSession.trim() || !testEmail.trim()}
            onClick={() => void prepareTest()}
          >
            {busy ? "Preparing…" : "Prepare fixed test drafts"}
          </button>
        </details>
      )}
      <label className="mt-5 block text-sm font-semibold" htmlFor="email-journey-search">
        Find by email or assessment ID (latest 100 requests)
      </label>
      <input
        id="email-journey-search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="mt-2 w-full rounded-xl border border-input bg-card p-3"
        placeholder="Email or assessment ID"
      />
      <label className="mt-4 block text-sm font-semibold" htmlFor="email-journey-status">
        Journey status
      </label>
      <select
        id="email-journey-status"
        className="mt-2 min-h-11 rounded-xl border border-input bg-card p-3 text-sm"
        value={statusFilter}
        onChange={(event) => {
          setStatusFilter(event.target.value);
          setPage(1);
        }}
      >
        <option value="all">All statuses</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <p className="mt-3 text-xs text-muted-foreground">
        This page refreshes saved status every 10 seconds while open. Viewing or refreshing does not
        generate or send emails. Scheduled means scheduled in Kit; it does not confirm inbox
        delivery.
      </p>
      {!query.isPending && !query.isError && !jobs.length && (
        <p className="mt-4 text-muted-foreground">
          No email journeys yet. New report requests appear here. Earlier email captures have not
          been enrolled in this sequence.
        </p>
      )}
      <div className="mt-4 space-y-2">
        {filteredJobs.slice((currentPage - 1) * 20, currentPage * 20).map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setSelected(item.id);
              setTimelineVisible(25);
              setPendingAction(null);
              setError("");
            }}
            className={`w-full rounded-xl border p-4 text-left ${selected === item.id ? "border-magenta bg-muted" : "border-border"}`}
          >
            <span className="block font-bold break-all">{item.email}</span>
            <span className="mt-1 block text-sm">
              <Status>{item.kit_state.status || item.status}</Status> ·{" "}
              {item.followup_consent ? "All five requested" : "Report only"} ·{" "}
              {date(item.created_at)}
            </span>
            <span className="block text-xs text-muted-foreground break-all">
              Assessment {item.session_id}
            </span>
          </button>
        ))}
      </div>
      {Boolean(jobs.length) && !filteredJobs.length && (
        <p className="mt-5 text-sm text-muted-foreground">No journeys match these filters.</p>
      )}
      <Pagination page={currentPage} count={filteredJobs.length} onChange={setPage} />
      {job && (
        <div className="mt-7 rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="text-xl font-black break-all">Email journey for {job.email}</h3>
          {job.content?.source === "fixed_test" && (
            <p className="mt-3 rounded-xl bg-muted p-3 font-bold">
              Fixed template test — Gemini was not called.
            </p>
          )}
          <p className="mt-2 break-all text-sm">
            <Link
              className="font-bold underline"
              to="/admin/assessments/$id"
              params={{ id: job.session_id }}
            >
              Assessment {job.session_id}
            </Link>
          </p>
          <p className="mt-2 text-sm">
            {job.automation_enabled
              ? "Automatic delivery request — no staff approval needed after content validation."
              : "Review-only request — not automatically enrolled."}
          </p>
          <p className="mt-2 text-sm">
            Generation attempts: {job.attempts}.{" "}
            {job.locked_until && Date.parse(job.locked_until) > Date.now()
              ? "Preparation in progress."
              : job.status === "queued"
                ? `Worker retry eligible after ${date(job.next_attempt_at)}. Staff can retry now.`
                : ""}
          </p>
          {job.last_error && <p className="mt-3 text-sm text-destructive">{job.last_error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {!job.content && job.status !== "cancelled" && (
              <button
                className={button}
                disabled={
                  busy || Boolean(job.locked_until && Date.parse(job.locked_until) > Date.now())
                }
                onClick={() => setPendingAction({ id: job.id, action: "generate" })}
              >
                {busy ? "Preparing…" : "Generate / retry drafts"}
              </button>
            )}
            {job.content && (
              <>
                <button className={button} onClick={() => exportDraft(job)}>
                  Download all five (.md)
                </button>
                <button
                  className={button}
                  disabled={busy || Boolean(job.approved_at) || job.automation_enabled}
                  onClick={() => setPendingAction({ id: job.id, action: "approve" })}
                >
                  {job.approved_at ? "Drafts approved" : "Approve reviewed drafts"}
                </button>
                <button
                  className={button}
                  disabled={
                    busy ||
                    job.automation_enabled ||
                    !job.approved_at ||
                    !query.data?.kitConfigured ||
                    Boolean(job.kit_state.status && job.kit_state.status !== "awaiting_recipient")
                  }
                  onClick={() => setPendingAction({ id: job.id, action: "kit_drafts" })}
                >
                  {job.kit_state.status === "awaiting_recipient"
                    ? "Retry Kit recipient verification"
                    : "Create private drafts in Kit"}
                </button>
              </>
            )}
          </div>
          {pendingAction?.id === job.id && (
            <div
              role="region"
              aria-label="Confirm journey action"
              className="mt-5 rounded-xl border border-border bg-blush p-4"
            >
              <p className="font-bold">
                {pendingAction.action === "generate"
                  ? "Generate or retry this journey?"
                  : pendingAction.action === "approve"
                    ? "Approve these reviewed drafts?"
                    : "Create private Kit drafts?"}
              </p>
              <p className="mt-2 text-sm">
                {pendingAction.action === "generate"
                  ? job.automation_enabled
                    ? "This automatic request may resume consented scheduling after successful validation. This is the existing recovery behavior."
                    : "This calls the configured model to prepare a review-only journey. It is not automatically enrolled."
                  : pendingAction.action === "approve"
                    ? "Approval marks these drafts as reviewed. It does not send email."
                    : "This uploads this journey’s eligible emails to Kit as private drafts. Nothing is sent by this action."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void act(pendingAction.id, pendingAction.action)}
                >
                  Confirm action
                </button>
                <button className={button} disabled={busy} onClick={() => setPendingAction(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {job.approved_at && (
            <p className="mt-3 text-xs text-muted-foreground">
              Approved {date(job.approved_at)}. Approval does not send email.
            </p>
          )}
          {job.kit_state.status && (
            <div className="mt-4 rounded-xl bg-muted p-4">
              <p className="font-bold">Kit: {job.kit_state.status.replaceAll("_", " ")}</p>
              {job.kit_state.error && <p className="mt-2 text-sm">{job.kit_state.error}</p>}
              {job.kit_state.messages?.map((message) => (
                <p key={message.number} className="text-sm">
                  Email {message.number}: broadcast {message.broadcastId} —{" "}
                  {message.sendAt
                    ? `scheduled for ${date(message.sendAt)}${message.providerStatus ? ` · Kit: ${message.providerStatus}` : ""}`
                    : "draft, not sent"}
                </p>
              ))}
              {Boolean(job.kit_state.testPreviews?.length) && (
                <div className="mt-3 border-t border-border pt-3 text-sm">
                  <p className="font-bold">
                    Test previews: {job.kit_state.testPreviews!.length} sent through Kit's preview
                    control.
                  </p>
                  <p>
                    {job.kit_state.testPreviews!.filter((preview) => preview.receivedAt).length}{" "}
                    confirmed received in Gmail.{" "}
                    {job.kit_state.testPreviews!.some((preview) => preview.mailbox === "spam")
                      ? "These test messages landed in Spam; inbox placement needs further work."
                      : ""}
                  </p>
                  <p className="mt-1 text-xs">
                    Manually verified test previews. These fixed test broadcasts remain unscheduled.
                  </p>
                </div>
              )}
              <p className="mt-2 text-xs">
                {job.kit_state.status === "awaiting_recipient"
                  ? "Kit can take up to five minutes to list a newly tagged contact. Retrying this check reuses confirmed drafts."
                  : "An interrupted upload must be checked in Kit before another attempt, to avoid duplicate broadcasts."}
              </p>
            </div>
          )}
          <details className="mt-5 rounded-xl border border-border p-4">
            <summary className="cursor-pointer font-bold">Recorded journey timeline</summary>
            <p className="mt-3 text-xs text-muted-foreground">
              Saved preparation, approval, scheduling and provider-check events. Use Refresh emails
              for updates. Kit’s completed status is a provider status, not proof of inbox receipt.
            </p>
            {timeline.isPending && (
              <p role="status" className="mt-3 text-sm">
                Loading recorded events…
              </p>
            )}
            {timeline.error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                Journey events could not be loaded. The emails and scheduling state remain available
                above.
              </p>
            )}
            {timeline.data?.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No journey events have been recorded.
              </p>
            )}
            <ol className="mt-4 space-y-3">
              {[...(timeline.data ?? [])]
                .reverse()
                .slice(0, timelineVisible)
                .map((event) => (
                  <li key={event.id} className="rounded-xl bg-blush p-3">
                    <p className="text-sm font-bold">{event.event_type.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{date(event.created_at)}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold">
                        Event details
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </details>
                  </li>
                ))}
            </ol>
            {Boolean(timeline.data?.length) && (
              <p className="mt-3 text-xs text-muted-foreground">
                Latest {Math.min(timelineVisible, timeline.data!.length)} of {timeline.data!.length}{" "}
                recorded events.
              </p>
            )}
            {(timeline.data?.length ?? 0) > timelineVisible && (
              <button
                type="button"
                className={`${button} mt-3`}
                onClick={() => setTimelineVisible(timelineVisible + 25)}
              >
                Show 25 older events
              </button>
            )}
          </details>
          {job.content && (
            <>
              <p className="mt-6 text-sm">
                Primary:{" "}
                {job.content.primaryId
                  ? problemById[job.content.primaryId].name
                  : "Needs more evidence"}
                . Secondary:{" "}
                {job.content.secondaryId
                  ? problemById[job.content.secondaryId].name
                  : "No second issue identified"}
                . {job.content.jointPriority ? "These are joint priorities." : ""}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Written by {job.content.model} · {date(job.content.generatedAt)}. Evidence
                references below link each passage to assessment questions.
              </p>
              {job.content.version === "email-journey-v3" && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Sequence: first check → obstacle distinction → bounded test → possible results →
                  next decision. Later messages work whether or not the reader has started.
                </p>
              )}
              {job.content.version === "email-journey-v2" && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Sequence: result → recognition → understanding → action → connection and support.{" "}
                  {job.content.threadQuestionId
                    ? `Shared answer reference: ${job.content.threadQuestionId}.`
                    : "No usable shared example was available; the emails acknowledge that limitation."}
                </p>
              )}
              <div className="mt-5 space-y-4">
                {job.content.emails.map((email) => (
                  <details
                    key={email.number}
                    className="rounded-xl border border-border p-4"
                    open={email.number === 1}
                  >
                    <summary className="cursor-pointer font-bold">
                      Email {email.number} ·{" "}
                      {email.number === 1 ? "Report" : `Day ${emailDayOffsets[email.number - 1]}`} ·{" "}
                      {eligibleJourneyEmails(job.followup_consent).includes(email.number)
                        ? job.kit_state.messages?.find((message) => message.number === email.number)
                            ?.sendAt
                          ? job.kit_state.messages?.find(
                              (message) => message.number === email.number,
                            )?.providerStatus === "completed"
                            ? "Kit: completed"
                            : "Scheduled in Kit"
                          : job.automation_enabled
                            ? "Requested — preparation pending"
                            : "Requested — not sent"
                        : "Not opted in — will not be uploaded"}
                    </summary>
                    <p className="mt-4 font-bold">Subject: {email.subject}</p>
                    {job.content!.version !== "email-journey-v1" && (
                      <p className="mt-1 text-sm font-semibold text-magenta">
                        {emailSlotsForVersion(job.content!.version)[email.number - 1]?.label}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">Preview: {email.preview}</p>
                    <p className="mt-5">Hello,</p>
                    {email.sections.map((section, index) => (
                      <div key={index} className="mt-5">
                        <h4 className="font-bold">{section.heading}</h4>
                        {job.content!.version === "email-journey-v3" && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Staff section role:{" "}
                            {
                              emailSlotsForVersion(job.content!.version)[email.number - 1]?.roles[
                                index
                              ]
                            }
                          </p>
                        )}
                        {section.paragraphs.map((paragraph, index) => (
                          <p key={index} className="mt-2 whitespace-pre-wrap leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                        {section.sourceQuestionIds.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Based on: {section.sourceQuestionIds.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                    {email.mainAction && (
                      <div className="mt-5 rounded-xl bg-blush p-4">
                        <h4 className="font-bold">Your next step</h4>
                        <p className="mt-2">
                          {email.purpose === "next_decision" && email.supportInvitation ? (
                            <a
                              className="font-semibold underline"
                              href={emailSupportInvitation.href}
                            >
                              {email.mainAction}
                            </a>
                          ) : (
                            email.mainAction
                          )}
                        </p>
                      </div>
                    )}
                    {email.supportInvitation && email.purpose !== "next_decision" && (
                      <p className="mt-4">
                        <a className="font-semibold underline" href={emailSupportInvitation.href}>
                          {emailSupportInvitation.label}
                        </a>
                      </p>
                    )}
                    {email.nextEmailPreview &&
                      (job.content!.version !== "email-journey-v3" ||
                        job.followup_consent ||
                        email.number !== 1) && (
                        <p className="mt-4 text-sm text-muted-foreground">
                          {email.nextEmailPreview}
                        </p>
                      )}
                    <p className="mt-5">
                      Nkoyo
                      <br />
                      Iban Ison Solutions
                    </p>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
