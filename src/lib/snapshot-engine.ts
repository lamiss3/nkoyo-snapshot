/** Deterministic, qualitative assessment logic. Written answers are reflected
 * back verbatim; this code does not claim to interpret free text. */

import {
  answerOptions,
  deepDiveQuestions,
  dimensions,
  questions,
  type AnswerId,
  type DeepDiveId,
  type DimensionId,
  type Question,
} from "@/config/questions";
import {
  defaultConversationPrompts,
  dimensionPatterns,
  overallHeadlines,
  questionPatterns,
  type DimensionState,
  type PatternContent,
} from "@/config/results";

export type Answers = Record<string, AnswerId>;
export type DeepDiveAnswers = Record<string, string>;

export const answerLabel = (id: AnswerId) =>
  answerOptions.find((option) => option.id === id)?.label ?? id;

export interface DimensionSignal {
  dimension: DimensionId;
  counts: Record<AnswerId, number>;
  state: DimensionState;
  leadQuestionId: string | null;
  frictionWeight: number;
}

const emptyCounts = (): Record<AnswerId, number> => ({
  consistent: 0,
  inconsistent: 0,
  informal: 0,
  absent: 0,
  unsure: 0,
});

export function questionsForDimension(dimension: DimensionId): Question[] {
  return questions.filter((q) => q.dimension === dimension);
}

/** Choose the most concerning answer in an area. An unknown is an area to
 * verify, not evidence of a missing practice. */
export function leadQuestion(dimension: DimensionId, answers: Answers): Question {
  const priority: Record<AnswerId, number> = {
    absent: 4,
    informal: 3,
    inconsistent: 2,
    unsure: 1,
    consistent: 0,
  };
  return [...questionsForDimension(dimension)].sort(
    (a, b) => priority[answers[b.id] ?? "consistent"] - priority[answers[a.id] ?? "consistent"],
  )[0]!;
}

export function analyzeDimension(dimension: DimensionId, answers: Answers): DimensionSignal {
  const counts = emptyCounts();
  for (const question of questionsForDimension(dimension)) {
    const answer = answers[question.id];
    if (answer) counts[answer] += 1;
  }
  const friction = counts.informal + counts.absent;
  let state: DimensionState;
  if (friction >= 1) state = "friction";
  else if (counts.unsure >= 2) state = "uncertain";
  else if (counts.inconsistent >= 2) state = "inconsistent";
  else if (counts.consistent === 3) state = "strength";
  else state = "mixed";

  const lead = leadQuestion(dimension, answers);
  const frictionWeight = counts.absent * 4 + counts.informal * 3 + counts.inconsistent * 2 + counts.unsure;
  return {
    dimension,
    counts,
    state,
    leadQuestionId: state === "friction" ? lead.id : null,
    frictionWeight,
  };
}

/** Ties follow the order shown in the questionnaire; users can change focus. */
export function suggestedFocusDimension(answers: Answers): DimensionId {
  const signals = dimensions.map((d) => analyzeDimension(d.id, answers));
  return [...signals].sort((a, b) => b.frictionWeight - a.frictionWeight)[0]!.dimension;
}

export interface PatternCard extends PatternContent {
  dimension: DimensionId;
  state: DimensionState;
  sourceQuestionId: string | null;
}

export function buildPatternCards(answers: Answers): PatternCard[] {
  return dimensions.map((dimension) => {
    const signal = analyzeDimension(dimension.id, answers);
    const questionContent = signal.leadQuestionId
      ? questionPatterns[signal.leadQuestionId]
      : undefined;
    const content = questionContent ?? dimensionPatterns[dimension.id][signal.state];
    return {
      ...content,
      dimension: dimension.id,
      state: signal.state,
      sourceQuestionId: questionContent ? signal.leadQuestionId : null,
    };
  });
}

export interface SnapshotResult {
  headline: string;
  summary: string;
  cards: PatternCard[];
  conversationPrompts: string[];
  startingAction: string;
  signals: DimensionSignal[];
  patternKeys: string[];
  summaryKey: string;
  focusDimension: DimensionId;
  focusTopic: string;
  writtenContext: { id: DeepDiveId; label: string; answer: string }[];
}

export function buildResult(
  answers: Answers,
  deepDiveAnswers: DeepDiveAnswers = {},
  focusOverride?: DimensionId | null,
): SnapshotResult {
  const signals = dimensions.map((d) => analyzeDimension(d.id, answers));
  const cards = buildPatternCards(answers);
  const focusDimension = focusOverride ?? suggestedFocusDimension(answers);
  const focusQuestion = leadQuestion(focusDimension, answers);
  const focusCard = cards.find((card) => card.dimension === focusDimension)!;

  const totals = emptyCounts();
  for (const question of questions) {
    const answer = answers[question.id];
    if (answer) totals[answer] += 1;
  }
  const friction = totals.informal + totals.absent;
  let summaryKey: keyof typeof overallHeadlines;
  if (totals.consistent >= 7 && friction === 0) summaryKey = "strengths";
  else if (totals.unsure >= 3 && friction === 0) summaryKey = "uncertainty";
  else if (friction >= 3) summaryKey = "friction";
  else summaryKey = "mixed";

  const overall = overallHeadlines[summaryKey]!;
  const prompts = [focusCard.conversationPrompt];
  for (const card of cards) {
    if (prompts.length < 3 && !prompts.includes(card.conversationPrompt)) {
      prompts.push(card.conversationPrompt);
    }
  }
  for (const prompt of defaultConversationPrompts) {
    if (prompts.length < 3 && !prompts.includes(prompt)) prompts.push(prompt);
  }

  return {
    headline: overall.headline,
    summary: overall.summary,
    cards,
    conversationPrompts: prompts,
    startingAction: focusCard.weekAction,
    signals,
    patternKeys: cards.map((c) => `${c.dimension}:${c.sourceQuestionId ?? c.state}`),
    summaryKey,
    focusDimension,
    focusTopic: focusQuestion.topic,
    writtenContext: deepDiveQuestions
      .map((question) => ({
        id: question.id,
        label: question.resultLabel,
        answer: (deepDiveAnswers[question.id] ?? "").trim(),
      }))
      .filter((entry) => entry.answer.length > 0),
  };
}
