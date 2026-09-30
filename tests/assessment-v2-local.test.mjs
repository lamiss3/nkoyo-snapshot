import assert from "node:assert/strict";
import test from "node:test";
import { createAssessmentSession, submitAssessmentAnswer, advanceAssessment } from "../src/assessment-v2/orchestrator.ts";
import { localRuleEvaluator } from "../src/assessment-v2/local-evaluator.ts";

test("local preview ranks related opening topics above unrelated exploratory probes", async () => {
  let session = createAssessmentSession("local-routing");
  session = submitAssessmentAnswer(session, { questionId: "q1", optionIds: ["decisions", "authority"] });
  session = submitAssessmentAnswer(session, { questionId: "q2", optionIds: ["escalate", "wait_for_authority"] });
  session = submitAssessmentAnswer(session, { questionId: "q3", optionIds: ["delay"] });
  session = submitAssessmentAnswer(session, { questionId: "q4", text: "Routine approvals delayed work." });
  session = await advanceAssessment(session, { evaluator: localRuleEvaluator });
  assert.deepEqual(session.topFour, ["P03", "P04", "P05", "P17"]);
});
