import { fallbackQuestionWriter } from "./fallback-questions.ts";
import { openingQuestions } from "./opening-questions.ts";
import { problemBank, problemById } from "./problem-bank.ts";
import { problemIds, type Answer, type AssessmentEvent, type AssessmentQuestion, type AssessmentResult, type AssessmentSession, type DimensionId, type EvaluationRecord, type EvaluationRound, type JsonValue, type ProblemEvaluation, type ProblemEvaluator, type ProblemId, type QuestionContext, type QuestionWriter, type ResultProblem, type Stage } from "./types.ts";

export interface AssessmentServices {
  evaluator: ProblemEvaluator;
  writer?: QuestionWriter;
}

const now = () => new Date().toISOString();
const evidenceChoices = ["insufficient_information", "contradicted", "possible", "supported"] as const;
const dimensions: readonly DimensionId[] = ["culture", "capacity", "compliance"];

export function createAssessmentSession(id = crypto.randomUUID()): AssessmentSession {
  const timestamp = now();
  return {
    id,
    traceToken: crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", ""),
    version: "adaptive-v1",
    stage: "opening",
    questions: [...openingQuestions],
    answers: [],
    evaluations: [],
    topFour: [],
    finalists: null,
    result: null,
    events: [{ type: "started", at: timestamp, stage: "opening", details: { version: "adaptive-v1" } }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function questionsForStage(session: AssessmentSession): AssessmentQuestion[] {
  if (session.stage === "complete") return [];
  const ids: Record<Exclude<Stage, "complete">, string[]> = {
    opening: ["q1", "q2", "q3", "q4"],
    probes: session.topFour.map((id) => problemById[id].probe.id),
    bridge: ["q9"],
    finalists: ["q10", "q11"],
  };
  return ids[session.stage].map((id) => {
    const question = session.questions.find((item) => item.id === id);
    if (!question) throw new Error(`Missing question ${id} for ${session.stage}`);
    return question;
  });
}

export function submitAssessmentAnswer(
  session: AssessmentSession,
  input: Pick<Answer, "questionId" | "optionIds" | "text">,
): AssessmentSession {
  if (session.stage === "complete") throw new Error("This assessment is complete");
  const question = questionsForStage(session).find((item) => item.id === input.questionId);
  if (!question) throw new Error(`Question ${input.questionId} is not in the current stage`);

  const optionIds = input.optionIds ?? [];
  const text = input.text?.trim() ?? "";
  if (question.kind === "text") {
    if (!text || text.length > 1200 || optionIds.length) throw new Error("A written response of 1–1200 characters is required");
  } else {
    if (text.length > 500) throw new Error("Additional text is too long");
    if (optionIds.length < 1 || optionIds.length > (question.maxSelections ?? 1)) throw new Error("Select the allowed number of answers");
    if (new Set(optionIds).size !== optionIds.length) throw new Error("Duplicate answer option");
    const allowed = new Set(question.options?.map((option) => option.id) ?? []);
    if (optionIds.some((id) => !allowed.has(id))) throw new Error("Unknown answer option");
    if (optionIds.length > 1 && optionIds.some((id) => id === "none" || id === "unsure")) throw new Error("This answer must be selected alone");
    if (optionIds.includes("other") && !text) throw new Error("Describe the other answer briefly");
  }

  const revised = session.answers.some((answer) => answer.questionId === question.id);
  const answer: Answer = {
    questionId: question.id,
    submittedAt: now(),
    ...(question.kind === "text" ? { text } : { optionIds, ...(text ? { text } : {}) }),
  };
  const next = copySession(session);
  next.answers = [...next.answers.filter((item) => item.questionId !== question.id), answer];
  log(next, "answer_submitted", { questionId: question.id, revised });
  return next;
}

export function stageIsComplete(session: AssessmentSession): boolean {
  return questionsForStage(session).every((question) => session.answers.some((answer) => answer.questionId === question.id));
}

export async function advanceAssessment(
  session: AssessmentSession,
  services: AssessmentServices,
): Promise<AssessmentSession> {
  if (session.stage === "complete") throw new Error("This assessment is already complete");
  if (!stageIsComplete(session)) throw new Error(`Complete all ${session.stage} questions before advancing`);
  const next = copySession(session);

  if (next.stage === "opening") {
    const round = await runEvaluation(next, services.evaluator, "initial", problemIds);
    if (!round.evaluations.some(isRelevant)) return completeWithoutFinding(next);
    const candidates = rankCandidates(round.evaluations);
    const topFour = candidates.slice(0, 4).map((entry) => entry.problemId);
    if (!topFour.length) return completeWithoutFinding(next);
    next.topFour = topFour;
    next.questions.push(...topFour.map((id) => problemById[id].probe));
    next.stage = "probes";
    log(next, "candidates_selected", { problemIds: topFour, round: "initial", exploratory: topFour.filter((id) => round.evaluations.find((e) => e.problemId === id)?.choice === "insufficient_information") });
    return next;
  }

  if (next.stage === "probes") {
    const round = await runEvaluation(next, services.evaluator, "validation", problemIds);
    const relevant = round.evaluations.filter(isRelevant);
    if (!relevant.length) return completeWithoutFinding(next);
    const finalists = rankCandidates(round.evaluations).slice(0, 2).map((entry) => entry.problemId);
    if (finalists.length < 2) return completeWithSingleFinding(next, rankCandidates(relevant)[0]!);
    next.finalists = [finalists[0]!, finalists[1]!];
    log(next, "candidates_selected", { problemIds: finalists, round: "validation" });
    const context = questionContext(next);
    const bridge = await generateSafely(next, "bridge", () => services.writer?.generateBridge(context), () => fallbackQuestionWriter.generateBridge(context));
    next.questions.push(bridge);
    next.stage = "bridge";
    log(next, "question_selected", { questionId: bridge.id, source: bridge.source, model: bridge.model ?? null, problemIds: finalists });
    return next;
  }

  if (next.stage === "bridge") {
    const finalists = requireFinalists(next);
    await runEvaluation(next, services.evaluator, "bridge", finalists);
    const context = questionContext(next);
    const questions = await generateSafely(next, "finalists", () => services.writer?.generateFinalists(context), () => fallbackQuestionWriter.generateFinalists(context));
    next.questions.push(...questions);
    next.stage = "finalists";
    log(next, "question_selected", { questionIds: questions.map((q) => q.id), sources: questions.map((q) => q.source), models: questions.map((q) => q.model ?? null), problemIds: finalists });
    return next;
  }

  const finalists = requireFinalists(next);
  const finalRound = await runEvaluation(next, services.evaluator, "final", finalists);
  next.result = calculateResult(next, finalRound);
  next.stage = "complete";
  log(next, "result_calculated", { priority: next.result.priority, threeCShare: next.result.threeCShare });
  return next;
}

function copySession(session: AssessmentSession): AssessmentSession {
  return {
    ...session,
    questions: [...session.questions],
    answers: [...session.answers],
    evaluations: [...session.evaluations],
    topFour: [...session.topFour],
    events: [...session.events],
  };
}

function log(session: AssessmentSession, type: AssessmentEvent["type"], details: Record<string, JsonValue>) {
  const timestamp = now();
  session.events.push({ type, stage: session.stage, at: timestamp, details });
  session.updatedAt = timestamp;
}

function requireFinalists(session: AssessmentSession): [ProblemId, ProblemId] {
  if (!session.finalists) throw new Error("Finalists have not been selected");
  return session.finalists;
}

function questionContext(session: AssessmentSession): QuestionContext {
  return {
    finalists: requireFinalists(session),
    questions: session.questions,
    answers: session.answers,
    evaluations: session.evaluations,
  };
}

async function runEvaluation(
  session: AssessmentSession,
  evaluator: ProblemEvaluator,
  roundName: EvaluationRound,
  ids: readonly ProblemId[],
): Promise<EvaluationRecord> {
  const output = await evaluator.evaluate({
    round: roundName,
    problemIds: ids,
    questions: session.questions,
    answers: session.answers,
    previousEvaluations: session.evaluations,
  });
  validateEvaluation(output.evaluations, ids, roundName);
  const record: EvaluationRecord = { ...output, round: roundName, recordedAt: now() };
  session.evaluations.push(record);
  log(session, "evaluation_completed", { round: roundName, model: record.model, rubricVersion: record.rubricVersion, evaluatedProblemIds: [...ids] });
  return record;
}

function validateEvaluation(evaluations: readonly ProblemEvaluation[], ids: readonly ProblemId[], round: EvaluationRound) {
  if (evaluations.length !== ids.length) throw new Error(`${round} evaluation did not return every requested problem`);
  const expected = new Set(ids);
  const seen = new Set<ProblemId>();
  for (const evaluation of evaluations) {
    if (!expected.has(evaluation.problemId) || seen.has(evaluation.problemId)) throw new Error("Unexpected or duplicate problem evaluation");
    seen.add(evaluation.problemId);
    if (!evidenceChoices.includes(evaluation.choice)) throw new Error("Unknown evidence choice");
    const values = evidenceChoices.map((choice) => evaluation.probabilities[choice]);
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) throw new Error("Invalid evaluation probability");
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.05) throw new Error("Evaluation probabilities must sum to one");
    if (round === "final" && ([evaluation.impact, evaluation.urgency].some((value) => !Number.isFinite(value) || value! < 0 || value! > 1))) {
      throw new Error("Final evaluation needs impact and urgency signals between zero and one");
    }
  }
}

function supportSignal(evaluation: ProblemEvaluation): number {
  return evaluation.probabilities.supported + 0.5 * evaluation.probabilities.possible;
}

function isRelevant(evaluation: ProblemEvaluation): boolean {
  return evaluation.choice === "supported" || evaluation.choice === "possible";
}

function rankCandidates(evaluations: readonly ProblemEvaluation[]): ProblemEvaluation[] {
  const eligible = evaluations.filter((evaluation) => evaluation.choice === "supported" || evaluation.choice === "possible");
  const exploratory = evaluations.filter((evaluation) => evaluation.choice === "insufficient_information");
  const rank = (items: ProblemEvaluation[]) => [...items].sort((a, b) => supportSignal(b) - supportSignal(a) || a.problemId.localeCompare(b.problemId));
  return [...rank(eligible), ...rank(exploratory)];
}

function validGeneratedQuestion(question: AssessmentQuestion, id: string): boolean {
  return question.id === id && question.kind === "text" && question.source === "generated" &&
    question.text.trim().length >= 15 && question.text.length <= 300 && !question.options?.length;
}

async function generateSafely<T extends AssessmentQuestion | [AssessmentQuestion, AssessmentQuestion]>(
  session: AssessmentSession,
  stage: "bridge" | "finalists",
  generate: () => Promise<T> | undefined,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    const generated = await generate();
    const valid = stage === "bridge"
      ? generated && !Array.isArray(generated) && validGeneratedQuestion(generated, "q9")
      : Array.isArray(generated) && generated.length === 2 && validGeneratedQuestion(generated[0]!, "q10") && validGeneratedQuestion(generated[1]!, "q11") &&
        generated[0]!.problemId === session.finalists?.[0] && generated[1]!.problemId === session.finalists?.[1];
    if (valid) return generated as T;
    throw new Error("Question provider returned an invalid question");
  } catch (error) {
    if (error instanceof Error && error.name === "AssessmentLogError") throw error;
    log(session, "generation_failed", { stage, reason: error instanceof Error ? error.message : "Unknown error" });
    return fallback();
  }
}

