import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  emailJourneyBrief,
  eligibleJourneyEmails,
  emailJourneyMarkdown,
  journeyEmailHtml,
  journeyEmailText,
  kitJourneyDrafts,
  emailSupportInvitation,
  legacyEmailPurposes,
} from "../src/assessment-v2/email-journey.ts";
import { emailV3Slots, emailSlotsForVersion } from "../src/assessment-v2/email-contract.ts";
import {
  emailJourneyResponseSchema,
  validateEmailJourneyOutput,
  paragraphWordCount,
} from "../src/assessment-v2/email-validation.ts";
import {
  createGeminiEmailJourneyWriter,
  buildEmailJourney,
  emailJourneySystemInstruction,
} from "../src/assessment-v2/email-journey.server.ts";
import { fixedTestEmailJourney } from "../src/assessment-v2/email-journey-fixed.ts";
import { assertFixedEmailTestAllowed } from "../src/assessment-v2/email-job-policy.server.ts";
import { emailTopicGuides } from "../src/assessment-v2/email-topic-guides.ts";
import { problemById } from "../src/assessment-v2/problem-bank.ts";
import { fictionalSession, fictionalOutput } from "./fixtures/email-v3-fictional.mjs";
const clone = () => structuredClone(fictionalOutput);
const recorder = (records) => ({
  async start(spec) {
    records.push(spec);
    return "call";
  },
  async finish(id, data) {
    records.push({ id, ...data });
  },
});
const response = (value) =>
  new Response(
    JSON.stringify({
      modelVersion: "gemini-mocked",
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }],
    }),
  );
const build = (value = fictionalOutput, session = fictionalSession()) =>
  buildEmailJourney(
    session,
    value,
    "Fictional editorial sample; no model called",
    "2026-10-16T12:00:00Z",
  );

test("one v3 contract defines five purposes, positional section roles, targets and counts", () => {
  assert.deepEqual(
    emailV3Slots.map((s) => s.purpose),
    [
      "detailed_report",
      "obstacle_distinction",
      "bounded_test",
      "result_interpretation",
      "next_decision",
    ],
  );
  assert.deepEqual(
    emailV3Slots.map((s) => s.roles.length),
    [4, 3, 3, 3, 3],
  );
  assert.deepEqual(emailV3Slots[3].roles, [
    "interpretation_frame",
    "outcome_branches",
    "smallest_next_adjustment",
  ]);
  const brief = emailJourneyBrief(fictionalSession());
  assert.deepEqual(
    brief.slots.map((s) => s.sectionCount),
    [4, 3, 3, 3, 3],
  );
  assert.deepEqual(
    brief.slots.map((s) => s.focusId),
    ["P03", "P03", "P03", "P03", "P03"],
  );
  assert.equal(brief.threadQuestionId, undefined);
  assert.deepEqual(
    validateEmailJourneyOutput(clone(), brief).map(paragraphWordCount),
    fictionalOutput.emails.map(paragraphWordCount),
  );
});

test("all eligible topics have compact advisory hypotheses, checks, distinct branches and limits; only selected guides are sent", () => {
  assert.deepEqual(Object.keys(emailTopicGuides).sort(), Object.keys(problemById).sort());
  for (const guide of Object.values(emailTopicGuides)) {
    assert.equal(guide.explanations.length, 2);
    assert.ok(guide.explanations.every((e) => e.possibility && e.clue));
    assert.ok(
      guide.firstCheck.action && guide.firstCheck.observe && guide.boundedTest && guide.limits,
    );
    assert.ok(guide.obstacleTool.action && guide.obstacleTool.record && guide.obstacleTool.use);
    assert.notEqual(guide.obstacleTool.action, guide.firstCheck.action);
    assert.ok(guide.results.length >= 2);
    assert.equal(new Set(guide.results.map((r) => r.nextAdjustment)).size, guide.results.length);
  }
  const session = fictionalSession();
  session.result.problems.push({
    problemId: "P16",
    evidence: "contradicted",
    prioritySignal: 1,
    supportSignal: 0,
    impactSignal: 0,
    urgencySignal: 0,
  });
  session.result.priority = ["P03", "P04"];
  const brief = emailJourneyBrief(session);
  assert.deepEqual(
    brief.topics.map((t) => t.id),
    ["P03", "P04"],
  );
  assert.equal(brief.jointPriority, true);
  assert.ok(brief.topics.every((t) => t.guide.advisory));
  assert.equal(brief.topics.length, 2);
});

