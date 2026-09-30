import { createServerFn } from "@tanstack/react-start";
import type { AssessmentSession } from "./types.ts";

/** Adaptive assessment endpoint. Sessions live in browser storage for this phase;
 * the server performs model calls so API keys never enter the browser bundle. */
export const advanceAdaptiveAssessment = createServerFn({ method: "POST" })
  .validator((data: AssessmentSession) => {
    if (data?.version !== "adaptive-v1" || typeof data.id !== "string" || data.answers?.length > 11 || data.questions?.length > 11 || JSON.stringify(data).length > 80000) {
      throw new Error("Invalid assessment session");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const isDevelopment = process.env['NODE_ENV'] === "development";
    const { advanceAssessment } = await import("./orchestrator.ts");
    const { localRuleEvaluator } = await import("./local-evaluator.ts");
    const { createJevEvaluator } = await import("./jev.server.ts");
    const { createGeminiQuestionWriter } = await import("./gemini.server.ts");
    const jevKey = process.env['JEV_API_KEY'];
    const geminiKey = process.env['GEMINI_API_KEY'];
    if (!jevKey && !isDevelopment) throw new Error("JEV_API_KEY is required for the public assessment");
    const writer = geminiKey ? createGeminiQuestionWriter({ apiKey: geminiKey, model: process.env['GEMINI_MODEL'] || "gemini-3.6-flash" }) : undefined;
    const evaluator = jevKey ? createJevEvaluator({ apiKey: jevKey, model: process.env['JEV_MODEL'] || "jev-latest" }) : localRuleEvaluator;
    try {
      return await advanceAssessment(data, { evaluator, ...(writer ? { writer } : {}) });
    } catch (error) {
      if (!jevKey || !isDevelopment) throw error;
      console.error("Jev evaluation failed; using local rules for this localhost stage", error);
      return advanceAssessment(data, { evaluator: localRuleEvaluator, ...(writer ? { writer } : {}) });
    }
  });
