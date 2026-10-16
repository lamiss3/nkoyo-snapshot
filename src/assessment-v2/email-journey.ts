import { problemById } from "./problem-bank.ts";
import { problemGuides } from "./result-content.ts";
import type { AssessmentSession, ProblemId } from "./types.ts";
import {
  emailV3Purposes,
  emailV3Slots,
  emailSlotsForVersion,
  type EmailPurpose,
  type EmailJourneyVersion,
} from "./email-contract.ts";
import { emailTopicGuides } from "./email-topic-guides.ts";
export type { EmailPurpose } from "./email-contract.ts";

export { legacyEmailPurposes } from "./email-contract.ts";
export const emailPurposes = emailV3Purposes;
export const emailStructure = emailV3Slots;
export const emailDayOffsets = [0, 2, 4, 7, 10] as const;
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
  version: EmailJourneyVersion;
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
export function emailJourneyBrief(
  session: AssessmentSession,
  version: EmailJourneyVersion = "email-journey-v3",
) {
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
    ...(version === "email-journey-v3" ? {} : { threadQuestionId: thread?.questionId ?? null }),
    sparseEvidence:
      usableAnswers.length < 2 ||
      !primaryId ||
      usableAnswers.every(
        (answer) => questions.get(answer.questionId)?.answerMode === "scenario_match",
      ),
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
      guide:
        version === "email-journey-v3"
          ? { ...problemGuides[item.problemId], advisory: emailTopicGuides[item.problemId] }
          : problemGuides[item.problemId],
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
      ...(version === "email-journey-v3"
        ? {
            evidenceUse: answer.skipped
              ? "none"
              : !answer.text?.trim() &&
                  answer.optionIds?.every((id) =>
                    ["none", "unsure", "varies", "little_impact"].includes(id),
                  )
                ? "uncertain_or_none"
                : questions.get(answer.questionId)?.answerMode === "scenario_match"
                  ? "hypothetical_match"
                  : "preserve_original_wording_tense_and_frequency",
          }
        : {}),
    })),
    slots: emailSlotsForVersion(version).map((slot, index) => ({
      number: index + 1,
      purpose: slot.purpose,
      focusId: version === "email-journey-v3" ? primaryId : index === 4 ? secondaryId : primaryId,
      sectionCount: slot.sectionCount,
      structure: slot,
    })),
  };
}

/** Exact transitions are supplied by the website, so promised content matches the next slot. */
export function nextJourneyEmailPreview(
  number: number,
  primaryId: ProblemId | null,
  secondaryId: ProblemId | null,
  version: EmailJourneyVersion = "email-journey-v3",
): string | undefined {
  if (version === "email-journey-v3") {
    if (number === 1)
      return primaryId
        ? "Next, we’ll use a simple observation to see where work gets stuck."
        : "Next, we’ll look for observable clues before naming a problem.";
    if (number === 2)
      return "Next, we’ll turn that check into one small change to try, even if you have not started yet.";
    if (number === 3)
      return "Next, we’ll look at what different outcomes could mean and what to try next.";
    if (number === 4)
      return primaryId
        ? "In the final email, we’ll consider what to handle internally and when an outside perspective might help."
        : "In the final email, we’ll consider what evidence is still needed and whether a discussion would help.";
    return undefined;
  }
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
const reportScopeNote = (version: EmailJourneyVersion) =>
  version === "email-journey-v3"
    ? "This Snapshot offers a starting point based on your answers. It is not a diagnosis or a verified audit."
    : disclaimer;
/** Version is explicit because detailed_report is shared with historical journeys. */
export function journeyEmailText(
  email: JourneyEmail,
  version: EmailJourneyVersion = "email-journey-v2",
): string {
  return [
    "Hello,",
    ...email.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ...(email.mainAction ? ["Your next step", email.mainAction] : []),
    ...(email.supportInvitation
      ? [
          email.purpose === "next_decision"
            ? emailSupportInvitation.address
            : `${emailSupportInvitation.label}: ${emailSupportInvitation.address}`,
        ]
      : []),
    ...(email.nextEmailPreview ? [email.nextEmailPreview] : []),
    ...(email.number === 1 ? [reportScopeNote(version)] : []),
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
export function journeyEmailHtml(
  email: JourneyEmail,
  version: EmailJourneyVersion = "email-journey-v2",
): string {
  return [
    "<p>Hello,</p>",
    ...email.sections.flatMap((section) => [
      `<h2>${htmlText(section.heading)}</h2>`,
      ...section.paragraphs.map(
        (paragraph) => `<p>${htmlText(paragraph).replace(/\n/g, "<br>")}</p>`,
      ),
    ]),
    ...(email.mainAction
      ? [
          `<h2>Your next step</h2><p>${email.purpose === "next_decision" && email.supportInvitation ? `<a href="${emailSupportInvitation.href}">${htmlText(email.mainAction)}</a>` : htmlText(email.mainAction)}</p>`,
        ]
      : []),
    ...(email.supportInvitation && email.purpose !== "next_decision"
      ? [`<p><a href="${emailSupportInvitation.href}">${emailSupportInvitation.label}</a></p>`]
      : []),
    ...(email.nextEmailPreview ? [`<p>${htmlText(email.nextEmailPreview)}</p>`] : []),
    ...(email.number === 1 ? [`<p>${htmlText(reportScopeNote(version))}</p>`] : []),
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
      (email, index) =>
        email.number !== index + 1 ||
        email.purpose !== emailSlotsForVersion(journey.version)[index]?.purpose,
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
          journey.version,
        ),
        description: `Nkoyo ${journey.sessionId} / ${journey.version} / email ${email.number}`,
        public: false,
        published_at: journey.generatedAt,
        send_at: null,
        subscriber_filter: [{ all: [{ type: "tag", ids: [privateTagId] }] }],
      },
    }));
}

const markdownText = (value: string) => value.replace(/[\\`*_{}[\]<>#]/g, "\\$&");
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
      ...email.sections.flatMap((section, sectionIndex) => [
        `### ${markdownText(section.heading)}`,
        "",
        ...section.paragraphs.flatMap((paragraph) => [markdownText(paragraph), ""]),
        ...(journey.version === "email-journey-v3"
          ? [
              `*Staff section role: ${markdownText(emailV3Slots[email.number - 1]!.roles[sectionIndex]!)}*`,
              "",
            ]
          : []),
        ...(section.sourceQuestionIds.length
          ? [
              `*Staff evidence references: ${section.sourceQuestionIds.map(markdownText).join(", ")}*`,
              "",
            ]
          : []),
      ]),
      ...(email.mainAction ? ["### Your next step", "", markdownText(email.mainAction), ""] : []),
      ...(email.supportInvitation
        ? [
            email.purpose === "next_decision"
              ? emailSupportInvitation.address
              : `${emailSupportInvitation.label}: ${emailSupportInvitation.address}`,
            "",
          ]
        : []),
      ...(email.nextEmailPreview ? [markdownText(email.nextEmailPreview), ""] : []),
      ...(email.number === 1 ? [reportScopeNote(journey.version), ""] : []),
      "Nkoyo",
      "Iban Ison Solutions",
      "",
    ]),
  ].join("\n");
}
