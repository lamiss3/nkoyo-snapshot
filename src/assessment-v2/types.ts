/** Contracts for the proposed adaptive Snapshot. The current public
 * questionnaire continues to run until an evaluator is configured. */

export const problemIds = [
  "P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10",
  "P11", "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20",
] as const;

export type ProblemId = (typeof problemIds)[number];
export type DimensionId = "culture" | "capacity" | "compliance";
export type Stage = "opening" | "probes" | "bridge" | "finalists" | "complete";
export type EvaluationRound = "initial" | "validation" | "bridge" | "final";
export type EvidenceChoice = "insufficient_information" | "contradicted" | "possible" | "supported";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface QuestionOption {
  id: string;
  text: string;
}

export interface AssessmentQuestion {
  id: string;
  kind: "single" | "multiple" | "text";
  text: string;
  options?: readonly QuestionOption[];
  maxSelections?: number;
  helper?: string;
  problemId?: ProblemId;
  source: "fixed" | "generated" | "fallback";
  model?: string;
}

export interface Answer {
  questionId: string;
  optionIds?: string[];
  text?: string;
  submittedAt: string;
}

export interface ProblemDefinition {
  id: ProblemId;
  name: string;
  primaryDimension: DimensionId;
  relatedDimensions: readonly DimensionId[];
  probe: AssessmentQuestion;
}

export interface ProblemEvaluation {
  problemId: ProblemId;
  choice: EvidenceChoice;
  probabilities: Record<EvidenceChoice, number>;
  /** Impact and urgency are assessed only at the final round. They are
   * relative internal signals, not probabilities of a diagnosis. */
  impact?: number;
  urgency?: number;
  explanation?: string;
}

export interface EvaluationRequest {
  round: EvaluationRound;
  problemIds: readonly ProblemId[];
  questions: readonly AssessmentQuestion[];
  answers: readonly Answer[];
  previousEvaluations: readonly EvaluationRecord[];
}

export interface EvaluationRecord {
  round: EvaluationRound;
  model: string;
  rubricVersion: string;
  evaluations: ProblemEvaluation[];
  recordedAt: string;
}

export interface ProblemEvaluator {
  evaluate(request: EvaluationRequest): Promise<Omit<EvaluationRecord, "recordedAt">>;
}

export interface QuestionWriter {
  generateBridge(input: QuestionContext): Promise<AssessmentQuestion>;
  generateFinalists(input: QuestionContext): Promise<[AssessmentQuestion, AssessmentQuestion]>;
}

export interface QuestionContext {
  finalists: readonly [ProblemId, ProblemId];
  questions: readonly AssessmentQuestion[];
  answers: readonly Answer[];
  evaluations: readonly EvaluationRecord[];
}

export interface ResultProblem {
  problemId: ProblemId;
  evidence: EvidenceChoice;
  supportSignal: number;
  impactSignal: number | null;
  urgencySignal: number | null;
  prioritySignal: number;
  explanation?: string;
}

export interface AssessmentResult {
  problems: ResultProblem[];
  priority: ProblemId[];
  /** Relative share of modeled pressure among the three Cs; not a measured
   * probability or a validated organizational score. */
  threeCShare: Record<DimensionId, number>;
  generatedAt: string;
}

export interface AssessmentEvent {
  type: "started" | "answer_submitted" | "evaluation_completed" | "candidates_selected" | "question_selected" | "result_calculated" | "generation_failed";
  at: string;
  stage: Stage;
  details: Record<string, JsonValue>;
}

export interface AssessmentSession {
  id: string;
  /** Browser capability for writing this session's private server log; never logged. */
  traceToken?: string;
  version: "adaptive-v1";
  stage: Stage;
  questions: AssessmentQuestion[];
  answers: Answer[];
  evaluations: EvaluationRecord[];
  topFour: ProblemId[];
  finalists: [ProblemId, ProblemId] | null;
  result: AssessmentResult | null;
  events: AssessmentEvent[];
  createdAt: string;
  updatedAt: string;
}
