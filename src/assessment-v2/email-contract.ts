/** Slot order is the contract: section roles are positional, not customer headings. */
export const emailV3Slots = [
  {
    purpose: "detailed_report",
    label: "Understand the finding and try a small check",
    roles: [
      "result_summary",
      "evidence_and_interpretation",
      "secondary_or_uncertainty",
      "first_check",
    ],
    targetWords: [300, 450],
    acceptedWords: [120, 600],
    sparseMinimum: 60,
    instruction:
      "Deliver the strongest supported finding immediately using specific answers, a useful interpretation and the main uncertainty once, near the claim it limits. Include a secondary finding only if useful. Offer one small first check: what to look at and what to record. Explain enough to act without exhaustively comparing explanations; save the sharper observation tool for Email 2. This report must stand alone. No required three-C section or percentages.",
  },
  {
    purpose: "obstacle_distinction",
    label: "Locate the obstacle",
    roles: ["explanations_to_distinguish", "observable_clues", "one_observation"],
    targetWords: [160, 240],
    acceptedWords: [70, 330],
    sparseMinimum: 40,
    instruction:
      "Add a NEW observation tool or a sharper way to locate the obstacle, using the selected guide's obstacleTool where useful. Distinguish genuinely different explanations that would lead to different actions through something the reader can record or compare. Do not repeat Email 1's explanation as the contribution. State what each observed difference would change about the next step. Develop the existing check, not a separate assignment. Do not force an information/access/authority/workload taxonomy onto every topic.",
  },
  {
    purpose: "bounded_test",
    label: "Run or refine one bounded test",
    roles: ["question_and_scope", "test_method", "what_to_record"],
    targetWords: [180, 280],
    acceptedWords: [80, 380],
    sparseMinimum: 40,
    instruction:
      "Develop the existing check and Email 2's observation into one executable test of a single practical change on a comparable case. State the question, narrow scope, who needs to agree, any relevant information/access/authority, what to record and when to review it. Use concrete instructions, not a description of how a test should be designed. Do not invent staff, resources or authority. Refinement is not a competing assignment.",
  },
  {
    purpose: "result_interpretation",
    label: "Interpret possible results",
    roles: ["interpretation_frame", "outcome_branches", "smallest_next_adjustment"],
    targetWords: [180, 280],
    acceptedWords: [80, 380],
    sparseMinimum: 40,
    instruction:
      "Open naturally, for example: If you tried the check, here is how to interpret what happened. In the outcome_branches section, put two or three outcomes in SEPARATE short paragraphs (one paragraphs[] entry per branch). Each pairs an observable result, a limited interpretation and a different practical next adjustment. Include a smaller entry point for someone who has not started. Keep unknown outcomes conditional without narrating when this email was written. Never claim completion; do not generalize one result to the whole organization or automatically confirm the initial hypothesis.",
  },
  {
    purpose: "next_decision",
    label: "Decide what to handle or discuss",
    roles: ["unresolved_decision", "connection_or_boundary", "next_step_criteria"],
    targetWords: [160, 260],
    acceptedWords: [70, 360],
    sparseMinimum: 40,
    instruction:
      "Name the decision still to make. Connect a supported secondary finding only if relevant, as a hypothesis; otherwise deepen the primary uncertainty. Preserve joint priorities. Give concrete criteria for an internal adjustment versus an outside perspective, and a compact preparation aid: the issue, one available example and the decision to make. Make this useful even without a completed check. mainAction is one conditional next-decision request, including discussion with Nkoyo about that specific decision if useful. The renderer links that action to the approved route; do not add a separate sales request, offer, urgency or promised outcome.",
  },
] as const;
export const emailV3Purposes = emailV3Slots.map((slot) => slot.purpose) as [
  (typeof emailV3Slots)[number]["purpose"],
  ...(typeof emailV3Slots)[number]["purpose"][],
];

/** Frozen historical definitions; never apply v3 roles to saved v1/v2 content. */
export const legacyEmailPurposes = [
  "detailed_report",
  "primary_awareness",
  "primary_explanation",
  "primary_action",
  "secondary_exploration",
] as const;
export const legacyEmailStructure = [
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
export type EmailJourneyVersion = "email-journey-v1" | "email-journey-v2" | "email-journey-v3";
export type EmailPurpose =
  (typeof emailV3Slots)[number]["purpose"] | (typeof legacyEmailPurposes)[number];
export function emailSlotsForVersion(version: EmailJourneyVersion) {
  if (version === "email-journey-v3")
    return emailV3Slots.map((slot) => ({ ...slot, sectionCount: slot.roles.length }));
  if (version !== "email-journey-v1" && version !== "email-journey-v2")
    throw new Error("Unknown email journey version");
  return legacyEmailPurposes.map((purpose, index) => ({
    ...legacyEmailStructure[index]!,
    purpose,
    sectionCount: legacyEmailStructure[index]!.roles.length,
  }));
}
