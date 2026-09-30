import { problemById } from "./problem-bank.ts";
import type { AssessmentQuestion, QuestionContext, QuestionWriter } from "./types.ts";

/** Used only if a question-generation provider is unavailable or rejected.
 * These prompts do not pretend to interpret the respondent's free text. */
export const fallbackQuestionWriter: QuestionWriter = {
  async generateBridge(): Promise<AssessmentQuestion> {
    return {
      id: "q9",
      kind: "text",
      text: "Think of a recent situation related to the difficulties you described. What happened first, and what happened next? Did the difficulties seem connected or separate?",
      helper: "A few sentences are enough. It is fine to say they were unrelated or that you are unsure.",
      source: "fallback",
    };
  },

  async generateFinalists(input: QuestionContext): Promise<[AssessmentQuestion, AssessmentQuestion]> {
    const questions = input.finalists.map((id, index) => {
      const problem = problemById[id];
      return {
        id: `q${index + 10}`,
        kind: "text" as const,
        text: `Thinking about ${problem.name.toLowerCase()}, what is one recent example, if any, and what effect did it have?`,
        helper: "Describe what you observed. Avoid names or confidential details.",
        problemId: id,
        source: "fallback" as const,
      };
    });
    return [questions[0]!, questions[1]!];
  },
};
