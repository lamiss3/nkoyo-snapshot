import assert from "node:assert/strict";
import { test } from "node:test";
import { createJevEvaluator } from "../src/assessment-v2/jev.server.ts";
import { createGeminiQuestionWriter } from "../src/assessment-v2/gemini.server.ts";
import { openingQuestions } from "../src/assessment-v2/opening-questions.ts";

test("Jev receives named problem choices and maps evidence and final signals", async () => {
  let requestBody;
  const fetcher = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      model: "jev-test",
      answers: {
        P03: { type: "choice", choice: "supported", probabilities: { insufficient_information: 0.05, contradicted: 0.05, possible: 0.1, supported: 0.8 } },
        P03_impact: { type: "score", score: 3, probabilities: {} },
        P03_urgency: { type: "score", score: 2, probabilities: {} },
      },
    }), { status: 200 });
  };
  const evaluator = createJevEvaluator({ apiKey: "test-key", fetcher });
  const result = await evaluator.evaluate({
    round: "final", problemIds: ["P03"], questions: openingQuestions,
    answers: [{ questionId: "q1", optionIds: ["workload"], submittedAt: "2026-01-01T00:00:00Z" }],
    previousEvaluations: [],
  });
  assert.equal(requestBody.questions.P03.type, "choice");
  assert.equal(requestBody.questions.P03_impact.type, "score");
  assert.equal(requestBody.state.respondentAnswers[0].selectedAnswers[0], "Managing workload, staffing gaps, or recurring exhaustion.");
  assert.equal(result.evaluations[0].choice, "supported");
  assert.equal(result.evaluations[0].impact, 0.75);
  assert.equal(result.evaluations[0].urgency, 0.5);
});

test("Gemini writes only the requested question slots", async () => {
  const fetcher = async (_url, init) => {
    const prompt = JSON.parse(init.body).contents[0].parts[0].text;
    const questions = prompt.includes("exactly two")
      ? ["What recent example shows how staff absence affected delivery, if at all?", "What recent example shows how board decisions affected delivery, if at all?"]
      : ["In a recent event, did staff absence and board decisions influence each other, or were they separate?"];
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ questions }) }] } }] }), { status: 200 });
  };
  const writer = createGeminiQuestionWriter({ apiKey: "test-key", fetcher });
  const context = { finalists: ["P03", "P04"], questions: openingQuestions, answers: [], evaluations: [] };
  assert.equal((await writer.generateBridge(context)).id, "q9");
  const finalists = await writer.generateFinalists(context);
  assert.deepEqual(finalists.map((question) => question.problemId), ["P03", "P04"]);
  assert.deepEqual(finalists.map((question) => question.id), ["q10", "q11"]);
});
