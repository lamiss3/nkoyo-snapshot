import assert from "node:assert/strict";
import test from "node:test";
import {
  geminiConfigFromEnv,
  createGeminiClient,
} from "../src/assessment-v2/gemini-client.server.ts";
import { createGeminiQuestionWriter } from "../src/assessment-v2/gemini.server.ts";
import { createGeminiEmailJourneyWriter } from "../src/assessment-v2/email-journey.server.ts";
import { fixedTestEmailJourney } from "../src/assessment-v2/email-journey-fixed.ts";
import { createAssessmentSession } from "../src/assessment-v2/orchestrator.ts";
import { legacyOpeningQuestions } from "../src/assessment-v2/opening-questions.ts";
import { buildSessionReport, sessionReportMarkdown } from "../src/assessment-v2/session-report.ts";

const model = "google/gemini-3.5-flash-lite";
const response = (content, override = {}) =>
  new Response(
    JSON.stringify({
      id: "gen-test",
      model,
      provider: "Google",
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300, cost: 0.001 },
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) } }],
      ...override,
    }),
  );
const recorder = (records) => ({
  async start(spec) {
    records.push(spec);
    return "call";
  },
  async finish(id, data) {
    records.push({ id, ...data });
  },
});
const context = {
  version: "adaptive-v2",
  finalists: ["P03", "P04"],
  questions: legacyOpeningQuestions,
  answers: [
    {
      questionId: "q4",
      text: "Synthetic example: routine approvals waited for the same person.",
      submittedAt: "2026-10-16T10:00:00Z",
    },
  ],
  evaluations: [],
};
const scenario = {
  question: "Which hypothetical situation is closest to your experience?",
  scenarios: [
    "A routine approval waits for one leader even though information is available.",
    "A team member owns a task but needs someone else to approve the next step.",
  ],
};

test("adding only an OpenRouter key selects paid Gemini for questions and emails; rollback is explicit", () => {
  const before = {
    GEMINI_API_KEY: "old-key",
    GEMINI_MODEL: "gemini-3.6-flash",
    EMAIL_GEMINI_MODEL: "gemini-3.5-flash-lite",
  };
  assert.equal(geminiConfigFromEnv("assessment", before).transport, "google");
  const after = { ...before, OPENROUTER_API_KEY: "new-key" };
  for (const purpose of ["assessment", "email"]) {
    const settings = geminiConfigFromEnv(purpose, after);
    assert.equal(settings.transport, "openrouter");
    assert.equal(settings.apiKey, "new-key");
    assert.equal(settings.model, model);
  }
  assert.equal(
    geminiConfigFromEnv("email", { ...after, EMAIL_OPENROUTER_MODEL: "google/gemini-3.6-flash" })
      .model,
    "google/gemini-3.6-flash",
  );
  assert.equal(
    geminiConfigFromEnv("assessment", { ...after, AI_PROVIDER: "gemini" }).apiKey,
    "old-key",
  );
  assert.equal(
    geminiConfigFromEnv("assessment", { AI_PROVIDER: "openrouter", GEMINI_API_KEY: "old-key" })
      .apiKey,
    "",
  );
  assert.throws(() => geminiConfigFromEnv("assessment", { AI_PROVIDER: "typo" }));
  assert.throws(
    () => createGeminiClient({ apiKey: "", transport: "openrouter" }),
    /OPENROUTER_API_KEY/,
  );
  assert.throws(
    () =>
      createGeminiClient({
        apiKey: "x",
        transport: "openrouter",
        model: "google/gemini-test:free",
      }),
    /paid/,
  );
});

test("both adaptive scenarios use authenticated OpenRouter, retain context and log usage without credentials", async () => {
  const records = [],
    requests = [];
  const writer = createGeminiQuestionWriter({
    apiKey: "private-router-key",
    transport: "openrouter",
    trace: recorder(records),
    fetcher: async (url, init) => {
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      assert.equal(init.headers.Authorization, "Bearer private-router-key");
      assert.equal(init.headers["x-goog-api-key"], undefined);
      const body = JSON.parse(init.body);
      requests.push(body);
      assert.equal(body.model, model);
      assert.equal(body.response_format.type, "json_schema");
      assert.equal(body.response_format.json_schema.strict, true);
      assert.equal(body.provider.require_parameters, true);
      assert.ok(body.messages[1].content.includes("routine approvals"));
      assert.equal(body.contents, undefined);
      assert.ok(!init.body.includes("private-router-key"));
      return response(scenario);
    },
  });
  const bridge = await writer.generateBridge(context);
  assert.equal(bridge.source, "generated");
  assert.equal(bridge.model, model);
  assert.equal(bridge.options.at(-1).id, "none");
  const finalists = await writer.generateFinalists({
    ...context,
    questions: [...context.questions, bridge],
    answers: [...context.answers, { questionId: "q9", optionIds: ["scenario_a"] }],
  });
  assert.equal(finalists[0].model, model);
  assert.equal(finalists[1].optional, true);
  assert.ok(requests[1].messages[1].content.includes(scenario.scenarios[0]));
  assert.deepEqual(
    records.filter((item) => item.status).map((item) => item.status),
    ["succeeded", "succeeded"],
  );
  assert.equal(records[1].response_model, model);
  assert.equal(records[1].usage.cost, 0.001);
  assert.ok(!JSON.stringify(records).includes("private-router-key"));
});

