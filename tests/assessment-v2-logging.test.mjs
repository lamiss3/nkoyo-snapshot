import test from "node:test";
import assert from "node:assert/strict";
import { AssessmentTrace, runTracedAdvance } from "../src/assessment-v2/trace-runtime.server.ts";
import { AssessmentLogError, recordedModelCall, traceJson } from "../src/assessment-v2/provider-trace.server.ts";
import { createJevEvaluator } from "../src/assessment-v2/jev.server.ts";
import { createGeminiQuestionWriter } from "../src/assessment-v2/gemini.server.ts";
import { createAssessmentSession, submitAssessmentAnswer, questionsForStage } from "../src/assessment-v2/orchestrator.ts";
import { validateAssessmentSession } from "../src/assessment-v2/session-validation.ts";

class MemoryStore {
  sessions = new Map(); eventsByKey = new Map(); calls = new Map(); results = new Map();
  async open(row) {
    if (!this.sessions.has(row.session_id)) this.sessions.set(row.session_id, structuredClone(row));
    return this.sessions.get(row.session_id);
  }
  async snapshot(row, source) {
    const old = this.sessions.get(row.session_id);
    const stages = ["opening", "probes", "bridge", "finalists", "complete"];
    if (old.status === "completed" && row.status !== "completed") return;
    if (source === "browser" && (old.stage !== row.stage || old.snapshot_at > row.snapshot_at)) return;
    if (stages.indexOf(old.stage) > stages.indexOf(row.stage)) return;
    this.sessions.set(row.session_id, structuredClone(row));
  }
  async events(rows) { for (const row of rows) if (!this.eventsByKey.has(row.event_key)) this.eventsByKey.set(row.event_key, structuredClone(row)); }
  async startCall(row) { this.calls.set(row.id, structuredClone(row)); }
  async finishCall(id, _session, data) { this.calls.set(id, { ...this.calls.get(id), ...structuredClone(data) }); }
  async completed(id, data) { this.results.set(id, structuredClone(data)); }
}

function opening() {
  let session = createAssessmentSession();
  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["decisions", "authority"] });
  session = submitAssessmentAnswer(session, { questionId: "q2", optionIds: ["escalate"] });
  session = submitAssessmentAnswer(session, { questionId: "q3", optionIds: ["delay"] });
  return submitAssessmentAnswer(session, { questionId: "q4", text: "Routine approvals repeatedly delayed delivery this month." });
}

function jevFetch(_url, init) {
  const request = JSON.parse(init.body);
  const answers = {};
  for (const id of Object.keys(request.questions)) {
    if (id.endsWith("_impact") || id.endsWith("_urgency")) { answers[id] = { type: "score", score: 3, probabilities: {} }; continue; }
    const relevant = request.state.round === "initial" ? ["P03", "P04", "P09", "P16"].includes(id) : ["P03", "P04"].includes(id);
    const choice = relevant ? "supported" : "contradicted";
    answers[id] = { type: "choice", choice, probabilities: { insufficient_information: 0.05, possible: 0.05, supported: relevant ? 0.85 : 0.05, contradicted: relevant ? 0.05 : 0.85 } };
  }
  return Promise.resolve(new Response(JSON.stringify({ model: "jev-returned-model", answers }), { status: 200 }));
}

function geminiFetch(_url, init) {
  const questionCount = JSON.parse(init.body).contents[0].parts[0].text.includes("exactly two") ? 2 : 1;
  const questions = questionCount === 2 ? ["What recent approval delayed your work and what changed?", "When did responsibility and authority differ, if at all?"] : ["In a recent event, were approval delays and authority gaps connected or separate?"];
  return Promise.resolve(new Response(JSON.stringify({ modelVersion: "gemini-returned-model", usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 25 }, candidates: [{ content: { parts: [{ text: JSON.stringify({ questions }) }] } }] }), { status: 200 }));
}

