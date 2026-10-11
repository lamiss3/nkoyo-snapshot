import { legacyOpeningQuestions } from "./opening-questions.ts";
import { problemById } from "./problem-bank.ts";
import type { Answer, AssessmentQuestion, ProblemId, QuestionContext } from "./types.ts";

/** Fixed, observable examples. Labels are for routing; they never assign scores. */
export const scenarioBank: Record<ProblemId, string> = {
  P01: "A team cannot commit to next year’s work because a short grant may end before staffing or service commitments do.",
  P02: "A project has delivery funding, but restrictions leave the administration or systems that support it uncovered.",
  P03: "A routine task waits for a senior person’s approval even though the team has the information needed to move ahead.",
  P04: "Someone is accountable for a task but cannot make the decisions needed to complete it, so work pauses while permission is clarified.",
  P05: "The board and leadership revisit who should decide an operational matter, leaving a team unsure how to proceed.",
  P06: "The organization agrees on its values, but everyday decisions do not consistently reflect those expectations.",
  P07: "Requests for a service keep growing while the team’s available time stays the same, creating a recurring backlog.",
  P08: "A new location or larger program launches, but the processes and responsibilities that worked at a smaller scale no longer fit.",
  P09: "People repeatedly extend their hours to keep work going, leaving little time to recover and making the pace difficult to sustain.",
  P10: "Unfilled roles leave colleagues covering the same extra tasks week after week, and other work slips.",
  P11: "A new requirement arrives, but nobody clearly owns checking what must change or whether it has been done.",
  P12: "An unexpected disruption stops a service because the team has not agreed a workable backup plan.",
  P13: "A shared project slows because partners have not agreed who will do what, or how to resolve different expectations.",
  P14: "Several funders need different versions of similar reports, taking recurring time away from delivery.",
  P15: "A leader’s planned departure is approaching, but the handover, successor or transfer of relationships is not ready.",
  P16: "When one key person is unavailable, a recurring task stops because their knowledge or contacts are not accessible to others.",
  P17: "Two teams prioritize different goals, so shared work is repeatedly redirected or duplicated.",
  P18: "The strategic plan is agreed, but urgent requests repeatedly replace its priorities in everyday decisions.",
  P19: "Staff use AI tools in different ways without agreed checks for sensitive information, accuracy or accountability.",
  P20: "A useful digital tool is available, but limited training or support means people struggle to use it in routine work.",
};
const signals: Record<string, ProblemId[]> = {
  decisions: ["P03", "P04", "P05"],
  authority: ["P04", "P03"],
  relationships: ["P05", "P13", "P17"],
  values: ["P06", "P17"],
  demand: ["P07", "P08"],
  workload: ["P09", "P10"],
  funding: ["P01", "P02", "P14"],
  requirements: ["P11", "P12", "P14"],
  key_person: ["P16", "P15"],
  strategy: ["P18", "P17"],
  technology: ["P20", "P19"],
  escalate: ["P03", "P04"],
  wait_for_authority: ["P04"],
  extra_checks: ["P11", "P05"],
  extra_work: ["P09", "P10"],
  postpone: ["P07", "P18"],
  separate_ways: ["P17", "P13"],
  varies: ["P17", "P18"],
  delay: ["P03"],
  wellbeing: ["P09"],
  service: ["P07"],
  finances: ["P01"],
  safeguards: ["P11"],
  focus: ["P17"],
};
export function matchedScenarioIds(answers: readonly Answer[]): ProblemId[] {
  const weights = new Map<ProblemId, number>();
  for (const answer of answers.filter(
    (a) => a.questionId.startsWith("q1") || a.questionId.startsWith("q2") || a.questionId === "q3",
  ))
    for (const option of answer.optionIds ?? [])
      (signals[option] ?? []).forEach((id, index) =>
        weights.set(id, (weights.get(id) ?? 0) + 3 - index),
      );
  return [...weights]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([id]) => id);
}
export const noScenario = { id: "none", text: "None of these fits / I’m not sure." };
const scenarioHelper =
  "These are hypothetical examples. Choose the closest match to your experience; it does not need to fit exactly.";
export function openingScenarioQuestion(answers: readonly Answer[]): AssessmentQuestion {
  let ids = matchedScenarioIds(answers);
  if (!ids.length) ids = ["P03", "P07", "P17"];
  // Offer at least two examples, without treating the added one as a finding.
  if (ids.length === 1) ids.push(ids[0] === "P07" ? "P03" : "P07");
  return {
    id: "q4",
    kind: "single",
    source: "fixed",
    answerMode: "scenario_match",
    text: "Which situation is closest to what you are experiencing?",
    helper: scenarioHelper,
    options: [
      ...ids.map((id, index) => ({
        id: `scenario_${id}`,
        text: `${String.fromCharCode(65 + index)}. ${scenarioBank[id]}`,
      })),
      noScenario,
    ],
  };
}
export function consequenceQuestion(answers: readonly Answer[]): AssessmentQuestion {
  const ids = matchedScenarioIds(answers);
  const consequence: Record<ProblemId, string> = {
    P01: "finances",
    P02: "finances",
    P03: "delay",
    P04: "delay",
    P05: "delay",
    P06: "focus",
    P07: "service",
    P08: "opportunity",
    P09: "wellbeing",
    P10: "service",
    P11: "safeguards",
    P12: "service",
    P13: "opportunity",
    P14: "leader_time",
    P15: "service",
    P16: "service",
    P17: "focus",
    P18: "focus",
    P19: "safeguards",
    P20: "delay",
  };
  const selected = [
    ...new Set([...ids.map((id) => consequence[id]), "delay", "wellbeing", "service"]),
  ].slice(0, 3);
  const legacy = legacyOpeningQuestions.find((q) => q.id === "q3")!;
  return {
    ...legacy,
    helper: "Choose the closest consequence, if any.",
    options: [
      ...selected.map((id) => legacy.options!.find((o) => o.id === id)!),
      { id: "unsure", text: "None of these / no clear impact / I’m not sure." },
    ],
  };
}
export function optionalFinalQuestion(input: QuestionContext): AssessmentQuestion {
  const id = input.finalists[1];
  return {
    id: "q11",
    kind: "text",
    problemId: id,
    optional: true,
    source: "fixed",
    text: `Thinking about ${problemById[id].name.toLowerCase()}, what is one recent example, if any, and what effect did it have?`,
    helper:
      "Optional: add anything the choices missed, or skip to your result. Avoid names or confidential details.",
  };
}
export function fallbackScenarioQuestion(
  input: QuestionContext,
  id: "q9" | "q10",
): AssessmentQuestion {
  const [first, second] = input.finalists;
  const options = [
    { id: "scenario_a", text: `A. ${scenarioBank[first]}` },
    { id: "scenario_b", text: `B. ${scenarioBank[second]}` },
    {
      id: "scenario_both",
      text: "C. Parts of both examples are familiar; the difficulties sometimes happen together.",
    },
    noScenario,
  ];
  return {
    id,
    kind: "single",
    source: "fallback",
    answerMode: "scenario_match",
    ...(id === "q10" ? { problemId: first } : {}),
    text:
      id === "q9"
        ? "Which example best matches how these difficulties show up?"
        : "Looking at the two examples again, which pattern fits best?",
    helper: scenarioHelper,
    options:
      id === "q10"
        ? [
            options[0]!,
            options[1]!,
            {
              id: "scenario_separate",
              text: "C. Both are familiar, but they usually happen separately.",
            },
            noScenario,
          ]
        : options,
  };
}
