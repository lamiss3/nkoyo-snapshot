import { problemById } from "./problem-bank.ts";
import type { AssessmentSession, DimensionId, ProblemId, ResultProblem } from "./types.ts";

interface ProblemGuide {
  headline: string;
  meaning: string;
  explore: string;
  action: string;
}

/** Reviewed copy should replace this draft before public launch. The guide
 * describes what to investigate; it does not assert an unverified diagnosis. */
export const problemGuides: Record<ProblemId, ProblemGuide> = {
  P01: { headline: "Short funding cycles may be making commitments harder to sustain.", meaning: "Grant timing can shape whether staffing and service commitments remain steady.", explore: "Which commitment is most exposed when a grant ends or renewal is delayed?", action: "List the next three funding end dates beside the staffing and service commitments they support." },
  P02: { headline: "Essential support costs may be difficult to fund.", meaning: "Program income may leave administration, systems, or reserves under-supported.", explore: "Which necessary support cost is repeatedly missing from funding plans?", action: "Pick one essential support cost and calculate what it actually takes to cover it for a year." },
  P03: { headline: "Routine decisions may be waiting too long for approval.", meaning: "Work can stall when ordinary choices keep returning to senior leadership.", explore: "Which recurring decision could be made closer to the work, with clear limits?", action: "Choose one delayed decision and write down its owner, approval limit, and escalation route." },
  P04: { headline: "People may own results without the authority to deliver them.", meaning: "Responsibility is harder to carry when the needed decisions or resources sit elsewhere.", explore: "Where is someone accountable for an outcome they cannot actually influence?", action: "For one role, compare its expected results with the decisions and resources it can control." },
  P05: { headline: "Board and staff decision boundaries may need clarification.", meaning: "Unclear boundaries can reopen or slow operational decisions.", explore: "Which decisions should sit with the board, and which should sit with staff?", action: "Write a one-page decision map for one recurring board–staff handoff." },
  P06: { headline: "Everyday practice may not fully match stated values.", meaning: "A principle becomes credible when routines and rules reinforce it consistently.", explore: "Which routine would someone point to as evidence that a stated value is real?", action: "Choose one stated principle and review a recent decision or process against it." },
  P07: { headline: "Demand may be running ahead of sustainable capacity.", meaning: "Backlogs and extra work can signal a gap between commitments and available resources.", explore: "Where is demand growing faster than the team can respond reliably?", action: "Compare one month's demand with the time and people available to meet it; name one adjustment." },
  P08: { headline: "Growth may be stretching the current operating model.", meaning: "Processes that worked at a smaller scale may now create repeated coordination problems.", explore: "What changed as the organization grew that roles or processes have not caught up with?", action: "Map one recurring handoff that became harder after expansion and identify its new owner." },
  P09: { headline: "Recurring pressure may be leaving too little room to recover.", meaning: "Repeated workload or emotional strain can affect delivery and people's ability to stay.", explore: "Which pressure keeps returning, even after a busy period ends?", action: "Ask the affected team to identify one recurring demand to reduce, resource, or stop." },
  P10: { headline: "Staffing gaps may be feeding recurring overload.", meaning: "Vacancies and turnover can shift work onto remaining staff for longer than planned.", explore: "Which duties keep moving to the same people when roles are vacant?", action: "List the work absorbed during one vacancy and decide what can be paused, reassigned, or resourced." },
  P11: { headline: "Changing requirements may lack clear ownership.", meaning: "A requirement is easier to act on when someone identifies it, assigns work, and checks completion.", explore: "Who notices new requirements and confirms that changes were made?", action: "Choose one current requirement and record its owner, required change, due date, and check." },
  P12: { headline: "Disruption plans may need a practical test.", meaning: "Important responsibilities can remain unclear until a real interruption occurs.", explore: "What would the team have to work out during the first day of a disruption?", action: "Run a 30-minute walkthrough of one plausible interruption and note unclear roles or contacts." },
  P13: { headline: "Partnership decisions may need clearer rules.", meaning: "Shared goals work better when partners know who decides, contributes, and resolves disputes.", explore: "Where have partners needed to renegotiate authority during delivery?", action: "For one partnership, write down decision rights, responsibilities, and an escalation route." },
  P14: { headline: "Repeated funder reporting may be taking time from delivery.", meaning: "Different formats and metrics can make teams recreate the same information.", explore: "Which data is being collected or rewritten more than once?", action: "Compare two recent reports and identify information that could be collected once and reused." },
  P15: { headline: "A key departure may need earlier transition planning.", meaning: "Coverage is harder to arrange when succession work starts only as a departure approaches.", explore: "Which essential responsibilities lack a named temporary owner?", action: "List the departing role's critical decisions and relationships, then assign interim coverage." },
  P16: { headline: "Essential knowledge may be concentrated in one person.", meaning: "Work is more fragile when records, relationships, or practical steps are hard for others to access.", explore: "What would a colleague struggle to continue if that person were away for two weeks?", action: "Document one recurring task and ask a backup person to follow the instructions." },
  P17: { headline: "Teams may be working from competing priorities.", meaning: "Unresolved tradeoffs can create duplication, disputes, or delays.", explore: "Which two priorities are competing for the same people or resources?", action: "Bring one active tradeoff to the relevant teams and record the agreed priority and owner." },
  P18: { headline: "The plan may not be shaping everyday decisions.", meaning: "A strategy helps most when it changes owners, resources, and routines.", explore: "Which recent decision should the agreed plan have guided?", action: "Take one strategic priority and name its next action, owner, and review date." },
  P19: { headline: "AI use may need clearer review and accountability.", meaning: "Teams need shared rules for sensitive information, output checks, and who is responsible.", explore: "Which AI use needs a clearer human review step or information rule?", action: "Inventory one current AI use and agree who may use it, what data is allowed, and who checks outputs." },
  P20: { headline: "Technology may need more practical support.", meaning: "Tools help less when training, troubleshooting, or workflow guidance depends on one person.", explore: "Which tool repeatedly interrupts work or requires one person to rescue it?", action: "Choose one recurring tool problem and provide a short guide or a named support contact." },
};

