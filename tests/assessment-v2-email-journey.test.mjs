import assert from "node:assert/strict";
import test from "node:test";
import { createAssessmentSession } from "../src/assessment-v2/orchestrator.ts";
import {
  emailJourneyBrief,
  eligibleJourneyEmails,
  emailJourneyMarkdown,
  journeyEmailHtml,
  kitJourneyDrafts,
} from "../src/assessment-v2/email-journey.ts";
import { createGeminiEmailJourneyWriter } from "../src/assessment-v2/email-journey.server.ts";
import { fixedTestEmailJourney } from "../src/assessment-v2/email-journey-fixed.ts";
import { assertFixedEmailTestAllowed } from "../src/assessment-v2/email-job-policy.server.ts";

test("fixed drafts retain saved topics and answer evidence with honest provenance, including uncertain results", () => {
  const value = session(),
    draft = fixedTestEmailJourney(value);
  assert.equal(draft.source, "fixed_test");
  assert.equal(draft.model, "fixed-test-v1 (no Gemini)");
  assert.equal(draft.sessionId, value.id);
  assert.equal(draft.jointPriority, true);
  assert.deepEqual(
    draft.emails.map((email) => email.focusId),
    ["P03", "P03", "P03", "P03", "P04"],
  );
  assert.ok(draft.emails.every((email) => email.subject.startsWith("[TEST — FIXED]")));
  assert.ok(JSON.stringify(draft).includes("approvals waited two weeks"));
  assert.ok(!JSON.stringify(draft).includes("private-capability"));
  assert.ok(draft.emails[0].sections.some((section) => section.sourceQuestionIds.includes("q4")));
  assert.equal(kitJourneyDrafts(draft, 22, true).length, 5);
  assert.equal(kitJourneyDrafts(draft, 22, false).length, 1);
  value.result.problems = [];
  value.result.priority = [];
  value.answers = [];
  const uncertain = fixedTestEmailJourney(value);
  assert.equal(uncertain.primaryId, null);
  assert.equal(uncertain.secondaryId, null);
  assert.ok(JSON.stringify(uncertain).includes("No second issue identified"));
});
test("fixed test mode cannot address ordinary contacts or run in production", () => {
  assertFixedEmailTestAllowed("test", "Test@EXAMPLE.com", " test@example.com ");
  for (const mode of [undefined, "production", "other"])
    assert.throws(() => assertFixedEmailTestAllowed(mode, "test@example.com", "test@example.com"));
  assert.throws(() => assertFixedEmailTestAllowed("test", "other@example.com", "test@example.com"));
  assert.throws(() => assertFixedEmailTestAllowed("test", "test@example.com", ""));
});

function session() {
  const value = createAssessmentSession("synthetic-email-example");
  value.stage = "complete";
  value.answers = [
    {
      questionId: "q4",
      text: "Synthetic example: approvals waited two weeks.",
      submittedAt: value.createdAt,
    },
  ];
  value.traceToken = "private-capability";
  value.result = {
    problems: [
      {
        problemId: "P03",
        evidence: "supported",
        prioritySignal: 0.82,
        supportSignal: 0.9,
        impactSignal: 0.8,
        urgencySignal: 0.7,
      },
      {
        problemId: "P04",
        evidence: "possible",
        prioritySignal: 0.8,
        supportSignal: 0.8,
        impactSignal: 0.8,
        urgencySignal: 0.7,
      },
      {
        problemId: "P16",
        evidence: "contradicted",
        prioritySignal: 0.99,
        supportSignal: 0.1,
        impactSignal: null,
        urgencySignal: null,
      },
    ],
    priority: ["P03", "P04"],
    threeCShare: { culture: 35, capacity: 39, compliance: 26 },
    generatedAt: value.createdAt,
  };
  return value;
}
function output(brief) {
  return {
    emails: brief.slots.map((slot) => ({
      number: slot.number,
      purpose: slot.purpose,
      focusId: slot.focusId,
      subject: "A practical next step",
      preview: "A synthetic draft to review.",
      sections: Array.from({ length: slot.sectionCount }, () => ({
        heading: "Explore the evidence",
        paragraphs: [
          Array.from({ length: slot.number === 1 ? 50 : 30 }, () => "observation").join(" "),
        ],
        sourceQuestionIds: ["q4"],
      })),
    })),
  };
}
const response = (payload) =>
  new Response(
    JSON.stringify({
      modelVersion: "gemini-test",
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: JSON.stringify(payload) }] } },
      ],
    }),
    { status: 200 },
  );
