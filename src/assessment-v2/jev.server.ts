import { problemById } from "./problem-bank.ts";
import type { Answer, AssessmentQuestion, EvidenceChoice, EvaluationRequest, ProblemEvaluation, ProblemEvaluator } from "./types.ts";

const choices: Record<EvidenceChoice, string> = {
  insufficient_information: "The respondent has not supplied enough relevant evidence to judge whether this problem is present. Do not treat silence or uncertainty as a negative answer.",
  contradicted: "The respondent gives concrete evidence that this problem is absent or well managed.",
  possible: "There are relevant signs, but the account is indirect, mixed, or too limited to confirm the problem.",
  supported: "The respondent gives direct, recent evidence that this problem is affecting the organization.",
};

type JevAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number> }
  | { type: "score"; score: number; probabilities: Record<string, number> };

interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
}

function responseSummary(questions: readonly AssessmentQuestion[], answers: readonly Answer[]) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return answers.map((answer) => {
    const question = byId.get(answer.questionId);
    if (!question) return null;
    const selections = answer.optionIds?.map((id) => question.options?.find((option) => option.id === id)?.text).filter(Boolean) ?? [];
    return { question: question.text, selectedAnswers: selections, writtenAnswer: answer.text ?? "" };
  }).filter(Boolean);
}

/** Server-only Jev adapter. The model evaluates evidence; deterministic code
 * selects the next problem IDs and computes the final ordering. */
export function createJevEvaluator(config: {
  apiKey: string;
  model?: string;
  fetcher?: typeof fetch;
}): ProblemEvaluator {
  const fetcher = config.fetcher ?? fetch;
  const model = config.model ?? "jev-latest";
  if (!config.apiKey) throw new Error("JEV_API_KEY is required");

  return {
    async evaluate(request: EvaluationRequest) {
      const questions: Record<string, unknown> = {};
      for (const id of request.problemIds) {
        const problem = problemById[id];
        questions[id] = {
          type: "choice",
          instructions: `Assess whether the organizational problem "${problem.name}" is present in the respondent's account. Consider the problem-specific probe if answered. Use only respondent evidence, not general nonprofit prevalence.`,
          criteria: choices,
        };
        if (request.round === "final") {
          questions[`${id}_impact`] = {
            type: "score",
            instructions: `How much demonstrated impact does "${problem.name}" have on this organization's work? Rate only from the respondent's evidence.`,
            criteria: ["No demonstrated impact", "Limited impact", "Moderate impact", "Substantial impact", "Severe impact"],
          };
          questions[`${id}_urgency`] = {
            type: "score",
            instructions: `How soon does "${problem.name}" require attention based on the respondent's evidence?`,
            criteria: ["No demonstrated urgency", "Can be monitored", "Needs planned attention", "Needs near-term attention", "Needs immediate attention"],
          };
        }
      }

      const response = await fetcher("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          state: {
            assessmentVersion: "adaptive-v1",
            round: request.round,
            respondentAnswers: responseSummary(request.questions, request.answers),
          },
          questions,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Jev request failed (${response.status})`);
      const payload = await response.json() as JevResponse;
      const evaluations: ProblemEvaluation[] = request.problemIds.map((id) => {
        const answer = payload.answers?.[id];
        if (!answer || answer.type !== "choice" || !(answer.choice in choices)) throw new Error(`Jev returned an invalid choice for ${id}`);
        const probabilities = Object.fromEntries(Object.keys(choices).map((choice) => [choice, answer.probabilities?.[choice]])) as Record<EvidenceChoice, number>;
        const evaluation: ProblemEvaluation = { problemId: id, choice: answer.choice as EvidenceChoice, probabilities };
        if (request.round === "final") {
          const impact = payload.answers?.[`${id}_impact`];
          const urgency = payload.answers?.[`${id}_urgency`];
          if (impact?.type !== "score" || urgency?.type !== "score") throw new Error(`Jev returned invalid final signals for ${id}`);
          evaluation.impact = impact.score / 4;
          evaluation.urgency = urgency.score / 4;
        }
        return evaluation;
      });
      return { round: request.round, model: payload.model ?? model, rubricVersion: "evidence-rubric-v1", evaluations };
    },
  };
}
