/** Editable assessment copy. Nine screening questions identify a focus area;
 * three written questions ask for the respondent's own context. */

export type DimensionId = "culture" | "capacity" | "compliance";
export type AnswerId = "consistent" | "inconsistent" | "informal" | "absent" | "unsure";

export interface AnswerOption {
  id: AnswerId;
  letter: string;
  label: string;
}

export const answerOptions: AnswerOption[] = [
  { id: "consistent", letter: "A", label: "Yes, consistently" },
  { id: "inconsistent", letter: "B", label: "Sometimes, but not consistently" },
  { id: "informal", letter: "C", label: "It depends on one or two people" },
  { id: "absent", letter: "D", label: "No, not currently" },
  { id: "unsure", letter: "E", label: "I'm not sure" },
];

export interface Dimension {
  id: DimensionId;
  name: string;
  blurb: string;
  detail: string;
}

export const dimensions: Dimension[] = [
  { id: "culture", name: "Culture", blurb: "How decisions get made, questioned and owned.", detail: "Clear ownership, candid conversation and respected roles determine how quickly good decisions actually happen." },
  { id: "capacity", name: "Capacity", blurb: "Whether the work can continue without heroics.", detail: "Time, people, continuity and financial flexibility decide whether programs survive a surprise." },
  { id: "compliance", name: "Compliance", blurb: "Whether governance practice matches governance paperwork.", detail: "Policies, controls and review habits that hold up when someone outside the organization looks closely." },
];

export interface Question {
  id: string;
  dimension: DimensionId;
  text: string;
  topic: string;
}

export const questions: Question[] = [
  { id: "q1", dimension: "culture", text: "When a recurring decision needs to be made, is it clear who has the authority to make it?", topic: "decision ownership" },
  { id: "q2", dimension: "culture", text: "Can staff and board members raise a concern or challenge a decision and expect a useful response?", topic: "speaking up and being heard" },
  { id: "q3", dimension: "culture", text: "In day-to-day work, are board and staff clear about which decisions belong to each of them?", topic: "board and staff roles" },
  { id: "q4", dimension: "capacity", text: "If a key leader or staff member were unavailable for a month, could essential work continue?", topic: "continuity when someone is away" },
  { id: "q5", dimension: "capacity", text: "Can your team deliver its current commitments within normal working hours and available resources?", topic: "workload and resources" },
  { id: "q6", dimension: "capacity", text: "Before accepting a new program or funding opportunity, do you check what people, time and coordination it will require?", topic: "capacity checks before new commitments" },
  { id: "q7", dimension: "compliance", text: "Are bylaws and key policies reviewed on a regular schedule, with someone responsible for keeping them current?", topic: "policy ownership and review" },
  { id: "q8", dimension: "compliance", text: "When a conflict of interest arises, are disclosures and the resulting decisions recorded?", topic: "conflict-of-interest practice" },
  { id: "q9", dimension: "compliance", text: "Are financial approvals and checks documented and followed in everyday practice?", topic: "financial controls in practice" },
];

export type DeepDiveId = "example" | "impact" | "nextStep";
export interface DeepDiveQuestion {
  id: DeepDiveId;
  prompt: (area: string, topic: string) => string;
  helper: string;
  resultLabel: string;
}

export const deepDiveQuestions: DeepDiveQuestion[] = [
  { id: "example", prompt: (_area, topic) => `Think of a recent situation involving ${topic}. What happened?`, helper: "A concrete example helps make the result more useful. If this area is working well, describe what is helping.", resultLabel: "The situation you described" },
  { id: "impact", prompt: (_area, topic) => `How did that situation involving ${topic} affect your people, time or work?`, helper: "Describe what you observed. You can also say that the impact is unclear.", resultLabel: "The effect you noticed" },
  { id: "nextStep", prompt: (_area, topic) => `What have you tried to improve ${topic}, and what would a useful next step look like?`, helper: "If you have not tried anything yet, tell us what would help you get started.", resultLabel: "What you have tried or want to change" },
];

export const assessmentMeta = {
  minutes: 10,
  screeningQuestionCount: questions.length,
  questionCount: questions.length + deepDiveQuestions.length,
  summaryLine: "About 10 minutes • 9 screening questions + 3 deeper questions • Practical results.",
};