test("full assessment records provider bodies, all stages and result without an email", async () => {
  const store = new MemoryStore();
  let session = opening();
  for (let step = 0; session.stage !== "complete"; step++) {
    const attemptId = crypto.randomUUID();
    const trace = new AssessmentTrace(store, session, ["secret-jev", "secret-gemini"]);
    const recorder = trace.recorder(attemptId);
    session = await runTracedAdvance(session, {
      evaluator: createJevEvaluator({ apiKey: "secret-jev", fetcher: jevFetch, trace: recorder }),
      writer: createGeminiQuestionWriter({ apiKey: "secret-gemini", fetcher: geminiFetch, trace: recorder }),
    }, trace, attemptId);
    for (const question of questionsForStage(session)) session = submitAssessmentAnswer(session, question.kind === "text" ?
      { questionId: question.id, text: "A recent approval delayed a service launch by two weeks." } : { questionId: question.id, optionIds: ["option_3"] });
    assert.ok(step < 5);
  }
  assert.equal(store.sessions.get(session.id).status, "completed");
  assert.ok(store.results.has(session.id));
  assert.equal(store.results.get(session.id).answers.responses.length, 11);
  assert.equal(store.results.get(session.id).followup_answers.evaluations.length, 4);
  const calls = [...store.calls.values()];
  assert.equal(calls.length, 6); // Four Jev rounds and two Gemini calls.
  assert.deepEqual(calls.filter((c) => c.provider === "jev").map((c) => c.operation), ["initial", "validation", "bridge", "final"]);
  assert.ok(calls.every((c) => c.status === "succeeded" && c.response.raw && c.output && c.duration_ms >= 0));
  assert.equal(calls.find((c) => c.provider === "gemini").usage.promptTokenCount, 100);
  assert.equal(calls.find((c) => c.provider === "jev").response_model, "jev-returned-model");
  const events = [...store.eventsByKey.values()];
  assert.equal(events.filter((e) => e.event_type === "advance_completed").length, 4);
  assert.ok(events.some((e) => e.event_type === "result_calculated"));
  const logged = JSON.stringify({ sessions: [...store.sessions.values()], events, calls, results: [...store.results.values()] });
  assert.ok(!logged.includes(session.traceToken));
  assert.ok(!logged.includes("secret-jev") && !logged.includes("secret-gemini"));
  assert.ok(!logged.includes('"Authorization"') && !logged.includes('"x-goog-api-key"'));
});

test("unfinished progress and restart are persisted, while duplicate checkpoints are deduplicated", async () => {
  const store = new MemoryStore();
  let session = createAssessmentSession();
  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["technology"] });
  const trace = new AssessmentTrace(store, session);
  await trace.checkpoint(session, "browser", "progress_saved", "q2");
  const count = store.eventsByKey.size;
  await trace.checkpoint(session, "browser", "progress_saved", "q2");
  assert.equal(store.eventsByKey.size, count);
  assert.equal(store.sessions.get(session.id).snapshot.answers.length, 1);
  assert.equal(store.sessions.get(session.id).status, "active");
  await trace.checkpoint(session, "browser", "session_restarted");
  assert.equal(store.sessions.get(session.id).status, "restarted");
  assert.equal(store.results.size, 0);
});

test("a different browser capability cannot overwrite or attach calls to another session", async () => {
  const store = new MemoryStore();
  const session = createAssessmentSession();
  await new AssessmentTrace(store, session).authorize();
  const intruder = { ...session, traceToken: "a".repeat(64) };
  await assert.rejects(() => new AssessmentTrace(store, intruder).checkpoint(intruder, "browser"), /belongs to another session/);
  assert.equal(store.sessions.get(session.id).token_hash.length, 64);
  assert.equal(store.eventsByKey.size, 0);
});

test("failed provider calls and manual retries have distinct attempts and preserve error bodies", async () => {
  const store = new MemoryStore();
  const session = opening();
  const trace = new AssessmentTrace(store, session);
  const attempt = crypto.randomUUID();
  const failed = createJevEvaluator({ apiKey: "secret", trace: trace.recorder(attempt), fetcher: async () => new Response('provider unavailable', { status: 503 }) });
  await assert.rejects(() => runTracedAdvance(session, { evaluator: failed }, trace, attempt), /503/);
  const call = [...store.calls.values()][0];
  assert.equal(call.status, "failed"); assert.equal(call.http_status, 503); assert.equal(call.response.raw, "provider unavailable");
  assert.equal(store.sessions.get(session.id).status, "error");
  assert.ok([...store.eventsByKey.values()].some((e) => e.event_type === "advance_failed"));
  const retry = crypto.randomUUID();
  await runTracedAdvance(session, { evaluator: createJevEvaluator({ apiKey: "secret", trace: trace.recorder(retry), fetcher: jevFetch }) }, trace, retry);
  assert.equal(store.calls.size, 2);
  assert.deepEqual([...store.calls.values()].map((c) => c.attempt_id), [attempt, retry]);
});