test("one mocked Gemini call creates all five v3 emails and records actual request, response and validated output", async () => {
  const session = fictionalSession();
  session.traceToken = "private-capability";
  const records = [];
  let calls = 0;
  const writer = createGeminiEmailJourneyWriter({
    apiKey: "test-secret",
    trace: recorder(records),
    fetcher: async (url, init) => {
      calls++;
      assert.ok(!url.includes("test-secret"));
      assert.equal(init.headers["x-goog-api-key"], "test-secret");
      const request = JSON.parse(init.body);
      const prompt = request.contents[0].parts[0].text;
      assert.ok(prompt.includes("supply request"));
      assert.ok(!prompt.includes("private-capability"));
      assert.ok(!prompt.includes("threadQuestionId"));
      assert.ok(!request.systemInstruction.parts[0].text.includes("EVERY email"));
      assert.ok(request.systemInstruction.parts[0].text.includes("outcome_branches"));
      assert.ok(request.systemInstruction.parts[0].text.includes("Do not expose that planning"));
      return response(clone());
    },
  });
  const result = await writer.generate(session);
  assert.equal(calls, 1);
  assert.equal(result.version, "email-journey-v3");
  assert.equal(result.model, "gemini-mocked");
  assert.equal(result.threadQuestionId, undefined);
  assert.equal(records[1].status, "succeeded");
  assert.deepEqual(records[1].output, result);
  assert.equal(result.emails[4].supportInvitation, true);
  assert.equal(result.emails[4].nextEmailPreview, undefined);
});

test("runtime rejects objective slot, field, reference and markup defects", () => {
  const brief = emailJourneyBrief(fictionalSession());
  const mutations = [
    (d) => (d.planning = "Internal planning must not be returned"),
    (d) => (d.emails[0].sections[0].role = "result_summary"),
    (d) => (d.emails[2].sections = structuredClone(d.emails[1].sections)),
    (d) => ([d.emails[0], d.emails[1]] = [d.emails[1], d.emails[0]]),
    (d) => (d.emails[1].purpose = "primary_awareness"),
    (d) => (d.emails[4].focusId = "P04"),
    (d) => d.emails[0].sections.pop(),
    (d) => d.emails.pop(),
    (d) => delete d.emails[2].mainAction,
    (d) => (d.emails[1].sections[0].paragraphs = "wrong type"),
    (d) => (d.emails[0].sections[0].sourceQuestionIds = ["q999"]),
    (d) => (d.emails[0].subject = "{{ subscriber.email }}"),
    (d) => (d.emails[0].preview = "<script>"),
    (d) => (d.emails[1].sections[0].paragraphs = ["[link](https://example.com)"]),
    (d) => (d.emails[0].subject = "bad\nsubject"),
    (d) => (d.emails[1].mainAction = d.emails[0].mainAction),
    (d) => (d.emails[1].subject = d.emails[0].subject),
    (d) => (d.emails[1].sections[0].paragraphs = [d.emails[1].mainAction]),
    (d) => d.emails[2].sections.forEach((s) => (s.sourceQuestionIds = [])),
    (d) =>
      (d.emails[2].sections[0].paragraphs = [
        "Your team described a recurring delay in approvals. Your team described a recurring delay in approvals.",
      ]),
  ];
  for (const mutate of mutations) {
    const data = clone();
    mutate(data);
    assert.throws(() => validateEmailJourneyOutput(data, brief));
  }
});

test("known internal IDs and instruction fragments cannot leak through any customer field, including mainAction", () => {
  const brief = emailJourneyBrief(fictionalSession());
  for (const leaked of [
    "q4",
    "probe_p03",
    "sourceQuestionIds",
    "result_summary",
    "Return only JSON",
    "P03",
  ])
    for (const field of ["subject", "preview", "mainAction", "heading", "paragraph"]) {
      const data = clone();
      const email = data.emails[1];
      if (field === "heading") email.sections[0].heading = `Check ${leaked}`;
      else if (field === "paragraph") email.sections[0].paragraphs[0] += ` Review ${leaked}.`;
      else email[field] = `Check ${leaked}.`;
      assert.throws(() => validateEmailJourneyOutput(data, brief), /internal/);
    }
  const valid = clone();
  valid.emails[1].subject = "Q4 planning: keep the scope small";
  valid.emails[1].preview = "A liquid reserve is an ordinary phrase, not a template instruction.";
  assert.equal(validateEmailJourneyOutput(valid, brief).length, 5);
});

