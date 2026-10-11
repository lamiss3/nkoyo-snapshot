import test from "node:test";
import assert from "node:assert/strict";
import {
  createAssessmentSession,
  submitAssessmentAnswer,
  advanceAssessment,
  questionsForStage,
  stageIsComplete,
} from "../src/assessment-v2/orchestrator.ts";
import {
  openingQuestions,
  legacyOpeningQuestions,
} from "../src/assessment-v2/opening-questions.ts";
import { openingScenarioQuestion } from "../src/assessment-v2/scenario-questions.ts";
import { createGeminiQuestionWriter } from "../src/assessment-v2/gemini.server.ts";
import { createJevEvaluator } from "../src/assessment-v2/jev.server.ts";
import { emailJourneyBrief } from "../src/assessment-v2/email-journey.ts";
import { validateAssessmentSession } from "../src/assessment-v2/session-validation.ts";
import { buildSessionReport, sessionReportMarkdown } from "../src/assessment-v2/session-report.ts";

const answers = (choices) =>
  choices.map((option) => ({
    questionId: "q1a",
    optionIds: [option],
    submittedAt: new Date().toISOString(),
  }));
function opening() {
  let session = createAssessmentSession();
  for (const q of openingQuestions)
    session = submitAssessmentAnswer(session, { questionId: q.id, optionIds: [q.options[0].id] });
  for (const id of ["q3", "q4"]) {
    const q = session.questions.find((q) => q.id === id);
    session = submitAssessmentAnswer(session, { questionId: id, optionIds: [q.options[0].id] });
  }
  return session;
}
function evaluator(calls) {
  return {
    async evaluate(input) {
      calls.push(input);
      return {
        round: input.round,
        model: "test-double",
        rubricVersion: "unchanged-rubric",
        evaluations: input.problemIds.map((id) => {
          const supported = ["P03", "P04"].includes(id);
          const choice = supported ? "supported" : "insufficient_information";
          return {
            problemId: id,
            choice,
            probabilities: {
              supported: supported ? 0.85 : 0.05,
              possible: 0.05,
              contradicted: 0.05,
              insufficient_information: supported ? 0.05 : 0.85,
            },
            ...(input.round === "final" ? { impact: 0.7, urgency: 0.6 } : {}),
          };
        }),
      };
    },
  };
}
const payload = (question, scenarios) =>
  Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ question, scenarios }) }] } }],
  });

