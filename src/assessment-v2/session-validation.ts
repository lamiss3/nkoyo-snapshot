import type { AssessmentSession } from "./types.ts";

/** Bound anonymous log/model requests before using a privileged database client. */
export function validateAssessmentSession(data: AssessmentSession): AssessmentSession {
  if (!data || !["adaptive-v1", "adaptive-v2"].includes(data.version) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id ?? "") ||
    !["opening", "probes", "bridge", "finalists", "complete"].includes(data.stage) ||
    (data.traceToken !== undefined && !/^[a-f0-9]{64}$/.test(data.traceToken)) ||
    !Array.isArray(data.answers) || data.answers.length > (data.version === "adaptive-v2" ? 16 : 11) ||
    !Array.isArray(data.questions) || data.questions.length > (data.version === "adaptive-v2" ? 16 : 11) ||
    !Array.isArray(data.evaluations) || data.evaluations.length > 4 ||
    !Array.isArray(data.events) || data.events.length > 256 ||
    !Array.isArray(data.topFour) || data.topFour.length > 4 ||
    !Number.isFinite(Date.parse(data.createdAt)) || !Number.isFinite(Date.parse(data.updatedAt)) ||
    JSON.stringify(data).length > 256000) throw new Error("Invalid assessment session");
  for (const question of data.questions) {
    if (!question || typeof question.id !== "string" || question.id.length > 32 || typeof question.text !== "string" || question.text.length > 1500 ||
      !["text", "single", "multiple"].includes(question.kind) ||
      (question.optional !== undefined && (question.optional !== true || data.version !== "adaptive-v2" || question.id !== "q11" || question.kind !== "text")) ||
      (question.answerMode !== undefined && (question.answerMode !== "scenario_match" || question.kind !== "single")) ||
      (question.options !== undefined && (!Array.isArray(question.options) || question.options.length > 20))) throw new Error("Invalid assessment question");
    if (question.options?.some(o => !o || typeof o.id !== "string" || o.id.length > 40 || typeof o.text !== "string" || o.text.length > 1500) || (question.options && new Set(question.options.map(o => o.id)).size !== question.options.length)) throw new Error("Invalid assessment options");
  }
  for (const answer of data.answers) {
    if (!answer || typeof answer.questionId !== "string" || !data.questions.some((q) => q.id === answer.questionId) ||
      (answer.text !== undefined && (typeof answer.text !== "string" || answer.text.length > 1200)) ||
      (answer.skipped !== undefined && (answer.skipped !== true || data.version !== "adaptive-v2" || answer.questionId !== "q11" || !!answer.text?.trim() || !!answer.optionIds?.length)) ||
      (answer.optionIds !== undefined && (!Array.isArray(answer.optionIds) || answer.optionIds.length > 2 || answer.optionIds.some((id) => typeof id !== "string")))) throw new Error("Invalid assessment answer");
  }
  for (const event of data.events) {
    if (!event || typeof event.type !== "string" || typeof event.stage !== "string" || !Number.isFinite(Date.parse(event.at))) throw new Error("Invalid assessment event");
  }
  return data;
}