test("invalid Gemini JSON is recorded before using a fixed fallback", async () => {
  const store = new MemoryStore();
  let session = opening();
  session = await runTracedAdvance(session, { evaluator: createJevEvaluator({ apiKey: "x", fetcher: jevFetch }) });
  for (const q of questionsForStage(session)) session = submitAssessmentAnswer(session, { questionId: q.id, optionIds: ["option_3"] });
  const trace = new AssessmentTrace(store, session);
  const attemptId = crypto.randomUUID();
  const next = await runTracedAdvance(session, {
    evaluator: createJevEvaluator({ apiKey: "x", fetcher: jevFetch, trace: trace.recorder(attemptId) }),
    writer: createGeminiQuestionWriter({ apiKey: "x", fetcher: async () => new Response('{bad JSON'), trace: trace.recorder(attemptId) }),
  }, trace, attemptId);
  const call = [...store.calls.values()].find((c) => c.provider === "gemini");
  assert.equal(call.status, "failed"); assert.equal(call.response.raw, "{bad JSON");
  assert.equal(next.questions.at(-1).source, "fallback");
  assert.ok([...store.eventsByKey.values()].some((e) => e.event_type === "generation_failed"));
});

test("model calls do not run if recording the request fails; interruptions remain visible", async () => {
  let invoked = false;
  await assert.rejects(() => recordedModelCall({ provider: "jev", operation: "initial", configured_model: "test", request: {} }, {
    start: async () => { throw new AssessmentLogError(); }, finish: async () => {},
  }, async () => { invoked = true; }), /save your assessment/);
  assert.equal(invoked, false);
  const store = new MemoryStore(); const session = opening(); const trace = new AssessmentTrace(store, session);
  await trace.authorize(); await trace.recorder(crypto.randomUUID()).start({ provider: "jev", operation: "initial", configured_model: "test", request: { state: {} } });
  assert.equal([...store.calls.values()][0].status, "started");
});

test("timeouts are recorded without inventing a response and secrets are redacted", async () => {
  const store = new MemoryStore(); const session = opening(); const trace = new AssessmentTrace(store, session, ["key-value"]);
  await trace.authorize();
  const recorder = trace.recorder(crypto.randomUUID());
  await assert.rejects(() => recordedModelCall({ provider: "gemini", operation: "bridge", configured_model: "test", request: { question: "A real question" } }, recorder,
    async () => { const error = new Error("Timed out key-value"); error.name = "TimeoutError"; throw error; }), /Timed out/);
  const call = [...store.calls.values()][0];
  assert.equal(call.http_status, null); assert.equal(call.response, null); assert.equal(call.status, "failed");
  assert.ok(!JSON.stringify(call).includes("key-value"));
  assert.deepEqual(traceJson({ traceToken: "token", Authorization: "Bearer key", writtenAnswer: "Keep my example" }), { traceToken: "[REDACTED]", Authorization: "[REDACTED]", writtenAnswer: "Keep my example" });
});

test("public session validation rejects malformed and unbounded trace writes", () => {
  const session = opening();
  assert.equal(validateAssessmentSession(session).id, session.id);
  assert.throws(() => validateAssessmentSession({ ...session, id: "any-session" }), /Invalid/);
  assert.throws(() => validateAssessmentSession({ ...session, traceToken: "guess" }), /Invalid/);
  assert.throws(() => validateAssessmentSession({ ...session, events: Array(257).fill(session.events[0]) }), /Invalid/);
  assert.throws(() => validateAssessmentSession({ ...session, answers: [{ questionId: "q4", text: "x".repeat(1201) }] }), /Invalid/);
});
