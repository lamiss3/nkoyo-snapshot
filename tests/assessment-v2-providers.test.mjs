import assert from "node:assert/strict";
import { test } from "node:test";
import { createJevEvaluator, jevConfigFromEnv } from "../src/assessment-v2/jev.server.ts";
import { createGeminiQuestionWriter } from "../src/assessment-v2/gemini.server.ts";
import { legacyOpeningQuestions as openingQuestions } from "../src/assessment-v2/opening-questions.ts";

test("Jev receives named problem choices and maps evidence and final signals", async () => {
  let requestBody;
  const fetcher = async (url, init) => {
    assert.equal(url, "https://api.typesafe.ai/v1/systemone");
    assert.equal(init.headers.Authorization, "Bearer test-key");
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

test("OpenRouter Jev uses the inference key and preserves the typed scoring contract", async () => {
  const config = jevConfigFromEnv({
    JEV_PROVIDER: "openrouter",
    JEV_API_KEY: "direct-key",
    JEV_MODEL: "jev-direct",
    OPENROUTER_API_KEY: " router-key ",
    OPENROUTER_MANAGEMENT_KEY: "management-key",
    OPENROUTER_MODEL: "google/gemini-test",
  });
  let trace;
  const evaluator = createJevEvaluator({
    ...config,
    trace: {
      start: async (spec) => {
        assert.equal(spec.provider, "jev");
        assert.equal(spec.configured_model, "~typesafe/jev-latest");
        assert.ok(!JSON.stringify(spec).includes("router-key"));
        return "call-id";
      },
      finish: async (_id, entry) => { trace = entry; },
    },
    fetcher: async (url, init) => {
      assert.equal(url, "https://openrouter.ai/api/alpha/decisions");
      assert.equal(init.headers.Authorization, "Bearer router-key");
      assert.equal(init.method, "POST");
      const body = JSON.parse(init.body);
      assert.equal(body.model, "~typesafe/jev-latest");
      assert.deepEqual(Object.keys(body.questions), ["P03", "P03_impact", "P03_urgency"]);
      assert.equal(body.questions.P03.type, "choice");
      assert.equal(body.questions.P03_impact.criteria.length, 5);
      return Response.json({
        model: "typesafe/jev-1.14-20261014",
        answers: {
          P03: { type: "choice", choice: "possible", probabilities: { insufficient_information: 0, contradicted: 0, possible: 0.8, supported: 0.2 } },
          P03_impact: { type: "score", score: 2.5 },
          P03_urgency: { type: "score", score: 1.25 },
        },
        usage: { cost: 0.00004 },
      });
    },
  });
  const result = await evaluator.evaluate({
    round: "final", problemIds: ["P03"], questions: [], answers: [], previousEvaluations: [],
  });
  assert.equal(result.rubricVersion, "evidence-rubric-v1");
  assert.equal(result.evaluations[0].choice, "possible");
  assert.equal(result.evaluations[0].impact, 0.625);
  assert.equal(result.evaluations[0].urgency, 0.3125);
  assert.equal(trace.status, "succeeded");
  assert.equal(trace.response_model, "typesafe/jev-1.14-20261014");
  assert.equal(trace.usage.cost, 0.00004);
});

test("Jev transport is explicit and never substitutes a key or a different model", () => {
  const direct = jevConfigFromEnv({ JEV_API_KEY: "direct", OPENROUTER_API_KEY: "router" });
  assert.equal(direct.transport, "typesafe");
  assert.equal(direct.apiKey, "direct");
  assert.equal(direct.model, "jev-latest");
  const missing = jevConfigFromEnv({
    JEV_PROVIDER: "openrouter", JEV_API_KEY: "direct", OPENROUTER_MANAGEMENT_KEY: "management",
  });
  assert.throws(() => createJevEvaluator(missing), /OPENROUTER_API_KEY is required/);
  assert.throws(() => jevConfigFromEnv({ JEV_PROVIDER: "auto" }), /JEV_PROVIDER/);
  assert.throws(() => createJevEvaluator({
    ...missing, apiKey: "router", model: "google/gemini-test",
  }), /JEV_OPENROUTER_MODEL/);
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
