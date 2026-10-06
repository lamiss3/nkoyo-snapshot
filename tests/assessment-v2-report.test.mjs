import test from "node:test";
import assert from "node:assert/strict";
import { buildSessionReport, sessionReportMarkdown } from "../src/assessment-v2/session-report.ts";
import { createAssessmentSession, submitAssessmentAnswer, advanceAssessment, questionsForStage } from "../src/assessment-v2/orchestrator.ts";
import { AssessmentTrace, runTracedAdvance } from "../src/assessment-v2/trace-runtime.server.ts";
import { createJevEvaluator } from "../src/assessment-v2/jev.server.ts";
import { createGeminiQuestionWriter } from "../src/assessment-v2/gemini.server.ts";

class Store {
  session; eventsList = []; calls = [];
  async open(row) { return this.session ??= structuredClone(row); }
  async snapshot(row) { this.session = structuredClone(row); }
  async events(rows) { this.eventsList.push(...structuredClone(rows)); }
  async startCall(row) { this.calls.push(structuredClone(row)); }
  async finishCall(id, _, data) { Object.assign(this.calls.find((call) => call.id === id), structuredClone(data)); }
  async completed() {}
  input(contacts = []) { return { session: this.session, events: this.eventsList, calls: this.calls, contacts }; }
}
const contact = { email: "synthetic@example.com", first_name: "", organization: null, role_title: null, challenge: null, marketing_consent: false, created_at: "2026-10-06T12:00:00Z" };
const evaluatorFetch = async (_, init) => {
  const request = JSON.parse(init.body);
  const answers = Object.fromEntries(Object.keys(request.questions).map((id) => {
    if (id.endsWith("_impact") || id.endsWith("_urgency")) return [id, { type: "score", score: 3 }];
    const relevant = ["P03", "P04", ...(request.state.round === "initial" ? ["P09", "P16"] : [])].includes(id);
    return [id, { type: "choice", choice: relevant ? "supported" : "contradicted", probabilities: { supported: relevant ? 0.85 : 0.05, contradicted: relevant ? 0.05 : 0.85, possible: 0.05, insufficient_information: 0.05 } }];
  }));
  return new Response(JSON.stringify({ model: "jev-test", answers }));
};
const writerFetch = async (_, init) => {
  const two = JSON.parse(init.body).contents[0].parts[0].text.includes("exactly two");
  const questions = two ? ["Describe a recent decision delay and its impact.", "Describe a recent example of responsibility without authority."] : ["Were decision delays and authority gaps connected in a recent example?"];
  return new Response(JSON.stringify({ modelVersion: "gemini-test", candidates: [{ content: { parts: [{ text: JSON.stringify({ questions }) }] } }] }));
};

