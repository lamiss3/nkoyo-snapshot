// Editorial fixture only: invented organization/answers and human-written copy.
// No model, subscriber, delivery or production record is involved.
import { createAssessmentSession } from "../../src/assessment-v2/orchestrator.ts";
import { problemById } from "../../src/assessment-v2/problem-bank.ts";
export function fictionalSession() {
  const session = createAssessmentSession("fictional-editorial-review", "adaptive-v1");
  session.stage = "complete";
  session.questions.push(problemById.P03.probe, problemById.P04.probe);
  session.answers = [
    {
      questionId: "q4",
      text: "Last month, a routine supply request waited two weeks. The team knew who approved it, but the request returned twice for missing information. Some colleagues also said they were unsure which small purchases they could approve themselves. We have not checked whether this is typical.",
      submittedAt: session.createdAt,
    },
    {
      questionId: "probe_p03",
      text: "Routine decisions sometimes wait for senior approval; we do not know whether the cause is unclear limits or incomplete requests.",
      submittedAt: session.createdAt,
    },
    {
      questionId: "probe_p04",
      text: "Some colleagues report owning a task while another person controls the next decision. We have not mapped the decisions involved.",
      submittedAt: session.createdAt,
    },
  ];
  session.result = {
    problems: [
      {
        problemId: "P03",
        evidence: "supported",
        supportSignal: 0.85,
        impactSignal: 0.7,
        urgencySignal: 0.5,
        prioritySignal: 0.735,
      },
      {
        problemId: "P04",
        evidence: "possible",
        supportSignal: 0.6,
        impactSignal: 0.5,
        urgencySignal: 0.4,
        prioritySignal: 0.535,
      },
    ],
    priority: ["P03"],
    threeCShare: { culture: 45, capacity: 35, compliance: 20 },
    generatedAt: session.updatedAt,
  };
  return session;
}
const section = (heading, paragraphs, ...sourceQuestionIds) => ({
  heading,
  paragraphs,
  sourceQuestionIds,
});
export const fictionalOutput = {
  emails: [
    {
      number: 1,
      purpose: "detailed_report",
      focusId: "P03",
      subject: "A delayed approval: check where the request actually waited",
      preview: "Start with one request before deciding whether approval limits need to change.",
      mainAction:
        "Trace one low-risk routine request and note the first place it waited, what was missing, and who could move it forward.",
      sections: [
        section(
          "Your clearest finding",
          [
            "Decision delays are the clearest discussion point in your Snapshot. You described a supply request that waited two weeks and returned twice for missing information. That is one concrete event, rather than evidence that every purchase follows the same path. The useful starting question is what held this request up before deciding how widely the process needs to change.",
            "This distinction matters because a shorter approval route would not necessarily help a request that reaches its approver without the information needed to decide.",
          ],
          "q4",
        ),
        section(
          "Two explanations remain open",
          [
            "You also reported uncertainty about which small purchases colleagues can approve themselves. Unclear limits could send a routine choice to a senior person unnecessarily. Incomplete requests could cause a separate delay even when the approver is known. Both are plausible here, and they would call for different adjustments. The answers do not establish which explanation accounts for most waiting time.",
          ],
          "q4",
          "probe_p03",
        ),
        section(
          "Where responsibility may also matter",
          [
            "The possible responsibility-and-authority finding is relevant only if the person carrying a task cannot make a necessary decision. Your colleagues' reports make that worth checking, but the decisions have not been mapped. It would be premature to change everyone's authority on this basis. There may be a narrower missing handoff or an unclear limit affecting one type of request.",
          ],
          "probe_p04",
        ),
        section(
          "A first check you can use now",
          [
            "One manageable check is a trace of a single low-risk request: its owner, the information supplied, the approver and the first point where it paused. An appropriate person involved in that request could help reconstruct those steps from available records. The observable outcome is a named wait and the condition needed to end it, even if the cause remains uncertain.",
            "Required approvals still apply. This check does not depend on more staff, a new system or permission to bypass controls, and it can be useful without any further emails. If timing records are unavailable, the first missing step is still a useful observation.",
          ],
          "q4",
        ),
      ],
    },
    {
      number: 2,
      purpose: "obstacle_distinction",
      focusId: "P03",
      subject: "An unclear limit and an incomplete request need different fixes",
      preview:
        "Use the next handoff to locate the obstacle, without assuming the first explanation is right.",
      mainAction:
        "For the request you choose, observe whether its first pause concerns who may decide or what information the decision needs.",
      sections: [
        section(
          "Distinguish the reason for waiting",
          [
            "The returning supply request points to missing information, while uncertainty about small-purchase limits points to a different possibility. If the decision owner is clear but the request is incomplete, a better handoff may help. If the required information is present but nobody can confirm who may act, a clearer decision boundary may help. Neither explanation should be assumed from the delay alone.",
          ],
          "q4",
        ),
        section(
          "Clues at the handoff",
          [
            "For an information gap, a useful clue is an approver naming a specific missing item before deciding. For a boundary gap, people may give different accounts of who can authorize the same next step. These are possible clues, not a description of events you have already observed. The request could contain both obstacles, or a different one altogether.",
          ],
          "probe_p03",
        ),
        section(
          "Keep the observation focused",
          [
            "Whether or not you have started the trace, the first pause is enough for this observation. Its stated reason is more useful than a broad judgment that approvals are slow. A reason that cannot yet be established is also a valid result: it points to the information the bounded test would need, rather than confirming either explanation.",
          ],
          "q4",
        ),
      ],
    },
    {
      number: 3,
      purpose: "bounded_test",
      focusId: "P03",
      subject: "Test one request with a clear owner and a complete handoff",
      preview: "Develop the same first check into a small test with an observable end point.",
      mainAction:
        "Agree one permitted low-risk request test, record its first wait and reason, and review it when that request reaches its next decision.",
      sections: [
        section(
          "One question, one request",
          [
            "The test question is whether a routine request can reach its next decision when its owner, permitted approval route and required information are clear. This develops the same trace rather than adding a second exercise. A single low-risk request is a useful boundary; it is not a trial of the whole purchasing system.",
          ],
          "q4",
        ),
        section(
          "Agree the method and its limits",
          [
            "A person close to the request could coordinate, if the relevant people agree. The request's owner and appropriate approver would confirm the information needed and the existing decision limit. Any change to authority would require the proper approval first. The method is to follow that agreed request through its normal route, without bypassing controls or assuming that every necessary input will be available.",
          ],
          "probe_p03",
          "probe_p04",
        ),
        section(
          "A small record and review point",
          [
            "The record can stay brief: when the request entered the route, its first pause if any, the reason given, and whether it reached the next decision. Reviewing at that decision or an agreed short stopping point keeps the test bounded. If it cannot start because its owner or required information is still unclear, that limitation is the result to record, not proof of a wider organizational failure.",
          ],
          "q4",
        ),
      ],
    },
    {
      number: 4,
      purpose: "result_interpretation",
      focusId: "P03",
      subject: "What three possible request outcomes would tell you",
      preview: "Match the next adjustment to what happens, including if the test has not started.",
      mainAction:
        "Choose the smallest adjustment that fits the observed outcome; if you have not started, begin by naming the chosen request's existing approver.",
      sections: [
        section(
          "Interpret only what the test shows",
          [
            "The outcome is not known when this email is written. Your earlier supply request gives a starting example, but the next request may behave differently. A useful interpretation stays close to its first wait and the reason for it. One successful request does not establish that all approval boundaries work, and a delay does not automatically prove that the original explanation was right.",
          ],
          "q4",
        ),
        section(
          "Different outcomes, different next steps",
          [
            "If the complete request moves through its agreed route, clearer preparation or ownership may have helped; retaining that narrow arrangement for another comparable request is more proportionate than changing all approvals. If it returns for a named missing item, the handoff may still be incomplete; refining that one input is the next adjustment. If it waits because the decision right remains disputed, the boundary needs discussion with whoever can authorize it before the test is widened.",
          ],
          "probe_p03",
          "probe_p04",
        ),
        section(
          "A smaller entry point is still useful",
          [
            "If you have not started, identifying the existing approver for one chosen request is enough to begin. There is no need to claim a result or reconstruct a full process. If a different obstacle appears, such as an unavailable dependency, it belongs in the record as a separate explanation to investigate. The adjustment should follow that observation rather than preserve the original hypothesis at all costs.",
          ],
          "q4",
        ),
      ],
    },
    {
      number: 5,
      purpose: "next_decision",
      focusId: "P03",
      subject: "Decide which request change you can own internally",
      preview:
        "Use one example and one unresolved decision to judge whether another perspective would help.",
      mainAction:
        "Choose an internal next step if its owner and limits are clear; if they remain unresolved and a discussion would help, bring the issue, one available example and the decision to Nkoyo.",
      sections: [
        section(
          "Name the decision that remains",
          [
            "The unresolved decision is whether this request type needs a clearer information handoff, a clarified approval boundary, or more evidence before either change. If the test has not happened, the decision may simply be who can agree its scope. The earlier two-week delay identifies a case to explore; it does not settle what the next organizational change should be.",
          ],
          "q4",
        ),
        section(
          "Connect authority only where it matters",
          [
            "Your possible responsibility-and-authority finding may matter if the task owner cannot make the necessary next decision. It does not automatically explain missing information. Keeping that boundary explicit prevents one possible issue becoming the explanation for everything. Where the evidence points to a handoff problem alone, the useful next step can remain with that handoff.",
          ],
          "probe_p04",
        ),
        section(
          "A practical choice of next step",
          [
            "An internal adjustment may be enough when an authorized owner, permitted change and observable check are clear. Another perspective may help when ownership is disputed, several functions must agree, or the evidence points in different directions. A compact preparation note is the issue, one observed example if available, and the decision you want to make. There is no need to invent progress or assemble a comprehensive report before considering a discussion.",
          ],
          "probe_p03",
          "probe_p04",
        ),
      ],
    },
  ],
};