function setWords(data, index, total) {
  const sections = data.emails[index].sections;
  sections.forEach(
    (section, i) =>
      (section.paragraphs = [
        Array.from(
          { length: Math.floor(total / sections.length) + (i < total % sections.length ? 1 : 0) },
          (_, j) => (j === 0 ? `Observation${index}${i}` : "evidence"),
        ).join(" "),
      ]),
  );
}
test("paragraph bounds are objective, separate from targets, and allow sparse evidence without padding", () => {
  const brief = emailJourneyBrief(fictionalSession());
  assert.equal(brief.sparseEvidence, false);
  for (const [i, slot] of emailV3Slots.entries()) {
    for (const words of [slot.acceptedWords[0], slot.acceptedWords[1]]) {
      const data = clone();
      setWords(data, i, words);
      assert.equal(validateEmailJourneyOutput(data, brief).length, 5);
    }
    for (const words of [slot.acceptedWords[0] - 1, slot.acceptedWords[1] + 1]) {
      const data = clone();
      setWords(data, i, words);
      assert.throws(() => validateEmailJourneyOutput(data, brief), /length/);
    }
  }
  const sparse = { ...brief, sparseEvidence: true };
  const short = clone();
  emailV3Slots.forEach((slot, i) => setWords(short, i, slot.sparseMinimum));
  assert.equal(validateEmailJourneyOutput(short, sparse).length, 5);
});

test("compact provider schema derives allowed values from the contract; runtime retains exact slot validation", () => {
  const brief = emailJourneyBrief(fictionalSession());
  const schema = emailJourneyResponseSchema(brief).schema;
  const item = schema.properties.emails.items;
  assert.equal(item.type, "object");
  assert.equal(item.anyOf, undefined);
  assert.deepEqual(
    item.properties.purpose.enum,
    emailV3Slots.map((s) => s.purpose),
  );
  assert.equal(schema.properties.emails.minItems, 5);
  assert.equal(schema.properties.emails.maxItems, 5);
  assert.deepEqual(item.properties.number, { type: "integer", minimum: 1, maximum: 5 });
  assert.equal(item.properties.sections.minItems, 3);
  assert.equal(item.properties.sections.maxItems, 4);
  assert.deepEqual(item.properties.focusId.enum, ["P03"]);
  assert.deepEqual(
    item.properties.sections.items.properties.sourceQuestionIds.items.enum,
    brief.responses.filter((r) => !r.skipped).map((r) => r.questionId),
  );
  // One shared shape/reference enum avoids five expanded branches on Gemini's provider path.
  assert.equal(JSON.stringify(schema).split('"sourceQuestionIds":').length - 1, 1);
  const empty = { ...brief, primaryId: null, responses: [] };
  const nullItem = emailJourneyResponseSchema(empty).schema.properties.emails.items;
  assert.deepEqual(nullItem.properties.focusId, { type: "null" });
  assert.equal(nullItem.properties.sections.items.properties.sourceQuestionIds.maxItems, 0);
  for (const mutate of [
    (d) => {
      d.emails[0].purpose = d.emails[1].purpose;
    },
    (d) => {
      d.emails[0].sections.pop();
    },
    (d) => {
      [d.emails[0], d.emails[1]] = [d.emails[1], d.emails[0]];
    },
    (d) => {
      d.emails[2].focusId = "P04";
    },
  ]) {
    const data = clone();
    mutate(data);
    assert.throws(() => validateEmailJourneyOutput(data, brief), /structure/);
  }
  assert.ok(emailJourneySystemInstruction.includes("No mandatory three-C section"));
});

test("each email can cite its own relevant answer; skipped answers are omitted and cannot be cited", async () => {
  const session = fictionalSession();
  session.answers.push({
    questionId: "q11",
    text: "",
    skipped: true,
    submittedAt: session.createdAt,
  });
  const data = clone();
  data.emails[4].sections.forEach((s) => (s.sourceQuestionIds = ["probe_p04"]));
  const records = [];
  const writer = createGeminiEmailJourneyWriter({
    apiKey: "x",
    trace: recorder(records),
    fetcher: async () => response(data),
  });
  assert.equal((await writer.generate(session)).emails.length, 5);
  assert.ok(!records[0].request.contents[0].parts[0].text.includes('"questionId":"q11"'));
  assert.ok(records[0].request.contents[0].parts[0].text.includes('"omittedAnswerCount":1'));
  data.emails[4].sections[0].sourceQuestionIds = ["q11"];
  assert.throws(
    () => validateEmailJourneyOutput(data, emailJourneyBrief(session)),
    /does not exist/,
  );
});

