import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceAssessment,
  createAssessmentSession,
  questionsForStage,
  submitAssessmentAnswer,
} from "../src/assessment-v2/orchestrator.ts";

const choices = ["insufficient_information", "contradicted", "possible", "supported"];

function evaluation(problemId, round) {
  const supported = ["P03", "P04", "P09", "P16"].includes(problemId);
  const finalist = ["P03", "P04"].includes(problemId);
  const choice = round === "initial" ? (supported ? "supported" : "insufficient_information") :
    finalist ? "supported" : supported ? "possible" : "insufficient_information";
  const probabilities = Object.fromEntries(choices.map((name) => [name, name === choice ? 0.85 : 0.05]));
  return { problemId, choice, probabilities, ...(round === "final" ? { impact: problemId === "P03" ? 0.9 : 0.5, urgency: 0.7 } : {}) };
}

const evaluator = {
  async evaluate(request) {
    return {
      round: request.round,
      model: "test-double",
      rubricVersion: "test-1",
      evaluations: request.problemIds.map((id) => evaluation(id, request.round)),
    };
  },
};

test("moves through four opening questions, four fixed probes, and three written questions", async () => {
  let session = createAssessmentSession("test-session");
  assert.deepEqual(questionsForStage(session).map((question) => question.id), ["q1", "q2", "q3", "q4"]);
  assert.throws(() => submitAssessmentAnswer(session, { questionId: "q5", optionIds: ["option_1"] }));

  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["decisions", "workload"] });
  session = submitAssessmentAnswer(session, { questionId: "q2", optionIds: ["escalate"] });
  session = submitAssessmentAnswer(session, { questionId: "q3", optionIds: ["delay"] });
  session = submitAssessmentAnswer(session, { questionId: "q4", text: "Routine decisions have repeatedly waited for approval." });
  session = await advanceAssessment(session, { evaluator });

  assert.equal(session.stage, "probes");
  assert.deepEqual(session.topFour, ["P03", "P04", "P09", "P16"]);
  assert.equal(questionsForStage(session).length, 4);
  for (const question of questionsForStage(session)) {
    session = submitAssessmentAnswer(session, { questionId: question.id, optionIds: ["option_3"] });
  }
  session = await advanceAssessment(session, { evaluator });
  assert.equal(session.stage, "bridge");
  assert.deepEqual(session.finalists, ["P03", "P04"]);
  assert.equal(questionsForStage(session)[0]?.source, "fallback");

  session = submitAssessmentAnswer(session, { questionId: "q9", text: "Approvals and delegated authority seem connected." });
  session = await advanceAssessment(session, { evaluator });
  assert.equal(session.stage, "finalists");
  assert.deepEqual(questionsForStage(session).map((question) => question.id), ["q10", "q11"]);
  for (const question of questionsForStage(session)) {
    session = submitAssessmentAnswer(session, { questionId: question.id, text: "This delayed our work several times." });
  }
  session = await advanceAssessment(session, { evaluator });
  assert.equal(session.stage, "complete");
  assert.deepEqual(session.result?.priority, ["P03"]);
  assert.equal(Object.values(session.result?.threeCShare ?? {}).reduce((a, b) => a + b, 0), 100);
  assert.equal(session.events.filter((event) => event.type === "generation_failed").length, 2);
});

test("does not force a problem when all evaluations contradict the catalog", async () => {
  const negativeEvaluator = {
    async evaluate(request) {
      return {
        round: request.round,
        model: "test-double",
        rubricVersion: "test-1",
        evaluations: request.problemIds.map((problemId) => ({
          problemId,
          choice: "contradicted",
          probabilities: { insufficient_information: 0.05, contradicted: 0.85, possible: 0.05, supported: 0.05 },
        })),
      };
    },
  };
  let session = createAssessmentSession("no-signal");
  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["none"] });
  session = submitAssessmentAnswer(session, { questionId: "q2", optionIds: ["agreed_process"] });
  session = submitAssessmentAnswer(session, { questionId: "q3", optionIds: ["little_impact"] });
  session = submitAssessmentAnswer(session, { questionId: "q4", text: "There is no significant recurring difficulty right now." });
  session = await advanceAssessment(session, { evaluator: negativeEvaluator });
  assert.equal(session.stage, "complete");
  assert.deepEqual(session.result?.priority, []);
});

test("does not pick arbitrary topics when every problem lacks evidence", async () => {
  const uncertainEvaluator = {
    async evaluate(request) {
      return {
        round: request.round, model: "test-double", rubricVersion: "test-1",
        evaluations: request.problemIds.map((problemId) => ({
          problemId, choice: "insufficient_information",
          probabilities: { insufficient_information: 0.85, contradicted: 0.05, possible: 0.05, supported: 0.05 },
        })),
      };
    },
  };
  let session = createAssessmentSession("uncertain");
  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["unsure"] });
  session = submitAssessmentAnswer(session, { questionId: "q2", optionIds: ["unsure"] });
  session = submitAssessmentAnswer(session, { questionId: "q3", optionIds: ["unsure"] });
  session = submitAssessmentAnswer(session, { questionId: "q4", text: "I do not have enough information about the organization." });
  session = await advanceAssessment(session, { evaluator: uncertainEvaluator });
  assert.equal(session.stage, "complete");
  assert.deepEqual(session.topFour, []);
  assert.deepEqual(session.result?.priority, []);
});

test("keeps one supported finding when no second finalist exists", async () => {
  const singleEvaluator = {
    async evaluate(request) {
      return {
        round: request.round, model: "test-double", rubricVersion: "test-1",
        evaluations: request.problemIds.map((problemId) => {
          const choice = problemId === "P03" ? "supported" : request.round === "initial" && ["P04", "P09", "P16"].includes(problemId) ? "possible" : "contradicted";
          return { problemId, choice, probabilities: Object.fromEntries(choices.map((name) => [name, name === choice ? 0.85 : 0.05])) };
        }),
      };
    },
  };
  let session = createAssessmentSession("single");
  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["workload"] });
  session = submitAssessmentAnswer(session, { questionId: "q2", optionIds: ["extra_work"] });
  session = submitAssessmentAnswer(session, { questionId: "q3", optionIds: ["service"] });
  session = submitAssessmentAnswer(session, { questionId: "q4", text: "One team member is carrying a recurring service task." });
  session = await advanceAssessment(session, { evaluator: singleEvaluator });
  for (const question of questionsForStage(session)) session = submitAssessmentAnswer(session, { questionId: question.id, optionIds: ["option_1"] });
  session = await advanceAssessment(session, { evaluator: singleEvaluator });
  assert.equal(session.stage, "complete");
  assert.deepEqual(session.result?.priority, ["P03"]);
  assert.equal(session.result?.problems[0]?.impactSignal, null);
});
