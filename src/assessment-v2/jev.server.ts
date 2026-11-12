import { problemById } from "./problem-bank.ts";
import type { Answer, AssessmentQuestion, EvidenceChoice, EvaluationRequest, ProblemEvaluation, ProblemEvaluator } from "./types.ts";
import { recordedModelCall, type ModelCallRecorder } from "./provider-trace.server.ts";

const jevTransports = {
  typesafe: {
    endpoint: "https://api.typesafe.ai/v1/systemone",
    keyName: "JEV_API_KEY",
    defaultModel: "jev-latest",
    label: "Jev",
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/alpha/decisions",
    keyName: "OPENROUTER_API_KEY",
    defaultModel: "~typesafe/jev-latest",
    label: "Jev via OpenRouter",
  },
} as const;

type JevTransport = keyof typeof jevTransports;

/** Separate from the settings for writing questions and emails. */
export function jevConfigFromEnv(env: NodeJS.ProcessEnv = process.env): {
  transport: JevTransport;
  keyName: (typeof jevTransports)[JevTransport]["keyName"];
  apiKey: string;
  model: string;
} {
  const transport = env["JEV_PROVIDER"]?.trim() || "typesafe";
  if (transport !== "typesafe" && transport !== "openrouter") {
    throw new Error("JEV_PROVIDER must be typesafe or openrouter");
  }
  const { keyName, defaultModel } = jevTransports[transport];
  const modelName = transport === "openrouter" ? "JEV_OPENROUTER_MODEL" : "JEV_MODEL";
  return {
    transport,
    keyName,
    apiKey: env[keyName]?.trim() ?? "",
    model: env[modelName]?.trim() || defaultModel,
  };
}

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
    return { question: question.text, selectedAnswers: selections, writtenAnswer: answer.text ?? "", answerMode: question.answerMode ?? "direct_response", skipped: answer.skipped ?? false };
  }).filter(Boolean);
}

/** Server-only Jev adapter. The model evaluates evidence; deterministic code
 * selects the next problem IDs and computes the final ordering. */
export function createJevEvaluator(config: {
  apiKey: string;
  transport?: JevTransport;
  model?: string;
  fetcher?: typeof fetch;
  trace?: ModelCallRecorder;
}): ProblemEvaluator {
  const fetcher = config.fetcher ?? fetch;
  const transport = config.transport ?? "typesafe";
  const { endpoint, keyName, defaultModel, label } = jevTransports[transport];
  const model = config.model ?? defaultModel;
  if (!config.apiKey) throw new Error(`${keyName} is required`);
  if (
    transport === "openrouter" &&
    model !== "~typesafe/jev-latest" &&
    !/^typesafe\/jev-[a-z0-9][a-z0-9.-]*$/.test(model)
  ) {
    throw new Error("JEV_OPENROUTER_MODEL must identify a TypeSafe Jev model on OpenRouter");
  }

  return {
    async evaluate(request: EvaluationRequest) {
      const questions: Record<string, unknown> = {};
      for (const id of request.problemIds) {
        const problem = problemById[id];
        questions[id] = {
          type: "choice",
          instructions: `Assess whether the organizational problem "${problem.name}" is present in the respondent's account. Consider the problem-specific probe if answered. Use only respondent evidence, not general nonprofit prevalence. A scenario_match selection means the hypothetical example is the closest similarity, not a verified real event. None/unsure is lack of information, not proof that every issue is absent. A skipped optional answer supplies no evidence; do not penalize it or infer an event from it.`,
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

      const body = {
        model,
        state: {
          assessmentVersion: request.version ?? "adaptive-v1",
          round: request.round,
          respondentAnswers: responseSummary(request.questions, request.answers),
        },
        questions,
      };
      return recordedModelCall({ provider: "jev", operation: request.round, configured_model: model, request: body }, config.trace, async (capture) => {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      });
      await capture(response);
      if (!response.ok) throw new Error(`${label} request failed (${response.status})`);
      const payload = await response.json() as JevResponse;
      const evaluations: ProblemEvaluation[] = request.problemIds.map((id) => {
        const answer = payload.answers?.[id];
        if (!answer || answer.type !== "choice" || !Object.hasOwn(choices, answer.choice)) throw new Error(`Jev returned an invalid choice for ${id}`);
        const probabilities = Object.fromEntries(Object.keys(choices).map((choice) => [choice, answer.probabilities?.[choice]])) as Record<EvidenceChoice, number>;
        const values = Object.values(probabilities);
        if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1) || Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 0.05) {
          throw new Error(`Jev returned invalid evidence probabilities for ${id}`);
        }
        const evaluation: ProblemEvaluation = { problemId: id, choice: answer.choice as EvidenceChoice, probabilities };
        if (request.round === "final") {
          const impact = payload.answers?.[`${id}_impact`];
          const urgency = payload.answers?.[`${id}_urgency`];
          if (impact?.type !== "score" || urgency?.type !== "score") throw new Error(`Jev returned invalid final signals for ${id}`);
          if ([impact.score, urgency.score].some((score) => !Number.isFinite(score) || score < 0 || score > 4)) throw new Error(`Jev returned out-of-range final signals for ${id}`);
          evaluation.impact = impact.score / 4;
          evaluation.urgency = urgency.score / 4;
        }
        return evaluation;
      });
      return { round: request.round, model: payload.model ?? model, rubricVersion: "evidence-rubric-v1", evaluations };
      });
    },
  };
}
