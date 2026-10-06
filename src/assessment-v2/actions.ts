import { createServerFn } from "@tanstack/react-start";
import { validateAssessmentSession } from "./session-validation";
import type { AssessmentSession } from "./types.ts";

export const checkpointAdaptiveAssessment = createServerFn({ method: "POST" })
  .validator((data: { session: AssessmentSession; questionId?: string; action: "progress_saved" | "answer_confirmed" | "session_restarted" }) => {
    validateAssessmentSession(data?.session);
    if (!["progress_saved", "answer_confirmed", "session_restarted"].includes(data.action) ||
      (data.questionId !== undefined && !data.session.questions.some((q) => q.id === data.questionId))) throw new Error("Invalid assessment checkpoint");
    return data;
  })
  .handler(async ({ data }) => {
    const { assessmentTrace } = await import("./logging.server.ts");
    const trace = assessmentTrace(data.session);
    if (!trace) return { saved: false, enabled: false };
    await trace.checkpoint(data.session, "browser", data.action, data.questionId);
    return { saved: true, enabled: true };
  });

export const advanceAdaptiveAssessment = createServerFn({ method: "POST" })
  .validator(validateAssessmentSession)
  .handler(async ({ data }) => {
    const isDevelopment = process.env['NODE_ENV'] === "development";
    const { runTracedAdvance } = await import("./trace-runtime.server.ts");
    const { assessmentTrace } = await import("./logging.server.ts");
    const { localRuleEvaluator } = await import("./local-evaluator.ts");
    const { createJevEvaluator } = await import("./jev.server.ts");
    const { createGeminiQuestionWriter } = await import("./gemini.server.ts");
    const trace = assessmentTrace(data);
    if (trace) await trace.authorize();
    const attemptId = crypto.randomUUID();
    const recorder = trace?.recorder(attemptId);
    const jevKey = process.env['JEV_API_KEY'];
    const geminiKey = process.env['GEMINI_API_KEY'];
    const writer = geminiKey ? createGeminiQuestionWriter({ apiKey: geminiKey, model: process.env['GEMINI_MODEL'] || "gemini-3.6-flash", ...(recorder ? { trace: recorder } : {}) }) : undefined;
    const evaluator = jevKey ? createJevEvaluator({ apiKey: jevKey, model: process.env['JEV_MODEL'] || "jev-latest", ...(recorder ? { trace: recorder } : {}) }) : localRuleEvaluator;
    try {
      if (!jevKey && !isDevelopment) {
        if (trace) await trace.event("configuration_error", { message: "JEV_API_KEY is required" }, { attemptId });
        throw new Error("JEV_API_KEY is required for the public assessment");
      }
      return await runTracedAdvance(data, { evaluator, ...(writer ? { writer } : {}) }, trace, attemptId);
    } catch (error) {
      if (!jevKey || !isDevelopment || (error instanceof Error && error.name === "AssessmentLogError")) throw error;
      if (trace) await trace.event("local_evaluator_fallback", { reason: "Jev failed; using local rules in development", previousAttemptId: attemptId });
      return runTracedAdvance(data, { evaluator: localRuleEvaluator, ...(writer ? { writer } : {}) }, trace, crypto.randomUUID());
    }
  });