test("OpenRouter legacy sessions still receive their original one-then-two question slots", async () => {
  const writer = createGeminiQuestionWriter({
    apiKey: "x",
    transport: "openrouter",
    fetcher: async (_, init) =>
      response({
        questions: JSON.parse(init.body).messages[1].content.includes("exactly two")
          ? [
              "What recent example shows an approval delay?",
              "How did authority affect that recent situation?",
            ]
          : ["How did the two shortlisted issues relate in a recent example?"],
      }),
  });
  const legacy = { ...context, version: "adaptive-v1" };
  assert.equal((await writer.generateBridge(legacy)).kind, "text");
  assert.deepEqual(
    (await writer.generateFinalists(legacy)).map((q) => q.id),
    ["q10", "q11"],
  );
});

test("HTTP, truncation, provider-error, malformed JSON and invalid scenario responses fail and stay logged", async () => {
  const failedResponses = [
    ...[401, 402, 429, 503].map(
      (status) => () => new Response('{"error":{"message":"upstream detail"}}', { status }),
    ),
    () => response(scenario, { error: { message: "Provider failed" } }),
    () =>
      response(scenario, {
        choices: [{ finish_reason: "length", message: { content: JSON.stringify(scenario) } }],
      }),
    () =>
      response(scenario, {
        choices: [{ finish_reason: "stop", message: { content: null, refusal: "refused" } }],
      }),
    () =>
      response(scenario, {
        choices: [{ finish_reason: "stop", message: { content: "{bad JSON" } }],
      }),
    () => response({ ...scenario, scenarios: ["too short"] }),
  ];
  for (const makeResponse of failedResponses) {
    const records = [];
    const writer = createGeminiQuestionWriter({
      apiKey: "x",
      transport: "openrouter",
      trace: recorder(records),
      fetcher: async () => makeResponse(),
    });
    await assert.rejects(writer.generateBridge(context));
    assert.equal(records[1].status, "failed");
    assert.equal(records[1].output, null);
    assert.ok(records[1].response);
  }
});

test("five OpenRouter emails retain topics, actions and references; truncation cannot become a saved draft", async () => {
  const value = createAssessmentSession("synthetic-openrouter-email", "adaptive-v1");
  value.stage = "complete";
  value.answers = context.answers;
  value.result = {
    problems: [
      {
        problemId: "P03",
        evidence: "supported",
        supportSignal: 0.9,
        impactSignal: 0.8,
        urgencySignal: 0.7,
        prioritySignal: 0.82,
      },
    ],
    priority: ["P03"],
    threeCShare: { culture: 50, capacity: 30, compliance: 20 },
    generatedAt: value.updatedAt,
  };
  const emails = fixedTestEmailJourney(value).emails.map((email) => ({
    number: email.number,
    purpose: email.purpose,
    focusId: email.focusId,
    subject: email.subject,
    preview: email.preview,
    mainAction: email.mainAction,
    sections: Array.from({ length: email.number === 1 ? 6 : 3 }, () => ({
      heading: "Evidence and interpretation",
      paragraphs: [
        Array.from({ length: email.number === 1 ? 50 : 30 }, () => "observation").join(" "),
      ],
      sourceQuestionIds: ["q4"],
    })),
  }));
  for (const truncated of [false, true]) {
    const records = [];
    const writer = createGeminiEmailJourneyWriter({
      apiKey: "private-key",
      transport: "openrouter",
      trace: recorder(records),
      fetcher: async (_, init) => {
        const body = JSON.parse(init.body);
        assert.equal(body.max_tokens, 7500);
        assert.equal(body.response_format.json_schema.name, "email_journey");
        assert.ok(body.messages[1].content.includes("routine approvals"));
        return response(
          { emails },
          truncated
            ? {
                choices: [
                  { finish_reason: "length", message: { content: JSON.stringify({ emails }) } },
                ],
              }
            : {},
        );
      },
    });
    if (truncated) await assert.rejects(writer.generate(value), /incomplete/);
    else {
      const journey = await writer.generate(value);
      assert.equal(journey.emails.length, 5);
      assert.equal(journey.model, model);
      assert.equal(journey.primaryId, "P03");
      assert.equal(journey.secondaryId, null);
      assert.equal(journey.emails[4].supportInvitation, true);
      assert.equal(records[1].usage.cost, 0.001);
    }
    assert.equal(records[1].status, truncated ? "failed" : "succeeded");
  }
});

test("readable staff report recognizes OpenRouter prompts and preserves the saved inputs", () => {
  const value = createAssessmentSession("synthetic-openrouter-report", "adaptive-v1");
  const input = {
    session: {
      session_id: value.id,
      snapshot: value,
      status: "active",
      stage: value.stage,
      created_at: value.createdAt,
      updated_at: value.updatedAt,
      completed_at: null,
      last_error: null,
    },
    events: [],
    contacts: [],
    calls: [
      {
        id: "call",
        provider: "gemini",
        operation: "bridge",
        configured_model: model,
        response_model: model,
        status: "succeeded",
        duration_ms: 50,
        started_at: value.createdAt,
        request: {
          messages: [
            {
              role: "user",
              content: `Context: ${JSON.stringify({ responses: [{ question: "Which decision waited?", writtenAnswer: "A synthetic approval waited." }] })}\nWrite one scenario.`,
            },
          ],
        },
        output: [],
      },
    ],
  };
  const report = sessionReportMarkdown(buildSessionReport(input));
  assert.ok(report.includes("via OpenRouter"));
  assert.ok(report.includes("A synthetic approval waited"));
});
