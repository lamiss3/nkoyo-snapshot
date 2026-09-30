import { createGeminiQuestionWriter } from "./gemini.server.ts";
import { createJevEvaluator } from "./jev.server.ts";
import type { ProblemEvaluator, QuestionWriter } from "./types.ts";

/** Create once per server request. No provider secret belongs in browser code. */
export function assessmentServicesFromEnv(): { evaluator: ProblemEvaluator; writer?: QuestionWriter } {
  const jevKey = process.env['JEV_API_KEY'];
  if (!jevKey) throw new Error("JEV_API_KEY must be configured before the adaptive assessment is enabled");
  const geminiKey = process.env['GEMINI_API_KEY'];
  return {
    evaluator: createJevEvaluator({ apiKey: jevKey, model: process.env['JEV_MODEL'] || "jev-latest" }),
    ...(geminiKey ? { writer: createGeminiQuestionWriter({ apiKey: geminiKey, model: process.env['GEMINI_MODEL'] || "gemini-3.6-flash" }) } : {}),
  };
}
