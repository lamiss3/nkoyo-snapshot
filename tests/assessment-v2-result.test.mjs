import assert from "node:assert/strict";
import test from "node:test";
import { createAssessmentSession } from "../src/assessment-v2/orchestrator.ts";
import { buildAdaptivePresentation } from "../src/assessment-v2/result-content.ts";

test("result copy names the primary and related topics and preserves respondent evidence", () => {
  const session = createAssessmentSession("presentation");
  session.answers = [
    { questionId: "q4", text: "Staff covered vacant roles and demand grew.", submittedAt: "2026-01-01T00:00:00Z" },
    { questionId: "probe_p10", optionIds: ["option_4"], submittedAt: "2026-01-01T00:00:00Z" },
  ];
  session.result = {
    problems: [
      { problemId: "P10", evidence: "supported", supportSignal: 0.9, impactSignal: 0.8, urgencySignal: 0.7, prioritySignal: 0.82 },
      { problemId: "P07", evidence: "supported", supportSignal: 0.8, impactSignal: 0.7, urgencySignal: 0.6, prioritySignal: 0.7 },
    ],
    priority: ["P10"], threeCShare: { culture: 33, capacity: 62, compliance: 5 }, generatedAt: "2026-01-01T00:00:00Z",
  };
  const presentation = buildAdaptivePresentation(session);
  assert.match(presentation.headline, /Staffing gaps/);
  assert.match(presentation.summary, /demand exceeding capacity/i);
  assert.match(presentation.insights[0].evidence, /cycle of overload/);
  assert.equal(presentation.context[0].answer, "Staff covered vacant roles and demand grew.");
  assert.equal(presentation.strongestDimension, "capacity");
  assert.equal(presentation.prompts.length, 3);
});

test("inconclusive result offers evidence-gathering next steps", () => {
  const session = createAssessmentSession("inconclusive");
  session.result = { problems: [], priority: [], threeCShare: { culture: 0, capacity: 0, compliance: 0 }, generatedAt: "2026-01-01T00:00:00Z" };
  const presentation = buildAdaptivePresentation(session);
  assert.equal(presentation.insights.length, 0);
  assert.equal(presentation.strongestDimension, null);
  assert.match(presentation.startingAction, /recent example/);
});
