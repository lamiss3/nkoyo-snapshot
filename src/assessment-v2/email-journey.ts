import { problemById } from "./problem-bank.ts";
import { problemGuides } from "./result-content.ts";
import type { AssessmentSession, ProblemId } from "./types.ts";

export const emailPurposes = [
  "detailed_report",
  "primary_awareness",
  "primary_explanation",
  "primary_action",
  "secondary_exploration",
] as const;
export type EmailPurpose = (typeof emailPurposes)[number];
export const emailDayOffsets = [0, 2, 4, 7, 10] as const;
export interface JourneyEmail {
  number: number;
  purpose: EmailPurpose;
  focusId: ProblemId | null;
  subject: string;
  preview: string;
  sections: { heading: string; paragraphs: string[]; sourceQuestionIds: string[] }[];
}
export interface EmailJourney {
  version: "email-journey-v1";
  status: "draft";
  sessionId: string;
  generatedAt: string;
  model: string;
  source?: "fixed_test";
  primaryId: ProblemId | null;
  secondaryId: ProblemId | null;
  jointPriority: boolean;
  emails: JourneyEmail[];
}

/** Authoritative topic selection stays in the existing result logic. */
export function emailJourneyBrief(session: AssessmentSession) {
  if (session.stage !== "complete" || !session.result)
    throw new Error("A completed assessment is required for an email journey.");
  const result = session.result;
  const relevant = result.problems.filter(
    (item) => item.evidence === "supported" || item.evidence === "possible",
  );
  const ordered = [...relevant].sort(
    (a, b) =>
      Number(result.priority.includes(b.problemId)) -
        Number(result.priority.includes(a.problemId)) || b.prioritySignal - a.prioritySignal,
  );
  const primaryId = ordered[0]?.problemId ?? null;
  const secondaryId = ordered[1]?.problemId ?? null;
  const questions = new Map(session.questions.map((question) => [question.id, question]));
  return {
    primaryId,
    secondaryId,
    jointPriority: Boolean(
      primaryId &&
      secondaryId &&
      result.priority.includes(primaryId) &&
      result.priority.includes(secondaryId),
    ),
    topics: ordered.slice(0, 2).map((item) => ({
      id: item.problemId,
      name: problemById[item.problemId].name,
      dimension: problemById[item.problemId].primaryDimension,
      evidence: item.evidence,
      explanation: item.explanation ?? null,
      guide: problemGuides[item.problemId],
    })),
    threeCShare: result.threeCShare,
    responses: session.answers.map((answer) => ({
      questionId: answer.questionId,
      question: questions.get(answer.questionId)?.text ?? answer.questionId,
      selectedAnswers:
        answer.optionIds?.flatMap((id) => {
          const option = questions.get(answer.questionId)?.options?.find((item) => item.id === id);
          return option ? [option.text] : [];
        }) ?? [],
      writtenAnswer: answer.text ?? "",
    })),
    slots: emailPurposes.map((purpose, index) => ({
      number: index + 1,
      purpose,
      focusId: index === 4 ? secondaryId : primaryId,
      sectionCount: index === 0 ? 6 : 3,
    })),
  };
}

/** Consent controls delivery, independently of content generation. */
export function eligibleJourneyEmails(marketingConsent: boolean): number[] {
  return marketingConsent ? [1, 2, 3, 4, 5] : [1];
}

const disclaimer =
  "This Snapshot is a starting point for discussion, based on your answers. It is not a diagnosis or a verified audit. The Culture, Capacity and Compliance shares describe relative emphasis in this assessment, not measured organizational scores.";
export function journeyEmailText(email: JourneyEmail): string {
  return [
    "Hello,",
    ...email.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ...(email.number === 1 ? [disclaimer] : []),
    "Nkoyo\nIban Ison Solutions",
  ].join("\n\n");
}

const htmlText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
/** Model strings are escaped as content. Only Kit's required footer is Liquid. */
export function journeyEmailHtml(email: JourneyEmail): string {
  return [
    "<p>Hello,</p>",
    ...email.sections.flatMap((section) => [
      `<h2>${htmlText(section.heading)}</h2>`,
      ...section.paragraphs.map(
        (paragraph) => `<p>${htmlText(paragraph).replace(/\n/g, "<br>")}</p>`,
      ),
    ]),
    ...(email.number === 1 ? [`<p>${htmlText(disclaimer)}</p>`] : []),
    "<p>Nkoyo<br>Iban Ison Solutions</p>",
    '<p><a href="{{ unsubscribe_url }}">Unsubscribe</a><br>{{ address }}</p>',
  ].join("\n");
}

/** Prepare saved bodies for review; does not publish, enrol or schedule. */
export function kitJourneyDrafts(
  journey: EmailJourney,
  privateTagId: number,
  marketingConsent: boolean,
) {
  if (!Number.isSafeInteger(privateTagId) || privateTagId < 1)
    throw new Error("A dedicated recipient tag is required.");
  const eligible = eligibleJourneyEmails(marketingConsent);
  if (
    journey.emails.length !== 5 ||
    journey.emails.some(
      (email, index) => email.number !== index + 1 || email.purpose !== emailPurposes[index],
    )
  )
    throw new Error("Invalid five-email journey");
  return journey.emails
    .filter((email) => eligible.includes(email.number))
    .map((email) => ({
      emailNumber: email.number,
      dayOffset: emailDayOffsets[email.number - 1]!,
      payload: {
        subject: email.subject,
        preview_text: email.preview,
        content: journeyEmailHtml(email),
        description: `Nkoyo ${journey.sessionId} / ${journey.version} / email ${email.number}`,
        public: false,
        published_at: journey.generatedAt,
        send_at: null,
        subscriber_filter: [{ all: [{ type: "tag", ids: [privateTagId] }] }],
      },
    }));
}

const markdownText = (value: string) => value.replace(/[\\`*_{}\[\]<>#]/g, "\\$&");
export function emailJourneyMarkdown(journey: EmailJourney): string {
  return [
    "# Nkoyo — five-email journey draft",
    "",
    "Draft for review. No emails have been sent.",
    "",
    `Session: ${markdownText(journey.sessionId)}`,
    `Generated: ${markdownText(journey.generatedAt)}`,
    `Model: ${markdownText(journey.model)}`,
    "",
    ...journey.emails.flatMap((email) => [
      `## Email ${email.number}: ${email.purpose.replaceAll("_", " ")}`,
      "",
      `**Subject:** ${markdownText(email.subject)}`,
      `**Preview:** ${markdownText(email.preview)}`,
      "",
      "Hello,",
      "",
      ...email.sections.flatMap((section) => [
        `### ${markdownText(section.heading)}`,
        "",
        ...section.paragraphs.flatMap((paragraph) => [markdownText(paragraph), ""]),
        ...(section.sourceQuestionIds.length
          ? [
              `*Staff evidence references: ${section.sourceQuestionIds.map(markdownText).join(", ")}*`,
              "",
            ]
          : []),
      ]),
      ...(email.number === 1 ? [disclaimer, ""] : []),
      "Nkoyo",
      "Iban Ison Solutions",
      "",
    ]),
  ].join("\n");
}
