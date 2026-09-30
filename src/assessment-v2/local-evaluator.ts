import { problemById } from "./problem-bank.ts";
import type { Answer, EvidenceChoice, EvaluationRequest, ProblemEvaluation, ProblemEvaluator, ProblemId } from "./types.ts";

/** Transparent localhost fallback for reviewing the new journey without API keys.
 * These are hand-written routing rules, not an AI interpretation of free text. */
const openingSignals: Record<string, readonly ProblemId[]> = {
  decisions: ["P03", "P04", "P05"], authority: ["P04", "P03", "P05"],
  relationships: ["P05", "P13", "P17"], values: ["P06", "P17"],
  demand: ["P07", "P08", "P09"], workload: ["P09", "P10", "P07"],
  funding: ["P01", "P02", "P14"], requirements: ["P11", "P12", "P14"],
  key_person: ["P16", "P15", "P10"], strategy: ["P18", "P17", "P08"],
  technology: ["P20", "P19"], escalate: ["P03", "P04"],
  extra_work: ["P09", "P10", "P07"], wait_for_authority: ["P04", "P03"],
  separate_ways: ["P17", "P18", "P05"], postpone: ["P07", "P09", "P18"],
  extra_checks: ["P11", "P05", "P03"], agreed_process: [], varies: ["P17", "P18"],
  delay: ["P03", "P04", "P17"], wellbeing: ["P09", "P10"],
  service: ["P07", "P10", "P16"], leader_time: ["P03", "P04"],
  finances: ["P01", "P02"], safeguards: ["P11", "P12", "P19"],
  focus: ["P17", "P18"], opportunity: ["P08", "P13"],
};

const terms: Record<ProblemId, readonly string[]> = {
  P01: ["short grant", "renewal", "funding cycle"], P02: ["restricted fund", "overhead", "core cost"],
  P03: ["approval", "bottleneck", "decision delay"], P04: ["authority", "accountab", "permission"],
  P05: ["board", "governance"], P06: ["values", "principle", "culture"],
  P07: ["demand", "backlog", "waitlist"], P08: ["growth", "expansion", "scaling"],
  P09: ["burnout", "exhaust", "wellbeing", "workload"], P10: ["vacancy", "vacancies", "staff shortage"],
  P11: ["requirement", "regulation", "compliance change"], P12: ["disruption", "emergency", "contingency"],
  P13: ["partner", "collaboration"], P14: ["reporting", "funder report"],
  P15: ["succession", "retirement", "departure"], P16: ["key person", "institutional knowledge", "one person"],
  P17: ["priorities", "team conflict"], P18: ["strategy", "plan", "daily work"],
  P19: ["ai", "artificial intelligence"], P20: ["technology", "software", "digital skill"],
};

function selected(answers: readonly Answer[]): string[] {
  return answers.flatMap((answer) => answer.optionIds ?? []);
}

function probeLevel(id: ProblemId, answers: readonly Answer[]): number | null {
  const answer = answers.find((item) => item.questionId === problemById[id].probe.id);
  const option = answer?.optionIds?.[0];
  if (!option) return null;
  const index = Number(option.replace("option_", ""));
  if (!Number.isInteger(index) || index < 1) return null;
  if (index <= 4) return index;
  return index === (problemById[id].probe.options?.length ?? 0) ? null : 1;
}

function probabilities(choice: EvidenceChoice, strength: number): Record<EvidenceChoice, number> {
  if (choice === "possible") {
    const supported = 0.1 + Math.min(strength, 4) * 0.07;
    return { insufficient_information: 0.05, contradicted: 0.05, possible: 0.9 - supported, supported };
  }
  return {
    insufficient_information: choice === "insufficient_information" ? 0.85 : 0.05,
    contradicted: choice === "contradicted" ? 0.85 : 0.05,
    possible: 0.05,
    supported: choice === "supported" ? 0.85 : 0.05,
  };
}

function evaluateOne(id: ProblemId, request: EvaluationRequest): ProblemEvaluation {
  const choices = selected(request.answers);
  const structured = choices.reduce((sum, option) => sum + (openingSignals[option]?.includes(id) ? 1 : 0), 0);
  const written = request.answers.filter((answer) => ["q4", "q9", "q10", "q11"].includes(answer.questionId)).map((answer) => answer.text ?? "").join(" ").toLowerCase();
  const keyword = terms[id].some((term) => written.includes(term)) ? 1 : 0;
  const level = probeLevel(id, request.answers);
  let choice: EvidenceChoice;
  if (level === 1) choice = "contradicted";
  else if (level === 4 || level === 3) choice = "supported";
  else if (level === 2) choice = structured + keyword >= 1 ? "possible" : "contradicted";
  else if (structured + keyword >= 1) choice = "possible";
  else choice = "insufficient_information";

  const result: ProblemEvaluation = { problemId: id, choice, probabilities: probabilities(choice, structured + keyword) };
  if (request.round === "final") {
    result.impact = level === 4 ? 0.9 : level === 3 ? 0.7 : level === 2 ? 0.4 : 0.2;
    result.urgency = choices.includes("safeguards") || choices.includes("wellbeing") ? 0.8 : level === 4 ? 0.8 : level === 3 ? 0.6 : 0.4;
  }
  return result;
}

export const localRuleEvaluator: ProblemEvaluator = {
  async evaluate(request) {
    return {
      round: request.round,
      model: "local-rules-demo",
      rubricVersion: "local-rules-v1",
      evaluations: request.problemIds.map((id) => evaluateOne(id, request)),
    };
  },
};