test("null primary/secondary and joint priorities retain authoritative metadata and truthful previews", () => {
  const one = fictionalSession();
  one.result.problems = one.result.problems.slice(0, 1);
  const single = build(clone(), one);
  assert.equal(single.secondaryId, null);
  assert.equal(single.emails[4].focusId, "P03");
  assert.ok(!single.emails[3].nextEmailPreview.includes("other finding"));
  const empty = fictionalSession();
  empty.result.problems = [];
  empty.result.priority = [];
  empty.answers = [];
  const raw = clone();
  raw.emails.forEach((e) => {
    e.focusId = null;
    e.sections.forEach((s) => (s.sourceQuestionIds = []));
  });
  const none = build(raw, empty);
  assert.equal(none.primaryId, null);
  assert.equal(none.secondaryId, null);
  assert.match(none.emails[0].nextEmailPreview, /before naming a problem/);
  const joint = fictionalSession();
  joint.result.priority = ["P03", "P04"];
  const both = build(clone(), joint);
  assert.equal(both.jointPriority, true);
  // These fixtures check metadata and structure, not whether arbitrary prose is factually justified.
});

test("hypothetical-only and neutral/contradictory inputs retain their evidence limits without repeated inserted caveats", () => {
  const session = fictionalSession();
  session.questions.find((q) => q.id === "q4").answerMode = "scenario_match";
  session.answers = [
    {
      questionId: "q4",
      text: "A hypothetical example selected as a similarity, not an observed event.",
      submittedAt: session.createdAt,
    },
  ];
  const brief = emailJourneyBrief(session);
  assert.equal(brief.responses[0].evidenceUse, "hypothetical_match");
  assert.equal(brief.sparseEvidence, true);
  const data = clone();
  data.emails.forEach((e) => e.sections.forEach((s) => (s.sourceQuestionIds = ["q4"])));
  assert.deepEqual(validateEmailJourneyOutput(data, brief), data.emails); // No keyword-based rewriting of model paragraphs.
  session.answers = [{ questionId: "q1", optionIds: ["unsure"], submittedAt: session.createdAt }];
  session.result.problems.forEach((p) => (p.evidence = "contradicted"));
  const neutral = emailJourneyBrief(session);
  assert.equal(neutral.primaryId, null);
  assert.equal(neutral.responses[0].evidenceUse, "uncertain_or_none");
  assert.ok(
    emailJourneySystemInstruction.includes('do not turn "would be difficult" into "happened"'),
  );
});

test("safe customer rendering has one action/invitation, while staff export keeps separate evidence metadata", () => {
  const journey = build();
  for (const email of journey.emails) {
    const html = journeyEmailHtml(email, journey.version),
      text = journeyEmailText(email, journey.version);
    assert.equal((html.match(/Your next step/g) ?? []).length, 1);
    assert.equal(text.split(email.mainAction).length - 1, 1);
    assert.ok(!html.includes("Staff evidence references"));
    assert.ok(!html.includes("probe_p"));
  }
  const final = journeyEmailHtml(journey.emails[4], journey.version);
  assert.equal(final.split(emailSupportInvitation.href).length - 1, 1);
  assert.ok(!final.includes(emailSupportInvitation.label));
  assert.ok(final.includes("{{ unsubscribe_url }}"));
  assert.match(emailJourneyMarkdown(journey), /Staff evidence references/);
  const unsafe = {
    ...journey.emails[4],
    mainAction: "<input> {{ secret }} & action",
    nextEmailPreview: "<script> & next",
  };
  const escaped = journeyEmailHtml(unsafe, journey.version);
  assert.ok(!escaped.includes("<input>"));
  assert.ok(!escaped.includes("<script>"));
  assert.ok(!escaped.includes("{{ secret }}"));
  assert.ok(escaped.includes("&amp;"));
});

