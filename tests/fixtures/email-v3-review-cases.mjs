// Fictional email-writing inputs only. Saved finding labels are supplied, not Jev results.
import assert from "node:assert/strict";
import { createAssessmentSession } from "../../src/assessment-v2/orchestrator.ts";
import { openingScenarioQuestion } from "../../src/assessment-v2/scenario-questions.ts";
import { validateAssessmentSession } from "../../src/assessment-v2/session-validation.ts";
import { emailJourneyBrief } from "../../src/assessment-v2/email-journey.ts";

const timestamp = "2026-10-16T12:00:00Z";
const answer = (questionId, content) => ({ questionId, submittedAt: timestamp, ...content });
const finding = (problemId, evidence, prioritySignal) => ({
  problemId,
  evidence,
  prioritySignal,
  supportSignal: prioritySignal,
  impactSignal: 0.6,
  urgencySignal: 0.4,
});
function purchasingCase() {
  const session = createAssessmentSession("f1c71000-0000-4000-8000-000000000001", "adaptive-v2");
  delete session.traceToken;
  session.createdAt = session.updatedAt = timestamp;
  session.events = [];
  session.stage = "complete";
  session.answers = [
    answer("q1a", { optionIds: ["decisions", "authority"] }),
    answer("q1b", { optionIds: ["unsure"] }),
    answer("q1c", { optionIds: ["unsure"] }),
    answer("q2a", { optionIds: ["escalate"] }),
    answer("q2b", { optionIds: ["agreed_process"] }),
    answer("q3", { optionIds: ["delay"] }),
  ];
  session.questions = session.questions.map((q) =>
    q.id === "q4" ? openingScenarioQuestion(session.answers) : q,
  );
  session.answers.push(answer("q4", { optionIds: ["scenario_P03"] }));
  session.questions.push(
    {
      id: "q9",
      kind: "single",
      source: "generated",
      answerMode: "scenario_match",
      model: "Fictional scenario fixture; no AI called",
      text: "Which hypothetical situation is the closest match?",
      options: [
        {
          id: "boundary",
          text: "A colleague owns a task but would need another person's permission for its next decision, even with the necessary information available.",
        },
        {
          id: "inputs",
          text: "The approver is agreed, but a request would wait until its missing information is supplied.",
        },
        { id: "none", text: "Neither fits / I am not sure." },
      ],
    },
    {
      id: "q11",
      kind: "text",
      source: "fixed",
      optional: true,
      text: "Is there one recent example or anything else you want to add? Leave out names or confidential information.",
    },
  );
  session.answers.push(
    answer("q9", { optionIds: ["boundary"] }),
    answer("q11", {
      text: "Last month a routine supply request took two weeks to reach approval. It was returned twice for missing information. The team knew the approver for that request. Some colleagues say they are unsure which small purchases they may approve themselves, but we have not mapped those decisions or checked whether the delay is typical. We have not tried a new process.",
    }),
  );
  session.result = {
    problems: [finding("P03", "supported", 0.735), finding("P04", "possible", 0.535)],
    priority: ["P03"],
    threeCShare: { culture: 45, capacity: 35, compliance: 20 },
    generatedAt: timestamp,
  };
  return session;
}

export function emailReviewCases() {
  const purchasing = purchasingCase();
  const sparse = purchasingCase();
  sparse.id = "f1c71000-0000-4000-8000-000000000002";
  sparse.answers = [
    answer("q1a", { optionIds: ["unsure"] }),
    answer("q4", { optionIds: ["none"] }),
    answer("q9", { optionIds: ["none"] }),
    answer("q11", {
      text: "Someone says routine approvals take weeks. I only saw one small purchase approved the same afternoon, and I have no dates or details for the claimed delays. I do not know how other teams handle this.",
    }),
  ];
  sparse.result.problems = [
    finding("P03", "possible", 0.4),
    finding("P04", "insufficient_information", 0.1),
  ];
  const noSecondary = purchasingCase();
  noSecondary.id = "f1c71000-0000-4000-8000-000000000003";
  noSecondary.answers.find((a) => a.questionId === "q1a").optionIds = ["decisions"];
  noSecondary.answers.find((a) => a.questionId === "q9").optionIds = ["none"];
  noSecondary.answers.find((a) => a.questionId === "q11").text =
    "Last month a routine supply request took two weeks to reach approval and was returned twice for missing information. Staff agree who can approve that type of purchase. We have not checked whether other requests have the same information gap or tried a new process. I cannot identify a separate responsibility or authority problem.";
  noSecondary.result.problems[1] = finding("P04", "insufficient_information", 0.1);
  return [
    {
      key: "purchasing",
      label: "FICTIONAL: purchasing delay with possible authority issue",
      session: purchasing,
    },
    {
      key: "sparse-conflicting",
      label: "FICTIONAL: sparse and conflicting accounts",
      session: sparse,
    },
    {
      key: "no-secondary",
      label: "FICTIONAL: approval delay with no eligible secondary finding",
      session: noSecondary,
    },
  ];
}

/** Input checks only: they do not establish the validity of a fictional saved assessment score. */
export function validateReviewCases(cases = emailReviewCases()) {
  for (const { session } of cases) {
    validateAssessmentSession(session);
    assert.equal(session.stage, "complete");
    assert.equal(session.traceToken, undefined);
    assert.ok(session.result);
    for (const a of session.answers) {
      const q = session.questions.find((q) => q.id === a.questionId);
      if (q.kind === "text") assert.ok(a.text?.trim() || a.skipped);
      else {
        assert.ok(a.optionIds.length > 0 && a.optionIds.length <= (q.maxSelections ?? 1));
        assert.ok(a.optionIds.every((id) => q.options.some((o) => o.id === id)));
      }
    }
  }
  const briefs = cases.map((c) => emailJourneyBrief(c.session));
  assert.equal(briefs[0].primaryId, "P03");
  assert.equal(briefs[0].secondaryId, "P04");
  assert.equal(briefs[0].topics[0].evidence, "supported");
  assert.equal(briefs[0].topics[1].evidence, "possible");
  assert.ok(briefs[0].responses.some((r) => r.evidenceUse === "hypothetical_match"));
  assert.equal(briefs[1].sparseEvidence, true);
  assert.equal(briefs[1].topics[0].evidence, "possible");
  assert.equal(briefs[2].primaryId, "P03");
  assert.equal(briefs[2].secondaryId, null);
  return cases;
}
