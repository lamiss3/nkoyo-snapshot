import {
  emailJourneyBrief,
  nextJourneyEmailPreview,
  type EmailJourney,
  type JourneyEmail,
} from "./email-journey.ts";
import type { AssessmentSession } from "./types.ts";

/** Explicit staff test only. This is never an automatic substitute for Gemini. */
export function fixedTestEmailJourney(session: AssessmentSession): EmailJourney {
  const brief = emailJourneyBrief(session, "email-journey-v2");
  const primary = brief.topics[0],
    secondary = brief.topics[1];
  const sample = brief.responses.find((response) => response.questionId === brief.threadQuestionId);
  const section = (heading: string, ...paragraphs: string[]) => ({
    heading,
    paragraphs,
    sourceQuestionIds: [] as string[],
  });
  const test = section(
    "Integration test",
    "This is a fixed template test of Nkoyo's email setup. Gemini did not write this email. It is a draft for review and has not been sent.",
  );
  const observation =
    primary?.guide.meaning ??
    "The saved answers do not yet support a clear primary issue. More discussion is needed before choosing a focus.";
  const question =
    primary?.guide.explore ?? "Which recurring situation would you most like to understand better?";
  const action =
    primary?.guide.action ??
    "Record one recent situation, its effect on the work and the people involved, then review it together.";
  const evidence = sample
    ? {
        heading: "An answer you gave",
        paragraphs: [
          `Question: ${sample.question}`,
          `${sample.answerMode === "scenario_match" ? "Hypothetical example you matched (not a verified event)" : "Your answer"}: ${sample.writtenAnswer.trim() || sample.selectedAnswers.join("; ")}`,
          "This excerpt is included to test the connection to the saved assessment. It does not establish the cause of the issue.",
        ],
        sourceQuestionIds: [sample.questionId],
      }
    : section(
        "Your answers",
        "No usable answer excerpt was available. No example has been invented.",
      );
  const subjects = [
    "Your detailed Snapshot report",
    "A closer look at your primary focus",
    "Understanding the pattern",
    "One practical action to try",
    secondary
      ? "Connecting your findings and considering support"
      : "Reviewing your focus and considering support",
  ];
  const content = [
    [
      test,
      section("Your primary focus", primary?.name ?? "More evidence needed", observation),
      evidence,
      section(
        "Also worth exploring",
        secondary?.name ?? "No second issue identified",
        secondary?.guide.meaning ?? "No second issue is supported by this result.",
      ),
      section(
        "Culture, Capacity and Compliance",
        `The saved assessment's relative emphasis is Culture ${brief.threeCShare.culture}%, Capacity ${brief.threeCShare.capacity}% and Compliance ${brief.threeCShare.compliance}%. These shares are not validated organizational scores.`,
        brief.jointPriority
          ? "The two topics are joint priorities in the saved result."
          : "The topics follow the saved result's ordering.",
      ),
      section(
        "Choose a starting focus",
        question,
        "The later messages will help you recognize the pattern, understand its possible effects and try one manageable change. No cause or improvement is assumed.",
      ),
    ],
    [
      evidence,
      section(
        "Notice the recurring situation",
        observation,
        "Use a recent example to distinguish an occasional difficulty from a repeated pattern.",
      ),
      section("A question to reflect on", question),
    ],
    [
      evidence,
      section(
        "Explore how it affects the work",
        observation,
        "Map what happens before and after the difficulty. Separate what you observed from what you assume caused it.",
        "If this pattern continues, delays or repeated extra work could affect delivery. Check whether that is happening rather than treating it as inevitable.",
      ),
      section(
        "Discuss it with the people involved",
        question,
        "Check whether colleagues describe the same pattern and where their experience differs.",
      ),
    ],
    [
      evidence,
      section("Try one small step", action),
      section(
        "Review what changed",
        "Choose an owner and a review date seven days from now. Note whether the change helped, what remained difficult, and what further evidence you need.",
      ),
    ],
    [
      evidence,
      section(
        "Your secondary focus",
        secondary?.name ?? "No second issue identified",
        secondary?.guide.meaning ??
          "This result does not support naming a second problem. Use the follow-up conversation to explore what may have been missed.",
      ),
      section(
        "What a conversation could clarify",
        secondary?.guide.explore ?? "What additional example would help explain your experience?",
        secondary?.guide.action ?? "Record that example before choosing another action.",
        "The two topics may overlap, but this assessment has not proved a causal relationship.",
        "A conversation with Nkoyo could help you examine the connection and decide which next step is appropriate. No outcome or service availability is promised.",
      ),
    ],
  ];
  return {
    version: "email-journey-v2",
    status: "draft",
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    model: "fixed-test-v2 (no Gemini)",
    source: "fixed_test",
    primaryId: brief.primaryId,
    secondaryId: brief.secondaryId,
    jointPriority: brief.jointPriority,
    threadQuestionId: brief.threadQuestionId ?? null,
    emails: brief.slots.map((slot, index): JourneyEmail => ({
      number: slot.number,
      purpose: slot.purpose,
      focusId: slot.focusId,
      subject: `[TEST — FIXED] ${subjects[index]}`,
      preview: "Fixed template integration test — no Gemini generation, draft only.",
      sections: content[index]!,
      mainAction: [
        "Choose one finding or unresolved question from this report to explore first.",
        "Observe one real example and note what happened before and after the difficulty.",
        `Discuss this one question with your team: ${question}`,
        `Agree whether to try this small experiment: ${action}`,
        "If guided support would be useful, bring one finding or unresolved question to a conversation with Nkoyo.",
      ][index]!,
      ...(index === 4
        ? { supportInvitation: true }
        : {
            nextEmailPreview: nextJourneyEmailPreview(
              index + 1,
              brief.primaryId,
              brief.secondaryId,
              "email-journey-v2",
            )!,
          }),
    })),
  };
}
