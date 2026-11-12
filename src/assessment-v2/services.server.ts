import { createGeminiQuestionWriter } from "./gemini.server.ts";
import { createJevEvaluator, jevConfigFromEnv } from "./jev.server.ts";
import { geminiConfigFromEnv } from "./gemini-client.server.ts";
import type { ProblemEvaluator, QuestionWriter } from "./types.ts";

/** Create once per server request. No provider secret belongs in browser code. */
export function assessmentServicesFromEnv(): { evaluator: ProblemEvaluator; writer?: QuestionWriter } {
  const jevConfig = jevConfigFromEnv();
  const geminiConfig = geminiConfigFromEnv();
  return {
    evaluator: createJevEvaluator(jevConfig),
    ...(geminiConfig.apiKey ? { writer: createGeminiQuestionWriter(geminiConfig) } : {}),
  };
}
