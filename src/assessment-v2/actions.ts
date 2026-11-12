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
    const { createJevEvaluator, jevConfigFromEnv } = await import("./jev.server.ts");
    const { createGeminiQuestionWriter } = await import("./gemini.server.ts");
    const { geminiConfigFromEnv } = await import("./gemini-client.server.ts");
    const trace = assessmentTrace(data);
    if (trace) await trace.authorize();
    const attemptId = crypto.randomUUID();
    const recorder = trace?.recorder(attemptId);
    const jevConfig = jevConfigFromEnv();
    const geminiConfig = geminiConfigFromEnv();
    const writer = geminiConfig.apiKey ? createGeminiQuestionWriter({ ...geminiConfig, ...(recorder ? { trace: recorder } : {}) }) : undefined;
    const evaluator = jevConfig.apiKey ? createJevEvaluator({ ...jevConfig, ...(recorder ? { trace: recorder } : {}) }) : localRuleEvaluator;
    try {
      if (!jevConfig.apiKey && !isDevelopment) {
        const message = `${jevConfig.keyName} is required for the public assessment`;
        if (trace) await trace.event("configuration_error", { message }, { attemptId });
        throw new Error(message);
      }
      return await runTracedAdvance(data, { evaluator, ...(writer ? { writer } : {}) }, trace, attemptId);
    } catch (error) {
      if (!jevConfig.apiKey || !isDevelopment || (error instanceof Error && error.name === "AssessmentLogError")) throw error;
      if (trace) await trace.event("local_evaluator_fallback", { reason: "Jev failed; using local rules in development", previousAttemptId: attemptId });
      return runTracedAdvance(data, { evaluator: localRuleEvaluator, ...(writer ? { writer } : {}) }, trace, crypto.randomUUID());
    }
  });
