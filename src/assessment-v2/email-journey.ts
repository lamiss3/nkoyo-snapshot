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
export const emailStructure = [
  {
    label: "Detailed result",
    roles: [
      "summary",
      "primary_evidence",
      "secondary_or_unknown",
      "three_cs",
      "starting_focus",
      "uncertainty",
    ],
  },
  { label: "Recognize the pattern", roles: ["recognition", "observable_signs", "what_to_notice"] },
  {
    label: "Understand why it matters",
    roles: ["possible_mechanism", "possible_consequences", "distinction_to_check"],
  },
  { label: "Try one practical change", roles: ["preparation", "one_experiment", "progress_check"] },
  {
    label: "Connect the findings and consider support",
    roles: ["connection_or_progress", "what_to_review", "guided_conversation"],
  },
] as const;
/** Business address supplied by the owner. Models cannot invent destinations. */
export const emailSupportInvitation = {
  label: "Discuss your Snapshot with Nkoyo",
  address: "hello@nkoyoeffionglewis.com",
  href: "mailto:hello@nkoyoeffionglewis.com?subject=My%20Snapshot%20and%20next%20steps",
} as const;
export interface JourneyEmail {
  number: number;
  purpose: EmailPurpose;
  focusId: ProblemId | null;
  subject: string;
  preview: string;
  sections: { heading: string; paragraphs: string[]; sourceQuestionIds: string[] }[];
  mainAction?: string;
  nextEmailPreview?: string;
  supportInvitation?: boolean;
}
export interface EmailJourney {
  version: "email-journey-v1" | "email-journey-v2";
  status: "draft";
  sessionId: string;
  generatedAt: string;
  model: string;
  source?: "fixed_test";
  primaryId: ProblemId | null;
  secondaryId: ProblemId | null;
  jointPriority: boolean;
  threadQuestionId?: string | null;
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
  const usableAnswers = session.answers.filter(
    (answer) =>
      !answer.skipped &&
      (answer.text?.trim() ||
        answer.optionIds?.some(
          (id) => !["none", "unsure", "varies", "little_impact"].includes(id),
        )),
  );
  const thread =
    (primaryId
      ? usableAnswers.find((answer) => answer.questionId === problemById[primaryId].probe.id)
      : undefined) ??
    usableAnswers.find((answer) => answer.questionId === "q4") ??
    usableAnswers.find((answer) => answer.questionId === "q9") ??
    usableAnswers[0];
  return {
    primaryId,
    secondaryId,
    threadQuestionId: thread?.questionId ?? null,
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
      answerMode: questions.get(answer.questionId)?.answerMode ?? "direct_response",
      skipped: answer.skipped ?? false,
    })),
    slots: emailPurposes.map((purpose, index) => ({
      number: index + 1,
      purpose,
      focusId: index === 4 ? secondaryId : primaryId,
      sectionCount: index === 0 ? 6 : 3,
      structure: emailStructure[index],
    })),
  };
}

/** Exact transitions are supplied by the website, so promised content matches the next slot. */
export function nextJourneyEmailPreview(
  number: number,
  primaryId: ProblemId | null,
  secondaryId: ProblemId | null,
): string | undefined {
  if (number === 1)
    return primaryId
      ? "Next, I’ll help you recognize this pattern in everyday work."
      : "Next, we’ll look for a clearer example of what needs attention.";
  if (number === 2)
    return "Next, we’ll explore what may sustain this pattern and which consequences to check.";
  if (number === 3) return "Next, I’ll suggest one manageable step and what to watch afterward.";
  if (number === 4)
    return secondaryId
      ? "In the final email, we’ll explore how the other finding may connect and what a conversation with Nkoyo could help clarify."
      : "In the final email, we’ll review what you may have noticed and consider whether a conversation with Nkoyo would be useful.";
  return undefined;
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
    ...(email.mainAction ? ["Your next step", email.mainAction] : []),
    ...(email.supportInvitation
      ? [`${emailSupportInvitation.label}: ${emailSupportInvitation.address}`]
      : []),
    ...(email.nextEmailPreview ? [email.nextEmailPreview] : []),
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
    ...(email.mainAction ? [`<h2>Your next step</h2><p>${htmlText(email.mainAction)}</p>`] : []),
    ...(email.supportInvitation
      ? [`<p><a href="${emailSupportInvitation.href}">${emailSupportInvitation.label}</a></p>`]
      : []),
    ...(email.nextEmailPreview ? [`<p>${htmlText(email.nextEmailPreview)}</p>`] : []),
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
        content: journeyEmailHtml(
          marketingConsent ? email : (({ nextEmailPreview, ...report }) => report)(email),
        ),
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
    "# Nkoyo — five-email journey",
    "",
    "Saved email content. Check the staff Admin for consent, scheduling and provider status.",
    "",
    `Session: ${markdownText(journey.sessionId)}`,
    `Generated: ${markdownText(journey.generatedAt)}`,
    `Model: ${markdownText(journey.model)}`,
    `Content version: ${journey.version}`,
    ...(journey.threadQuestionId
      ? [`Shared answer reference for staff: ${markdownText(journey.threadQuestionId)}`]
      : []),
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
      ...(email.mainAction ? ["### Your next step", "", markdownText(email.mainAction), ""] : []),
      ...(email.supportInvitation
        ? [`${emailSupportInvitation.label}: ${emailSupportInvitation.address}`, ""]
        : []),
      ...(email.nextEmailPreview ? [markdownText(email.nextEmailPreview), ""] : []),
      ...(email.number === 1 ? [disclaimer, ""] : []),
      "Nkoyo",
      "Iban Ison Solutions",
      "",
    ]),
  ].join("\n");
}
