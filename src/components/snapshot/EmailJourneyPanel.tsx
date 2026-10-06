import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmailJourneys, manageEmailJourney } from "@/assessment-v2/email-actions";
import {
  emailDayOffsets,
  emailJourneyMarkdown,
  eligibleJourneyEmails,
} from "@/assessment-v2/email-journey";
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
  const query = useQuery({
    queryKey: ["admin-email-journeys"],
    queryFn: () => getEmailJourneys(),
    refetchInterval: 10000,
  });
  const jobs = query.data?.jobs ?? [];
  const job = jobs.find((item) => item.id === selected);
  const act = async (id: string, action: "generate" | "approve" | "kit_drafts") => {
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
  return (
    <section className="card-elevated mt-10 p-6 sm:p-9" aria-labelledby="email-journeys-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="email-journeys-title" className="text-2xl font-black">
          Personalized email journeys
        </h2>
        <button className={button} onClick={() => void query.refetch()}>
          Refresh emails
        </button>
      </div>
      <p className="mt-3 text-muted-foreground">
        Review five emails based on each person’s saved answers. Planned timing: report, then days
        2, 4, 7 and 10. Sending is not activated.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {query.data?.kitConfigured
          ? `Kit connected in ${query.data.kitMode} mode. Uploads create private, unscheduled drafts.`
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
      <label className="mt-5 block text-sm font-semibold" htmlFor="email-journey-search">
        Find by email or assessment ID (latest 100 requests)
      </label>
      <input
        id="email-journey-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mt-2 w-full rounded-xl border border-input bg-card p-3"
        placeholder="Email or assessment ID"
      />
      {!query.isPending && !query.isError && !jobs.length && (
        <p className="mt-4 text-muted-foreground">
          No email journeys yet. New report requests appear here. Earlier email captures have not
          been enrolled in this sequence.
        </p>
      )}
      <div className="mt-4 space-y-2">
        {jobs
          .filter((item) =>
            `${item.email} ${item.session_id}`.toLowerCase().includes(search.toLowerCase()),
          )
          .map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelected(item.id);
                setError("");
              }}
              className={`w-full rounded-xl border p-4 text-left ${selected === item.id ? "border-magenta bg-muted" : "border-border"}`}
            >
              <span className="block font-bold break-all">{item.email}</span>
              <span className="mt-1 block text-sm">
                {item.status.replaceAll("_", " ")} ·{" "}
                {item.followup_consent ? "All five requested" : "Report only"} ·{" "}
                {date(item.created_at)}
              </span>
              <span className="block text-xs text-muted-foreground break-all">
                Assessment {item.session_id}
              </span>
            </button>
          ))}
      </div>
      {job && (
        <div className="mt-7 rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="text-xl font-black break-all">Email journey for {job.email}</h3>
          <p className="mt-2 text-sm">Assessment {job.session_id}</p>
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
                onClick={() => void act(job.id, "generate")}
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
                  disabled={busy || Boolean(job.approved_at)}
                  onClick={() => void act(job.id, "approve")}
                >
                  {job.approved_at ? "Drafts approved" : "Approve reviewed drafts"}
                </button>
                <button
                  className={button}
                  disabled={
                    busy ||
                    !job.approved_at ||
                    !query.data?.kitConfigured ||
                    Boolean(job.kit_state.status)
                  }
                  onClick={() => void act(job.id, "kit_drafts")}
                >
                  Create private drafts in Kit
                </button>
              </>
            )}
          </div>
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
                  Email {message.number}: broadcast {message.broadcastId} — draft, not sent
                </p>
              ))}
              <p className="mt-2 text-xs">
                An interrupted upload must be checked in Kit before another attempt, to avoid
                duplicate broadcasts.
              </p>
            </div>
          )}
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
                        ? "Requested — not sent"
                        : "Not opted in — will not be uploaded"}
                    </summary>
                    <p className="mt-4 font-bold">Subject: {email.subject}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Preview: {email.preview}</p>
                    <p className="mt-5">Hello,</p>
                    {email.sections.map((section, index) => (
                      <div key={index} className="mt-5">
                        <h4 className="font-bold">{section.heading}</h4>
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
