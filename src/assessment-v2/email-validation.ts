import { z } from "zod";
import { emailV3Purposes, emailV3Slots } from "./email-contract.ts";
import { problemById } from "./problem-bank.ts";
import { openingQuestions, legacyOpeningQuestions } from "./opening-questions.ts";
import type { emailJourneyBrief, JourneyEmail } from "./email-journey.ts";
export type EmailBrief = ReturnType<typeof emailJourneyBrief>;

const plain = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) =>
        !/[<>]|\{\{|\{%|```|https?:\/\/|mailto:|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|(?:^|\n)\s{0,3}#{1,6}\s/.test(
          value,
        ),
      "Email content must be plain text without markup, links or Liquid.",
    );
const singleLine = (max: number) => plain(max).refine((value) => !/[\r\n]/.test(value));
const sectionSchema = z
  .object({
    heading: plain(100),
    paragraphs: z.array(plain(3000)).min(1).max(3),
    sourceQuestionIds: z.array(z.string()).max(16),
  })
  .strict();
const outputSchema = z
  .object({
    emails: z
      .array(
        z
          .object({
            number: z.number().int().min(1).max(5),
            purpose: z.enum(emailV3Purposes),
            focusId: z.string().nullable(),
            subject: singleLine(100),
            preview: singleLine(180),
            mainAction: plain(450),
            sections: z.array(sectionSchema).min(3).max(4),
          })
          .strict(),
      )
      .length(emailV3Slots.length),
  })
  .strict();

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function leaksInternalCopy(text: string, brief: EmailBrief): boolean {
  const ids = new Set([
    ...brief.responses.map((r) => r.questionId),
    ...brief.topics.map((topic) => topic.id),
    ...openingQuestions.map((question) => question.id),
    ...legacyOpeningQuestions.map((question) => question.id),
    "q9",
    "q10",
    "q11",
    ...Object.values(problemById).map((p) => p.probe.id),
  ]);
  for (const id of ids) {
    // Exact known tokens only; do not mistake Q4 planning or 'liquid' for an ID.
    if (
      new RegExp(
        `(^|[^A-Za-z0-9_])${escapeRegex(id)}(?=$|[^A-Za-z0-9_])`,
        id.startsWith("probe_") ? "i" : "",
      ).test(text)
    )
      return true;
  }
  const fragments = [
    "sourceQuestionIds",
    "threadQuestionId",
    "primaryId",
    "secondaryId",
    "jointPriority",
    "focusId",
    "allowedSourceIds",
    "JSON.stringify",
    "Assessment context (JSON)",
    "Return only JSON",
    "Return exactly the specified JSON structure",
    "Write a reader-friendly heading",
    "Write the full section here",
    ...emailV3Slots.flatMap((slot) => slot.roles),
  ];
  return fragments.some((fragment) =>
    new RegExp(`(^|[^A-Za-z0-9_])${escapeRegex(fragment)}(?=$|[^A-Za-z0-9_])`, "i").test(text),
  );
}
export function paragraphWordCount(email: Pick<JourneyEmail, "sections">) {
  return email.sections
    .flatMap((section) => section.paragraphs)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Objective defects only. This does not establish factual accuracy or editorial quality. */
export function validateEmailJourneyOutput(raw: unknown, brief: EmailBrief) {
  const parsed = outputSchema.parse(raw);
  const unique = (values: string[]) =>
    new Set(values.map((value) => value.trim().toLowerCase())).size === values.length;
  if (
    !unique(parsed.emails.map((e) => e.subject)) ||
    !unique(parsed.emails.map((e) => e.mainAction))
  )
    throw new Error("Gemini repeated an email subject or main action");
  if (!unique(parsed.emails.map((e) => e.sections.flatMap((s) => s.paragraphs).join(" "))))
    throw new Error("Gemini repeated an email body");
  const sourceIds = new Set(brief.responses.filter((r) => !r.skipped).map((r) => r.questionId));
  const hasAnswers = brief.responses.some(
    (r) => !r.skipped && (r.writtenAnswer.trim() || r.selectedAnswers.length),
  );
  for (const [index, email] of parsed.emails.entries()) {
    const expected = brief.slots[index]!;
    const contract = emailV3Slots[index]!;
    if (
      email.number !== expected.number ||
      email.purpose !== contract.purpose ||
      email.focusId !== expected.focusId ||
      email.sections.length !== contract.roles.length
    )
      throw new Error("Gemini changed the email journey's topic or structure");
    if (email.sections.some((s) => s.sourceQuestionIds.some((id) => !sourceIds.has(id))))
      throw new Error("Gemini cited an answer that does not exist");
    if (hasAnswers && !email.sections.some((s) => s.sourceQuestionIds.length))
      throw new Error("Gemini returned an email without assessment evidence references");
    const customerFields = [
      email.subject,
      email.preview,
      email.mainAction,
      ...email.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ];
    if (customerFields.some((text) => leaksInternalCopy(text, brief)))
      throw new Error("Gemini leaked an internal reference or instruction into customer copy");
    if (email.sections.some((s) => s.paragraphs.some((p) => p.trim() === email.mainAction.trim())))
      throw new Error("Gemini duplicated the main action in a section");
    for (const section of email.sections) {
      const sentences = section.paragraphs.join(" ").match(/[^.!?]+[.!?]/g) ?? [];
      const long = sentences
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.split(/\s+/).length >= 6);
      if (!unique(long)) throw new Error("Gemini repeated a sentence within an email section");
    }
    const words = paragraphWordCount(email);
    const minimum = brief.sparseEvidence ? contract.sparseMinimum : contract.acceptedWords[0];
    if (words < minimum || words > contract.acceptedWords[1])
      throw new Error("Gemini returned an email outside the draft length limits");
  }
  return parsed.emails;
}

/** Per-slot variants carry number, purpose, focus and section counts from the same contract. */
export function emailJourneyResponseSchema(brief: EmailBrief) {
  const allowed = brief.responses.filter((r) => !r.skipped).map((r) => r.questionId);
  return {
    name: "email_journey",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["emails"],
      properties: {
        emails: {
          type: "array",
          minItems: emailV3Slots.length,
          maxItems: emailV3Slots.length,
          items: {
            anyOf: brief.slots.map((slot, index) => ({
              type: "object",
              additionalProperties: false,
              required: [
                "number",
                "purpose",
                "focusId",
                "subject",
                "preview",
                "mainAction",
                "sections",
              ],
              properties: {
                number: { type: "integer", enum: [slot.number] },
                purpose: { type: "string", enum: [emailV3Slots[index]!.purpose] },
                focusId: slot.focusId ? { type: "string", enum: [slot.focusId] } : { type: "null" },
                subject: { type: "string", minLength: 1, maxLength: 100 },
                preview: { type: "string", minLength: 1, maxLength: 180 },
                mainAction: { type: "string", minLength: 1, maxLength: 450 },
                sections: {
                  type: "array",
                  minItems: emailV3Slots[index]!.roles.length,
                  maxItems: emailV3Slots[index]!.roles.length,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["heading", "paragraphs", "sourceQuestionIds"],
                    properties: {
                      heading: { type: "string", minLength: 1, maxLength: 100 },
                      paragraphs: {
                        type: "array",
                        minItems: 1,
                        maxItems: 3,
                        items: { type: "string", minLength: 1, maxLength: 3000 },
                      },
                      sourceQuestionIds: {
                        type: "array",
                        maxItems: allowed.length ? 16 : 0,
                        items: { type: "string", ...(allowed.length ? { enum: allowed } : {}) },
                      },
                    },
                  },
                },
              },
            })),
          },
        },
      },
    },
  };
}