test("short screens cover original signals without requiring an Other text box", () => {
  const session = createAssessmentSession();
  assert.equal(session.version, "adaptive-v2");
  assert.equal(questionsForStage(session).length, 9);
  assert.ok(session.questions.every((q) => q.kind !== "text" && q.options.length <= 4));
  for (const legacy of legacyOpeningQuestions.slice(0, 2)) {
    const short = openingQuestions
      .filter((q) => q.id.startsWith(legacy.id))
      .flatMap((q) => q.options.map((o) => o.id));
    for (const option of legacy.options.filter((o) => !["none", "unsure"].includes(o.id)))
      assert.ok(short.includes(option.id));
  }
  let value = submitAssessmentAnswer(session, { questionId: "q1d", optionIds: ["other"] });
  assert.ok(value.answers.some((a) => a.optionIds.includes("other")));
  assert.throws(() =>
    submitAssessmentAnswer(value, {
      questionId: "q1d",
      optionIds: ["strategy", "technology", "other"],
    }),
  );
});
test("fixed first scenarios depend on previous answers and offer a neutral escape", () => {
  const funding = openingScenarioQuestion(answers(["funding"]));
  const technology = openingScenarioQuestion(answers(["technology"]));
  assert.notDeepEqual(funding.options, technology.options);
  assert.ok(funding.options.some((o) => o.id === "scenario_P01"));
  assert.ok(technology.options.some((o) => o.id === "scenario_P20"));
  for (const q of [funding, technology, openingScenarioQuestion([])]) {
    assert.ok(q.options.length >= 3 && q.options.length <= 4);
    assert.equal(q.options.at(-1).id, "none");
    assert.equal(q.answerMode, "scenario_match");
  }
  let session = opening();
  const original = session.questions.find((q) => q.id === "q4").options;
  session = submitAssessmentAnswer(session, { questionId: "q1a", optionIds: ["unsure"] });
  if (
    JSON.stringify(original) !==
    JSON.stringify(session.questions.find((q) => q.id === "q4").options)
  )
    assert.ok(!session.answers.some((a) => a.questionId === "q4"));
});
test("two Gemini scenarios see all accumulated choices; optional skip preserves usual Jev rounds and ranking", async () => {
  const providerInputs = [];
  const rounds = [];
  const writer = createGeminiQuestionWriter({
    apiKey: "test",
    fetcher: async (_url, init) => {
      providerInputs.push(JSON.parse(init.body));
      return payload(
        "Which situation is the closest match to your experience?",
        providerInputs.length === 1
          ? [
              "Routine approval waits hold up a task despite having enough information.",
              "Work pauses because responsibility and decision authority do not align.",
              "Both patterns are familiar and sometimes occur together.",
            ]
          : [
              "Delays occur even when decision-making authority is clear.",
              "Responsibility is clear but the person cannot authorize necessary action.",
            ],
      );
    },
  });
  let session = opening();
  session = await advanceAssessment(session, { evaluator: evaluator(rounds), writer });
  for (const q of questionsForStage(session))
    session = submitAssessmentAnswer(session, { questionId: q.id, optionIds: ["option_3"] });
  session = await advanceAssessment(session, { evaluator: evaluator(rounds), writer });
  const q9 = questionsForStage(session)[0];
  assert.equal(q9.kind, "single");
  assert.equal(q9.source, "generated");
  session = submitAssessmentAnswer(session, { questionId: "q9", optionIds: ["scenario_a"] });
  session = await advanceAssessment(session, { evaluator: evaluator(rounds), writer });
  const [q10, q11] = questionsForStage(session);
  assert.equal(q10.kind, "single");
  assert.equal(q11.kind, "text");
  assert.equal(q11.optional, true);
  assert.ok(providerInputs[1].contents[0].parts[0].text.includes("Routine approval waits"));
  assert.ok(providerInputs[1].contents[0].parts[0].text.includes("scenario_match"));
  session = submitAssessmentAnswer(session, { questionId: "q10", optionIds: ["none"] });
  assert.throws(() => submitAssessmentAnswer(session, { questionId: "q10", skipped: true }));
  session = submitAssessmentAnswer(session, { questionId: "q11", skipped: true, text: "" });
  assert.ok(stageIsComplete(session));
  assert.doesNotThrow(() => validateAssessmentSession(session));
  session = await advanceAssessment(session, { evaluator: evaluator(rounds), writer });
  assert.deepEqual(
    rounds.map((r) => [r.round, r.problemIds.length]),
    [
      ["initial", 20],
      ["validation", 20],
      ["bridge", 2],
      ["final", 2],
    ],
  );
  assert.equal(session.questions.length, 16);
  assert.equal(session.answers.length, 16);
  assert.equal(session.questions.filter((q) => q.kind === "text").length, 1);
  assert.equal(
    session.result.problems[0].prioritySignal,
    0.45 * (0.85 + 0.5 * 0.05) + 0.35 * 0.7 + 0.2 * 0.6,
  );
  assert.deepEqual(session.result.priority, ["P03", "P04"]);
  const brief = emailJourneyBrief(session);
  assert.equal(brief.responses.find((a) => a.questionId === "q11").skipped, true);
  assert.equal(brief.responses.find((a) => a.questionId === "q9").answerMode, "scenario_match");
  const report = buildSessionReport({
    session: {
      session_id: session.id,
      snapshot: session,
      status: "completed",
      stage: "complete",
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      completed_at: session.result.generatedAt,
      last_error: null,
    },
    events: [],
    calls: [],
    contacts: [],
  });
  const markdown = sessionReportMarkdown(report);
  assert.match(markdown, /Skipped by the respondent/);
  assert.match(markdown, /Hypothetical scenario match/);
  assert.match(markdown, /Q16\./);
  assert.equal(
    report.sections[2].blocks.filter((block) => block.kind === "heading").length,
    4,
    "Optional final text must not be mislabeled as a probe",
  );
});
test("malformed Gemini scenarios use choice backups and still leave only one optional text field", async () => {
  const rounds = [];
  const writer = createGeminiQuestionWriter({
    apiKey: "test",
    fetcher: async () => payload("Which example fits?", ["Too short"]),
  });
  let session = opening();
  session = await advanceAssessment(session, { evaluator: evaluator(rounds), writer });
  for (const q of questionsForStage(session))
    session = submitAssessmentAnswer(session, { questionId: q.id, optionIds: ["option_3"] });
  session = await advanceAssessment(session, { evaluator: evaluator(rounds), writer });
  assert.equal(questionsForStage(session)[0].source, "fallback");
  assert.equal(questionsForStage(session)[0].kind, "single");
  session = submitAssessmentAnswer(session, { questionId: "q9", optionIds: ["none"] });
  session = await advanceAssessment(session, { evaluator: evaluator(rounds), writer });
  assert.equal(questionsForStage(session)[0].kind, "single");
  assert.equal(questionsForStage(session)[1].optional, true);
});
test("Jev receives matches and skips explicitly without changing numeric score interpretation", async () => {
  let body;
  const jev = createJevEvaluator({
    apiKey: "test",
    fetcher: async (_url, init) => {
      body = JSON.parse(init.body);
      return Response.json({
        model: "test-jev",
        answers: {
          P03: {
            type: "choice",
            choice: "possible",
            probabilities: {
              supported: 0.05,
              possible: 0.85,
              contradicted: 0.05,
              insufficient_information: 0.05,
            },
          },
          P03_impact: { type: "score", score: 3 },
          P03_urgency: { type: "score", score: 2 },
        },
      });
    },
  });
  const q = openingScenarioQuestion(answers(["decisions"]));
  const out = await jev.evaluate({
    version: "adaptive-v2",
    round: "final",
    problemIds: ["P03"],
    questions: [
      q,
      { id: "q11", kind: "text", optional: true, text: "Optional example", source: "fixed" },
    ],
    answers: [
      { questionId: "q4", optionIds: [q.options[0].id], submittedAt: "now" },
      { questionId: "q11", text: "", skipped: true, submittedAt: "now" },
    ],
    previousEvaluations: [],
  });
  assert.equal(body.state.respondentAnswers[0].answerMode, "scenario_match");
  assert.equal(body.state.respondentAnswers[1].skipped, true);
  assert.match(body.questions.P03.instructions, /not a verified real event/);
  assert.equal(out.evaluations[0].impact, 0.75);
  assert.equal(out.evaluations[0].urgency, 0.5);
});