function recorder(records) {
  return {
    async start(spec) {
      records.push(spec);
      return "call";
    },
    async finish(id, data) {
      records.push({ id, ...data });
    },
  };
}

test("journey keeps authoritative joint topics, excludes contradicted topics and limits non-opted-in delivery", () => {
  const value = session();
  const brief = emailJourneyBrief(value);
  assert.equal(brief.primaryId, "P03");
  assert.equal(brief.secondaryId, "P04");
  assert.equal(brief.jointPriority, true);
  assert.deepEqual(
    brief.slots.map((slot) => slot.focusId),
    ["P03", "P03", "P03", "P03", "P04"],
  );
  assert.ok(!JSON.stringify(brief).includes("private-capability"));
  assert.ok(!brief.topics.some((topic) => topic.id === "P16"));
  assert.deepEqual(eligibleJourneyEmails(false), [1]);
  assert.deepEqual(eligibleJourneyEmails(true), [1, 2, 3, 4, 5]);
  value.result.problems = value.result.problems.slice(0, 1);
  assert.equal(emailJourneyBrief(value).secondaryId, null);
  value.result.problems = [];
  assert.ok(emailJourneyBrief(value).slots.every((slot) => slot.focusId === null));
  value.stage = "opening";
  assert.throws(() => emailJourneyBrief(value), /completed/);
});

test("Gemini receives real evidence without credentials and records the complete draft", async () => {
  const value = session(),
    records = [];
  const writer = createGeminiEmailJourneyWriter({
    apiKey: "test-secret",
    trace: recorder(records),
    fetcher: async (url, init) => {
      assert.ok(!url.includes("test-secret"));
      const request = JSON.parse(init.body);
      assert.ok(request.contents[0].parts[0].text.includes("approvals waited two weeks"));
      assert.ok(!JSON.stringify(request).includes("private-capability"));
      return response(output(emailJourneyBrief(value)));
    },
  });
  const result = await writer.generate(value);
  assert.equal(result.status, "draft");
  assert.equal(result.model, "gemini-test");
  assert.equal(records[0].operation, "email_journey");
  assert.equal(records[1].status, "succeeded");
  assert.equal(records[1].output.emails.length, 5);
  assert.ok(emailJourneyMarkdown(result).includes("Check the staff Admin"));
  assert.ok(!emailJourneyMarkdown(result).includes("No emails have been sent"));
  const drafts = kitJourneyDrafts(result, 123, true);
  assert.deepEqual(
    drafts.map((draft) => draft.dayOffset),
    [0, 2, 4, 7, 10],
  );
  assert.ok(
    drafts.every((draft) => draft.payload.send_at === null && draft.payload.public === false),
  );
  assert.ok(drafts.every((draft) => draft.payload.subscriber_filter[0].all[0].ids[0] === 123));
  assert.equal(kitJourneyDrafts(result, 123, false).length, 1);
  assert.throws(() => kitJourneyDrafts(result, 0, true), /recipient tag/);
  assert.ok(!drafts[0].payload.content.includes("sourceQuestionIds"));
  const hostile = {
    ...result.emails[0],
    sections: [
      {
        heading: "<script>",
        paragraphs: ["{{ subscriber.email_address }} & another <input>"],
        sourceQuestionIds: ["q4"],
      },
    ],
  };
  const html = journeyEmailHtml(hostile);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("{{ subscriber.email_address }}"));
  assert.ok(html.includes("&amp;"));
  assert.ok(html.includes("{{ unsubscribe_url }}"));
});

test("invalid topic changes, invented evidence, unsafe markup and truncation fail and are logged", async () => {
  const value = session();
  for (const mutation of [
    (data) => {
      data.emails[4].focusId = "P16";
    },
    (data) => {
      data.emails[0].sections[0].sourceQuestionIds = ["q999"];
    },
    (data) => {
      data.emails[0].subject = "{{ subscriber.email_address }}";
    },
    (data) => {
      data.emails = data.emails.slice(0, 4);
    },
    (data) => {
      data.emails[2].sections.forEach((section) => {
        section.sourceQuestionIds = [];
      });
    },
  ]) {
    const records = [],
      data = output(emailJourneyBrief(value));
    mutation(data);
    const writer = createGeminiEmailJourneyWriter({
      apiKey: "test",
      trace: recorder(records),
      fetcher: async () => response(data),
    });
    await assert.rejects(writer.generate(value));
    assert.equal(records[1].status, "failed");
    assert.equal(records[1].output, null);
  }
});