export interface AdaptiveInsight {
  id: ProblemId;
  dimension: DimensionId;
  title: string;
  meaning: string;
  evidence: string;
  explore: string;
  action: string;
  label: "Primary focus" | "Also worth exploring";
}

export interface AdaptivePresentation {
  headline: string;
  summary: string;
  insights: AdaptiveInsight[];
  context: { id: string; label: string; answer: string }[];
  prompts: string[];
  startingAction: string;
  strongestDimension: DimensionId | null;
}

function respondentProbeChoice(session: AssessmentSession, problemId: ProblemId): string | null {
  const question = problemById[problemId].probe;
  const answer = session.answers.find((item) => item.questionId === question.id);
  return answer?.optionIds?.map((id) => question.options?.find((option) => option.id === id)?.text).filter(Boolean).join(" ") || null;
}

function insight(session: AssessmentSession, item: ResultProblem, index: number): AdaptiveInsight {
  const guide = problemGuides[item.problemId];
  const definition = problemById[item.problemId];
  return {
    id: item.problemId,
    dimension: definition.primaryDimension,
    title: definition.name,
    meaning: guide.meaning,
    evidence: respondentProbeChoice(session, item.problemId) ?? "This topic came through the opening and written answers; no fixed probe response was recorded for it.",
    explore: guide.explore,
    action: guide.action,
    label: index === 0 ? "Primary focus" : "Also worth exploring",
  };
}

export function buildAdaptivePresentation(session: AssessmentSession): AdaptivePresentation {
  const result = session.result;
  if (!result) throw new Error("Assessment result is missing");
  const relevant = result.problems.filter((item) => item.evidence === "supported" || item.evidence === "possible");
  const ordered = [...relevant].sort((a, b) => Number(result.priority.includes(b.problemId)) - Number(result.priority.includes(a.problemId)) || b.prioritySignal - a.prioritySignal);
  const insights = ordered.map((item, index) => insight(session, item, index));
  const primary = ordered[0];
  const secondary = ordered[1];
  const contextIds = ["q4", "q9", "q10", "q11"];
  const context = contextIds.flatMap((id) => {
    const answer = session.answers.find((item) => item.questionId === id)?.text?.trim();
    if (!answer) return [];
    const question = session.questions.find((item) => item.id === id);
    const label = id === "q4" ? "The situation you described" : id === "q9" ? "How the issues connect" : question?.problemId ? problemById[question.problemId].name : "A closer example";
    return [{ id, label, answer }];
  });
  const strongestDimension = (Object.entries(result.threeCShare) as [DimensionId, number][]).sort((a, b) => b[1] - a[1])[0];

  if (!primary) return {
    headline: "The next step is to get a clearer picture.",
    summary: "Your responses did not give enough consistent evidence to name a priority from the current topic bank. That is a useful outcome: gather a few concrete examples before deciding what to change.",
    insights: [], context,
    prompts: ["Which difficulty occurs most often in a normal month?", "Who sees its effects first?", "What example would help us tell whether it is a recurring issue?"],
    startingAction: "Ask two people close to the work for a recent example of what slowed delivery, and compare what they observed.",
    strongestDimension: null,
  };

  return {
    headline: problemGuides[primary.problemId].headline,
    summary: secondary ? `Your answers also raised ${problemById[secondary.problemId].name.toLowerCase()}. Explore how these two pressures may interact before choosing a larger change.` : "Your answers point to one topic worth discussing first. Use the examples below to check whether the pattern holds across the organization.",
    insights, context,
    prompts: [problemGuides[primary.problemId].explore, ...(secondary ? [problemGuides[secondary.problemId].explore] : []), "What would we need to see to know whether our first change helped?"].slice(0, 3),
    startingAction: problemGuides[primary.problemId].action,
    strongestDimension: strongestDimension && strongestDimension[1] > 0 ? strongestDimension[0] : null,
  };
}