function completeWithoutFinding(session: AssessmentSession): AssessmentSession {
  session.stage = "complete";
  session.result = {
    problems: [],
    priority: [],
    threeCShare: { culture: 0, capacity: 0, compliance: 0 },
    generatedAt: now(),
  };
  log(session, "result_calculated", { priority: [], reason: "No supported or possible problem could be selected" });
  return session;
}

function completeWithSingleFinding(session: AssessmentSession, evaluation: ProblemEvaluation): AssessmentSession {
  const problem = problemById[evaluation.problemId];
  const share = { culture: 0, capacity: 0, compliance: 0 };
  share[problem.primaryDimension] = 100;
  const signal = supportSignal(evaluation);
  session.result = {
    problems: [{ problemId: evaluation.problemId, evidence: evaluation.choice, supportSignal: signal, impactSignal: null, urgencySignal: null, prioritySignal: signal }],
    priority: [evaluation.problemId],
    threeCShare: share,
    generatedAt: now(),
  };
  session.stage = "complete";
  log(session, "result_calculated", { priority: session.result.priority, reason: "Only one candidate remained after fixed probes; impact and urgency were not assessed" });
  return session;
}

function calculateResult(session: AssessmentSession, finalRound: EvaluationRecord): AssessmentResult {
  const finalists = requireFinalists(session);
  const finalById = new Map(finalRound.evaluations.map((evaluation) => [evaluation.problemId, evaluation]));
  const problems: ResultProblem[] = finalists.map((id) => {
    const evaluation = finalById.get(id)!;
    const support = supportSignal(evaluation);
    const impact = evaluation.impact ?? null;
    const urgency = evaluation.urgency ?? null;
    return {
      problemId: id,
      evidence: evaluation.choice,
      supportSignal: support,
      impactSignal: impact,
      urgencySignal: urgency,
      prioritySignal: 0.45 * support + 0.35 * (impact ?? 0) + 0.2 * (urgency ?? 0),
      ...(evaluation.explanation ? { explanation: evaluation.explanation } : {}),
    };
  }).sort((a, b) => b.prioritySignal - a.prioritySignal);

  const supported = problems.filter((problem) => problem.evidence === "supported" || problem.evidence === "possible");
  const priority = !supported.length ? [] : supported.length === 2 && Math.abs(supported[0]!.prioritySignal - supported[1]!.prioritySignal) <= 0.05
    ? supported.map((problem) => problem.problemId)
    : [supported[0]!.problemId];

  const validation = [...session.evaluations].reverse().find((record) => record.round === "validation");
  const allEvaluations = new Map((validation?.evaluations ?? []).map((evaluation) => [evaluation.problemId, evaluation]));
  for (const evaluation of finalRound.evaluations) allEvaluations.set(evaluation.problemId, evaluation);
  const raw = { culture: 0, capacity: 0, compliance: 0 };
  for (const [id, evaluation] of allEvaluations) {
    if (evaluation.choice !== "supported" && evaluation.choice !== "possible") continue;
    const weight = supportSignal(evaluation) * (evaluation.impact ?? 0.5);
    const definition = problemById[id];
    raw[definition.primaryDimension] += weight;
    for (const related of definition.relatedDimensions) raw[related] += 0.35 * weight;
  }
  const total = dimensions.reduce((sum, dimension) => sum + raw[dimension], 0);
  const threeCShare = total === 0 ? { culture: 0, capacity: 0, compliance: 0 } : {
    culture: Math.round((raw.culture / total) * 100),
    capacity: Math.round((raw.capacity / total) * 100),
    compliance: 0,
  };
  if (total > 0) threeCShare.compliance = 100 - threeCShare.culture - threeCShare.capacity;
  return { problems, priority, threeCShare, generatedAt: now() };
}