test("full readable report follows the three phases, real inputs, all outputs and email", async () => {
  const store = new Store();
  let session = createAssessmentSession();
  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["decisions", "authority"] });
  session = submitAssessmentAnswer(session, { questionId: "q2", optionIds: ["escalate"] });
  session = submitAssessmentAnswer(session, { questionId: "q3", optionIds: ["delay"] });
  session = submitAssessmentAnswer(session, { questionId: "q4", text: "Synthetic example: routine approvals delayed a service." });
  while (session.stage !== "complete") {
    const trace = new AssessmentTrace(store, session);
    const id = crypto.randomUUID();
    session = await runTracedAdvance(session, {
      evaluator: createJevEvaluator({ apiKey: "secret-jev-test", fetcher: evaluatorFetch, trace: trace.recorder(id) }),
      writer: createGeminiQuestionWriter({ apiKey: "secret-gemini-test", fetcher: writerFetch, trace: trace.recorder(id) }),
    }, trace, id);
    for (const question of questionsForStage(session)) session = submitAssessmentAnswer(session, question.kind === "text" ? { questionId: question.id, text: "Synthetic example: two weeks were lost waiting for approval." } : { questionId: question.id, optionIds: ["option_3"] });
  }
  const report = buildSessionReport(store.input([contact]));
  assert.equal(report.sections.length, 5);
  const text = sessionReportMarkdown(report);
  const headings = report.sections.flatMap((section) => section.blocks.filter((block) => block.kind === "heading").map((block) => block.text));
  const qHeading = headings.filter((value) => /^Q\d+\./.test(value)).map((value) => Number(value.match(/^Q(\d+)/)[1]));
  assert.deepEqual(qHeading, Array.from({ length: 11 }, (_, index) => index + 1));
  assert.equal((text.match(/### Jev evaluation/g) ?? []).length, 4);
  assert.equal((text.match(/### Gemini question writing/g) ?? []).length, 2);
  assert.ok(text.indexOf("Q4") < text.indexOf("Jev evaluation"));
  assert.ok(headings.indexOf("Gemini question writing") < headings.findIndex((value) => value.startsWith("Q9.")));
  assert.ok(text.includes("synthetic@example") && text.includes("Not opted in"));
  assert.ok(text.includes("Getting decisions made or approvals completed"));
  assert.ok(text.includes("Supported by the answers") && text.includes("Evidence against this issue"));
  assert.ok(text.includes("Impact signal") && text.includes("Urgency signal"));
  assert.ok(text.includes("Priority for discussion") && text.includes("confirmed"));
  assert.ok(!text.includes(session.traceToken) && !text.includes(store.session.token_hash));
  assert.ok(!text.includes("secret-jev-test") && !text.includes("secret-gemini-test"));
  assert.ok(!text.includes("Authorization") && !text.includes("request body"));
});

test("draft edits are current, earlier model inputs remain unchanged, and Markdown is escaped", async () => {
  const store = new Store();
  let session = createAssessmentSession();
  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["decisions"] });
  session = submitAssessmentAnswer(session, { questionId: "q2", optionIds: ["escalate"] });
  session = submitAssessmentAnswer(session, { questionId: "q3", optionIds: ["delay"] });
  session = submitAssessmentAnswer(session, { questionId: "q4", text: "Original model input" });
  const trace = new AssessmentTrace(store, session);
  await trace.checkpoint(session, "server", "advance_started");
  const call = { id: "one", provider: "jev", operation: "initial", status: "failed", configured_model: "jev-test", response_model: null, duration_ms: 1, started_at: session.updatedAt, request: { state: { respondentAnswers: [{ question: "Example question", selectedAnswers: [], writtenAnswer: "Original model input" }] } }, output: null };
  store.calls.push(call, { ...call, id: "two", status: "started" });
  session = submitAssessmentAnswer(session, { questionId: "q4", text: "# Edited answer\n[click](https://example.com) <script>alert(1)</script> | cell" });
  await trace.checkpoint(session, "browser", "progress_saved", "q4");
  const report = buildSessionReport(store.input());
  const text = sessionReportMarkdown(report);
  assert.ok(text.includes("saved draft; not yet confirmed"));
  assert.ok(text.includes("Original model input"));
  assert.ok(text.includes("\\# Edited answer"));
  assert.ok(!text.includes("<script>") && !text.includes("[click](https://example.com)"));
  assert.ok(text.includes("No final result yet"));
  assert.ok(text.includes("attempt 1") && text.includes("attempt 2") && text.includes("pending or interrupted"));
  assert.ok(text.includes("Email: not provided"));
  await trace.checkpoint(session, "browser", "answer_confirmed", "q4");
  const q4 = buildSessionReport(store.input([contact])).sections[1].blocks;
  assert.ok(q4.some((block) => block.kind === "paragraph" && block.text.startsWith("Respondent answer — confirmed") && block.text.includes(session.answers.at(-1).submittedAt.slice(0, 10))));
});

test("early completion and fixed backups never claim nonexistent model generations", async () => {
  let session = createAssessmentSession();
  for (const question of questionsForStage(session)) session = submitAssessmentAnswer(session, question.kind === "text" ? { questionId: question.id, text: "No difficulty observed." } : { questionId: question.id, optionIds: [question.options.at(-1).id] });
  session = await advanceAssessment(session, { evaluator: { evaluate: async (request) => ({ round: request.round, model: "synthetic-local", rubricVersion: "test", evaluations: request.problemIds.map((problemId) => ({ problemId, choice: "insufficient_information", probabilities: { insufficient_information: 1, supported: 0, possible: 0, contradicted: 0 } })) }) } });
  const store = new Store();
  await new AssessmentTrace(store, session).checkpoint(session, "server", "advance_completed");
  const report = sessionReportMarkdown(buildSessionReport(store.input()));
  assert.ok(report.includes("No priority topic"));
  assert.ok(report.includes("finished early"));
  assert.ok(report.includes("historical provider requests were not captured"));
  assert.ok(!report.includes("### Q9"));
  const fallback = { ...session, stage: "bridge", result: null, questions: [...session.questions, { id: "q9", kind: "text", text: "Describe how these issues connect, if at all.", source: "fallback" }] };
  await new AssessmentTrace(store, fallback).checkpoint(fallback, "server", "advance_completed");
  const fallbackText = sessionReportMarkdown(buildSessionReport(store.input()));
  assert.ok(fallbackText.includes("Fixed backup question"));
  assert.ok(!fallbackText.includes("Written by Gemini"));
});
