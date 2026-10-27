import { displayDate, patternLabel, downloadFile } from "./format";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useLeads, useSavedAssessments } from "./data";
import { toCsv, uniqueContacts, type Lead } from "./model";
import { Card, Empty, PageIntro, Pagination, QueryState, adminButton, adminInput } from "./ui";

export function LeadsPage() {
  const leads = useLeads(),
    saved = useSavedAssessments();
  const [search, setSearch] = useState(""),
    [consent, setConsent] = useState("all"),
    [mode, setMode] = useState("contacts"),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1);
  const byKey = new Map(saved.data?.map((row) => [row.session_key, row]));
  const focus = (lead: Lead) => {
    const key = lead.session_key ? byKey.get(lead.session_key)?.summary_key : null;
    return key ? patternLabel(key) : (lead.challenge ?? "Not recorded");
  };
  const groups =
    mode === "contacts"
      ? uniqueContacts(leads.data ?? [])
      : (leads.data ?? []).map((latest) => ({ latest, history: [latest] }));
  const rows = groups
    .filter(
      ({ latest, history }) =>
        (consent === "all" || latest.marketing_consent === (consent === "yes")) &&
        history.some((lead) =>
          [
            lead.email,
            lead.first_name,
            lead.organization,
            lead.role_title,
            lead.session_key,
            focus(lead),
          ]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
    )
    .sort((a, b) =>
      sort === "email"
        ? a.latest.email.localeCompare(b.latest.email)
        : sort === "name"
          ? a.latest.first_name.localeCompare(b.latest.first_name)
          : sort === "oldest"
            ? a.latest.created_at.localeCompare(b.latest.created_at)
            : b.latest.created_at.localeCompare(a.latest.created_at),
    );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 20)));
  const reset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  const exportRows = () => {
    const data = rows.map(({ latest, history }) =>
      mode === "contacts"
        ? {
            email: latest.email,
            first_name: latest.first_name,
            organization: latest.organization,
            role_title: latest.role_title,
            latest_recorded_consent: latest.marketing_consent,
            consent_recorded_at: latest.marketing_consent_at,
            latest_assessment: latest.session_key,
            latest_focus: focus(latest),
            latest_submission_at: latest.created_at,
            submission_count: history.length,
          }
        : { ...latest },
    );
    downloadFile(
      `snapshot-${mode === "contacts" ? "unique-contacts" : "lead-submissions"}-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(data),
    );
  };
  return (
    <>
      <PageIntro description="Contacts and individual report requests. Unique contacts groups email addresses for display only; original submissions remain intact." />
      <Card>
        <div className="admin-list-toolbar !mt-0">
          <label className="min-w-48 flex-1 text-xs font-bold">
            Search
            <input
              className={`${adminInput} mt-1`}
              placeholder="Email, name, organization, focus or assessment ID"
              value={search}
              onChange={(event) => reset(setSearch)(event.target.value)}
            />
          </label>
          <label className="text-xs font-bold">
            View
            <select
              className={`${adminInput} mt-1`}
              value={mode}
              onChange={(event) => reset(setMode)(event.target.value)}
            >
              <option value="contacts">Unique contacts</option>
              <option value="submissions">Individual submissions</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Recorded consent
            <select
              className={`${adminInput} mt-1`}
              value={consent}
              onChange={(event) => reset(setConsent)(event.target.value)}
            >
              <option value="all">All choices</option>
              <option value="yes">Opted in</option>
              <option value="no">Not opted in</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Sort
            <select
              className={`${adminInput} mt-1`}
              value={sort}
              onChange={(event) => reset(setSort)(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="email">Email A–Z</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          <button className={adminButton} disabled={!rows.length} onClick={exportRows}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        <details className="admin-context-help">
          <summary>Consent, search and export details</summary>
          <p>
            Consent is the choice saved on each submission, not a live Kit subscription check.
            Unique contacts shows the latest recorded choice; history retains earlier choices. A
            contact can match a search through an earlier submission. Exports include every matching{" "}
            {mode === "contacts" ? "unique contact" : "individual submission"}, across all pages.
          </p>
        </details>
        <QueryState queries={[leads, saved]}>
          <div className="mt-4">
            <h2 className="text-lg font-black">
              {rows.length} {mode === "contacts" ? "unique contacts" : "individual submissions"}
            </h2>
          </div>
          {!rows.length ? (
            <Empty>No matching contacts. Try a different search or filter.</Empty>
          ) : (
            <div className="admin-table-wrap mt-4">
              <table className="admin-table">
                <caption className="sr-only">
                  {mode === "contacts"
                    ? "Unique contacts with submission history"
                    : "Individual lead submissions"}
                </caption>
                <thead>
                  <tr>
                    {[
                      "Contact",
                      "Organization / role",
                      "Snapshot focus",
                      "Recorded consent",
                      "Received / history",
                    ].map((title) => (
                      <th scope="col" key={title}>
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * 20, current * 20).map(({ latest, history }) => (
                    <tr key={mode === "contacts" ? latest.email.toLowerCase() : latest.id}>
                      <td className="min-w-48">
                        <p className="font-bold">{latest.first_name || "Name not supplied"}</p>
                        <p className="mt-1 break-all">{latest.email}</p>
                      </td>
                      <td className="min-w-40">
                        <p>{latest.organization || "Not supplied"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {latest.role_title || "Role not supplied"}
                        </p>
                      </td>
                      <td className="min-w-48 max-w-72">
                        <p>{focus(latest)}</p>
                        {latest.session_key && (
                          <Link
                            className="mt-2 inline-block text-xs font-bold underline"
                            to="/admin/assessments/$id"
                            params={{ id: latest.session_key }}
                          >
                            Open assessment
                          </Link>
                        )}
                      </td>
                      <td>
                        <p className="whitespace-nowrap">
                          {latest.marketing_consent ? "Opted in" : "Not opted in"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {latest.marketing_consent_at
                            ? displayDate(latest.marketing_consent_at)
                            : "No consent timestamp"}
                        </p>
                      </td>
                      <td className="min-w-60">
                        <p className="text-xs">{displayDate(latest.created_at)}</p>
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-bold">
                            {history.length} {history.length === 1 ? "submission" : "submissions"}
                          </summary>
                          <ul className="mt-3 space-y-4">
                            {history.map((lead) => (
                              <li key={lead.id} className="rounded-xl bg-blush p-3 text-xs">
                                <p>{displayDate(lead.created_at)}</p>
                                <p className="mt-1">{focus(lead)}</p>
                                <p className="mt-1">
                                  {lead.marketing_consent
                                    ? "Opted in on this submission"
                                    : "No follow-up opt-in on this submission"}
                                </p>
                                {lead.session_key ? (
                                  <Link
                                    className="mt-2 inline-block break-all font-bold underline"
                                    to="/admin/assessments/$id"
                                    params={{ id: lead.session_key }}
                                  >
                                    {lead.session_key}
                                  </Link>
                                ) : (
                                  <p className="mt-2">No linked assessment</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
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