test("v3 report scope note is brief in every rendering path; legacy scope copy is unchanged", () => {
  const journey = build();
  const expected =
    "This Snapshot offers a starting point based on your answers. It is not a diagnosis or a verified audit.";
  for (const rendered of [
    journeyEmailHtml(journey.emails[0], journey.version),
    journeyEmailText(journey.emails[0], journey.version),
    emailJourneyMarkdown(journey),
    kitJourneyDrafts(journey, 42, false)[0].payload.content,
    kitJourneyDrafts(journey, 42, true)[0].payload.content,
  ]) {
    assert.ok(rendered.includes(expected));
    assert.ok(!rendered.includes("shares describe relative emphasis"));
    assert.ok(!rendered.includes("measured organizational scores"));
  }
  assert.ok(journeyEmailHtml(journey.emails[0]).includes("shares describe relative emphasis"));
  assert.ok(!journeyEmailHtml(journey.emails[1], journey.version).includes(expected));
});

test("separate outcome paragraph entries remain separate in customer HTML and text", () => {
  const email = structuredClone(build().emails[3]);
  email.sections[1].paragraphs = [
    "If the request moves, keep the agreed handoff for one comparable request.",
    "If it returns for a missing item, clarify that input before changing the route.",
    "If the decision boundary is disputed, agree who can decide before widening the test.",
  ];
  const html = journeyEmailHtml(email, "email-journey-v3");
  const text = journeyEmailText(email, "email-journey-v3");
  for (const paragraph of email.sections[1].paragraphs)
    assert.ok(html.includes(`<p>${paragraph}</p>`));
  assert.ok(text.includes(email.sections[1].paragraphs.join("\n\n")));
  // This verifies paragraph preservation, not whether arbitrary model branches are useful or accurate.
});

test("report-only delivery stands alone; opt-in retains private recipient targeting and existing offsets", () => {
  const journey = build();
  assert.deepEqual(eligibleJourneyEmails(false), [1]);
  assert.deepEqual(eligibleJourneyEmails(true), [1, 2, 3, 4, 5]);
  const only = kitJourneyDrafts(journey, 42, false);
  assert.equal(only.length, 1);
  assert.ok(!only[0].payload.content.includes(journey.emails[0].nextEmailPreview));
  const all = kitJourneyDrafts(journey, 42, true);
  assert.equal(all.length, 5);
  assert.deepEqual(
    all.map((e) => e.dayOffset),
    [0, 2, 4, 7, 10],
  );
  assert.ok(all.every((d) => d.payload.public === false && d.payload.send_at === null));
  assert.equal(all[0].payload.subscriber_filter[0].all[0].ids[0], 42);
  assert.throws(() => kitJourneyDrafts(journey, 0, true));
  assert.throws(() => emailSlotsForVersion("unknown"));
});

test("saved v1/v2 fixtures retain exact customer, export and delivery bodies without regeneration", async () => {
  const fixtures = JSON.parse(
    await readFile(new URL("./fixtures/email-journey-legacy.json", import.meta.url), "utf8"),
  );
  for (const f of fixtures) {
    assert.deepEqual(f.journey.emails.map(journeyEmailHtml), f.html);
    assert.deepEqual(f.journey.emails.map(journeyEmailText), f.text);
    assert.equal(emailJourneyMarkdown(f.journey), f.markdown);
    assert.deepEqual(kitJourneyDrafts(f.journey, 42, false), f.reportOnly);
    assert.deepEqual(kitJourneyDrafts(f.journey, 42, true), f.optedIn);
    assert.deepEqual(
      emailSlotsForVersion(f.journey.version).map((s) => s.purpose),
      legacyEmailPurposes,
    );
  }
  const fixed = fixedTestEmailJourney(fictionalSession());
  assert.equal(fixed.version, "email-journey-v2");
  assert.equal(fixed.source, "fixed_test");
  assert.deepEqual(
    fixed.emails.map((e) => e.purpose),
    legacyEmailPurposes,
  );
});

test("failed validation is logged as failure, with no substitute journey", async () => {
  const records = [];
  const invalid = clone();
  invalid.emails[0].mainAction = "Review probe_p03";
  const writer = createGeminiEmailJourneyWriter({
    apiKey: "x",
    trace: recorder(records),
    fetcher: async () => response(invalid),
  });
  await assert.rejects(writer.generate(fictionalSession()));
  assert.equal(records[1].status, "failed");
  assert.equal(records[1].output, null);
  assertFixedEmailTestAllowed("test", "test@example.com", "test@example.com");
  for (const mode of [undefined, "production", "other"])
    assert.throws(() => assertFixedEmailTestAllowed(mode, "test@example.com", "test@example.com"));
});
