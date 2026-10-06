import { emailJourneyBrief, type EmailJourney, type JourneyEmail } from "./email-journey.ts";
import type { AssessmentSession } from "./types.ts";

/** Explicit staff test only. This is never an automatic substitute for Gemini. */
export function fixedTestEmailJourney(session: AssessmentSession): EmailJourney {
  const brief = emailJourneyBrief(session);
  const primary = brief.topics[0],
    secondary = brief.topics[1];
  const sample =
    brief.responses.find((response) => response.writtenAnswer.trim()) ??
    brief.responses.find((response) => response.selectedAnswers.length);
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
          `Your answer: ${sample.writtenAnswer.trim() || sample.selectedAnswers.join("; ")}`,
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
    "Exploring your secondary focus",
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
        "A starting point for the next seven days",
        action,
        "Agree an owner and a review date. Compare what happened with the original concern before deciding on a larger change.",
      ),
    ],
    [
      test,
      section(
        "Notice the recurring situation",
        observation,
        "Use a recent example to distinguish an occasional difficulty from a repeated pattern.",
      ),
      section("A question to reflect on", question),
    ],
    [
      test,
      section(
        "Explore how it affects the work",
        observation,
        "Map what happens before and after the difficulty. Separate what you observed from what you assume caused it.",
      ),
      section(
        "Discuss it with the people involved",
        question,
        "Check whether colleagues describe the same pattern and where their experience differs.",
      ),
    ],
    [
      test,
      section("Try one small step", action),
      section(
        "Review what changed",
        "Choose an owner and a review date seven days from now. Note whether the change helped, what remained difficult, and what further evidence you need.",
      ),
    ],
    [
      test,
      section(
        "Your secondary focus",
        secondary?.name ?? "No second issue identified",
        secondary?.guide.meaning ??
          "This result does not support naming a second problem. Use the follow-up conversation to explore what may have been missed.",
      ),
      section(
        "Explore without assuming a connection",
        secondary?.guide.explore ?? "What additional example would help explain your experience?",
        secondary?.guide.action ?? "Record that example before choosing another action.",
        "The two topics may overlap, but this assessment has not proved a causal relationship.",
      ),
    ],
  ];
  return {
    version: "email-journey-v1",
    status: "draft",
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    model: "fixed-test-v1 (no Gemini)",
    source: "fixed_test",
    primaryId: brief.primaryId,
    secondaryId: brief.secondaryId,
    jointPriority: brief.jointPriority,
    emails: brief.slots.map((slot, index): JourneyEmail => ({
      ...slot,
      subject: `[TEST — FIXED] ${subjects[index]}`,
      preview: "Fixed template integration test — no Gemini generation, draft only.",
      sections: content[index]!,
    })),
  };
}
