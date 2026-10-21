import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeAssessments,
  dashboardMetrics,
  uniqueContacts,
  toCsv,
  legacyAdminPath,
  withinDates,
} from "../src/admin/model.ts";

const saved = (id, completed = true) => ({
  id: `saved-${id}`,
  session_key: id,
  started_at: "2026-10-01T12:00:00Z",
  completed_at: completed ? "2026-10-02T12:00:00Z" : null,
  summary_key: "P01",
  result_patterns: ["P01", "P01", "P02"],
});
const trace = (id, status = "active") => ({
  session_id: id,
  status,
  stage: status === "completed" ? "complete" : "opening",
  version: "adaptive-v1",
  created_at: "2026-10-01T12:00:00Z",
  updated_at: "2026-10-03T12:00:00Z",
  completed_at: status === "completed" ? "2026-10-02T12:00:00Z" : null,
});
const lead = (id, email, at, consent, session) => ({
  id,
  email,
  created_at: at,
  marketing_consent: consent,
  session_key: session,
  first_name: "Name",
  organization: null,
  role_title: null,
  challenge: null,
  marketing_consent_at: consent ? at : null,
});

test("trace and final result reconcile by session key, without adding repeat events", () => {
  const rows = mergeAssessments([saved("same")], [trace("same"), trace("other")]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.id === "same").status, "completed");
  const metric = dashboardMetrics(
    rows,
    [],
    [1, 2, 3].map((i) => ({
      id: `${i}`,
      session_key: "same",
      event_type: "snapshot_started",
      created_at: "2026-10-01T12:00:00Z",
    })),
    { from: "", to: "", excluded: "" },
  );
  assert.equal(metric.started, 2);
  assert.equal(metric.rawStartEvents, 3);
  assert.equal(metric.completionRate, 0.5);
  assert.deepEqual(metric.patterns, [
    ["P01", 1],
    ["P02", 1],
  ]);
});

test("contact grouping keeps all submissions and latest recorded consent, including a later refusal", () => {
  const input = [
    lead("older", "Test@Example.invalid", "2026-10-01T00:00:00Z", true, "one"),
    lead("newer", " test@example.invalid ", "2026-10-02T00:00:00Z", false, "two"),
  ];
  const copy = structuredClone(input);
  const contacts = uniqueContacts(input);
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].latest.marketing_consent, false);
  assert.equal(contacts[0].history.length, 2);
  assert.deepEqual(input, copy);
});

test("exclusion is view-only, matches exact known email/IDs, and includes linked events", () => {
  const rows = mergeAssessments([saved("internal"), saved("real")], []);
  const leads = [lead("test", "staff@example.invalid", "2026-10-01T00:00:00Z", true, "internal")];
  const events = [
    {
      id: "click",
      session_key: "internal",
      event_type: "booking_cta_click",
      created_at: "2026-10-02T00:00:00Z",
    },
  ];
  const metric = dashboardMetrics(rows, leads, events, {
    from: "",
    to: "",
    excluded: "STAFF@example.invalid",
  });
  assert.equal(metric.started, 1);
  assert.equal(metric.completed, 1);
  assert.equal(metric.bookingClicks, 0);
  assert.equal(metric.optIns, 0);
  assert.equal(rows.length, 2);
  assert.equal(leads.length, 1);
});

test("empty analytics have no invented conversion and date range uses entire local end date", () => {
  assert.equal(
    dashboardMetrics([], [], [], { from: "", to: "", excluded: "" }).completionRate,
    null,
  );
  assert.equal(
    withinDates(new Date(2026, 9, 21, 23, 59).toISOString(), "2026-10-21", "2026-10-21"),
    true,
  );
  assert.equal(
    withinDates(new Date(2026, 9, 22, 0, 0).toISOString(), "2026-10-21", "2026-10-21"),
    false,
  );
});

test("CSV retains quotes/newlines and neutralizes spreadsheet formulas", () => {
  const csv = toCsv([
    {
      email: 'a"b@example.invalid',
      answer: '=HYPERLINK("https://example.invalid")',
      note: "line1\nline2",
    },
  ]);
  assert.ok(csv.includes('a""b@example.invalid'));
  assert.ok(csv.includes("\"'=HYPERLINK("));
  assert.ok(csv.includes('"line1\nline2"'));
});

test("legacy staff and email section links redirect to focused pages", () => {
  assert.equal(legacyAdminPath("#staff-accounts"), "/admin/staff");
  assert.equal(legacyAdminPath("#email-journeys-title"), "/admin/email-journeys");
  assert.equal(legacyAdminPath("#unknown"), null);
});
