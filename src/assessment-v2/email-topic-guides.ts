import type { ProblemId } from "./types.ts";

interface AdvisoryGuide {
  explanations: { possibility: string; clue: string }[];
  firstCheck: { action: string; observe: string };
  obstacleTool: { action: string; record: string; use: string };
  boundedTest: string;
  results: { ifResult: string; interpretation: string; nextAdjustment: string }[];
  limits: string;
}
/** Email 2 adds a topic-specific observation, rather than repeating Email 1's explanation.
 * These are drafting aids, never text to paste as internal annotations into an email. */
const obstacleTools: Record<ProblemId, AdvisoryGuide["obstacleTool"]> = {
  P01: {
    action:
      "Put confirmed receipt dates and payment dates for the same commitment on one short timeline.",
    record:
      "Mark what is confirmed, what is awaiting a decision, and the first date a payment lacks coverage.",
    use: "A gap before confirmed income calls for a timing decision; a payment with no confirmed coverage calls for a commitment decision.",
  },
  P02: {
    action:
      "Break the support task from the first check into the time or purchases it actually needs.",
    record:
      "Beside each cost, note its budget line and any relevant funding restriction; leave unknowns blank.",
    use: "An absent estimate needs costing; a visible cost with a funding restriction needs an eligibility or coverage decision.",
  },
  P03: {
    action:
      "Divide the same request's timeline into preparing it, waiting for a decision, and correcting returned information.",
    record:
      "Note available dates and the stated reason for each pause. Mark missing timing as unknown, not zero.",
    use: "Time spent correcting a request suggests testing one clearer input; time waiting with complete information suggests checking the agreed approver's next step. Total elapsed time alone cannot distinguish them.",
  },
  P04: {
    action:
      "List the next two steps needed for the same task, beside the person expected to carry each one.",
    record:
      "For each step, ask whether permission is already agreed and what input is still needed.",
    use: "A step needing permission calls for a decision-boundary discussion; an authorized step missing a contribution calls for a dependency handoff.",
  },
  P05: {
    action:
      "Compare the agreed decision route with what was requested at the last board–staff handoff.",
    record:
      "Note whether the request reopened who decides or asked for a named piece of assurance.",
    use: "Reopened ownership needs agreement on the boundary; a specific assurance request needs a clearer information handoff.",
  },
  P06: {
    action:
      "Place the actual rule, the stated principle and the step taken side by side for the same decision.",
    record:
      "Ask where accounts differ: the required step, the interpretation of the principle, or a tradeoff people knowingly made.",
    use: "A conflicting rule needs a permitted process change; different interpretations need an agreed example of the principle in practice.",
  },
  P07: {
    action:
      "For the service already chosen, separate work ready to start from work waiting between stages.",
    record:
      "Use available counts at the start and end of the same short period; note any unusual surge.",
    use: "Growth across the whole queue suggests a commitment/capacity decision; a queue concentrated at one stage points to that step first.",
  },
  P08: {
    action:
      "Track whether each item at the chosen handoff reaches an agreed receiver before it waits.",
    record:
      "Separate items without a receiver from items accepted but still waiting, using a short normal work cycle.",
    use: "Unclaimed items need a receiver; accepted items piling up need a look at the receiver's method or available time.",
  },
  P09: {
    action:
      "Use one voluntarily shared example to separate the work demanded from the support needed to do it.",
    record:
      "Note the task's timing and what would make it manageable, without collecting personal health details.",
    use: "An adjustable recurring demand supports a small workload test; a need that persists with manageable demand warrants an appropriate support conversation.",
  },
  P10: {
    action: "Put one vacant-role duty beside the work its current cover has had to postpone.",
    record:
      "Mark who agreed the coverage, whether it has a review date, and which commitment moved, if any.",
    use: "Unagreed coverage needs an explicit owner or pause decision; agreed coverage displacing work needs a priority or resource decision.",
  },
  P11: {
    action:
      "Follow the chosen requirement through four links: source, required action, owner, completion evidence.",
    record:
      "Identify the first link nobody can confirm; distinguish an unclear requirement from an unassigned clear action.",
    use: "An unassigned action needs ownership; an unclear requirement needs authoritative clarification before a process change.",
  },
  P12: {
    action:
      "In the same tabletop interruption, pause after naming the first action and try to locate what it needs.",
    record:
      "Distinguish disagreement about the first decision from a missing contact, record or authorized access.",
    use: "Different first decisions need an agreed response role; an agreed decision with an inaccessible dependency needs that dependency checked.",
  },
  P13: {
    action:
      "Compare the same shared decision's agreed route with the last contribution actually requested.",
    record:
      "Note whether partners disputed the rule or agreed it but lacked a named contribution or escalation step.",
    use: "A disputed rule needs authorized agreement; a missing contribution under an agreed rule needs a practical handoff.",
  },
  P14: {
    action:
      "Put the repeated measure's definition, reporting period and evidence source side by side in both requests.",
    record: "Mark exact matches and the specific mismatches instead of relying on similar labels.",
    use: "Exact matches may support reuse; a different definition or period needs a separate calculation or clarification.",
  },
  P15: {
    action:
      "Ask the proposed backup to explain the next decision and locate the information needed for the same responsibility.",
    record:
      "Separate an unassigned decision from a named backup who lacks a record, introduction or permission.",
    use: "An unassigned decision needs interim coverage; a blocked backup needs that specific handover addition.",
  },
  P16: {
    action:
      "For the same safe task, note where an authorized backup first asks the usual owner for help.",
    record:
      "Record whether the missing piece is an instruction, a decision or permitted access; do not grant access as part of the observation.",
    use: "A missing instruction supports a documentation check; a permission or decision gap needs the appropriate owner's agreement.",
  },
  P17: {
    action:
      "Ask the people involved in the chosen shared task to name its next priority and next dependency.",
    record:
      "Compare whether the disagreement is about what comes first or who can supply an already agreed next step.",
    use: "Competing first priorities need a tradeoff decision; agreement followed by waiting needs a specific handoff checked.",
  },
  P18: {
    action:
      "For the same choice, name the strategic priority used and any urgent exception that changed it.",
    record:
      "Note who agreed the exception and what work it displaced, leaving unobserved details unknown.",
    use: "No usable decision rule suggests translating the plan into one question; an explicit exception suggests making its tradeoff visible.",
  },
  P19: {
    action:
      "Trace one fictional AI input through the permitted use and human check before any real-data trial.",
    record:
      "Mark where people disagree about allowed input, who reviews the output, or what counts as a checked result.",
    use: "A disputed input boundary needs policy clarification; an agreed boundary with no reviewer needs clear human responsibility.",
  },
  P20: {
    action:
      "At the same blocked tool step, compare what the guidance says with what an authorized user actually sees.",
    record:
      "Note missing instructions, unavailable permitted access or a reproducible failure despite both being present.",
    use: "Missing guidance supports a short instruction test; a reproducible failure needs the existing support route with that exact step.",
  },
};
const advice = (
  id: ProblemId,
  a: string,
  b: string,
  clueA: string,
  clueB: string,
  action: string,
  observe: string,
  test: string,
  results: AdvisoryGuide["results"],
  limits: string,
): AdvisoryGuide => ({
  explanations: [
    { possibility: a, clue: clueA },
    { possibility: b, clue: clueB },
  ],
  firstCheck: { action, observe },
  obstacleTool: obstacleTools[id],
  boundedTest: test,
  results,
  limits,
});
const outcome = (ifResult: string, interpretation: string, nextAdjustment: string) => ({
  ifResult,
  interpretation,
  nextAdjustment,
});

/** Hypotheses and small checks, not diagnoses or legal advice. Send only selected guides. */
export const emailTopicGuides: Record<ProblemId, AdvisoryGuide> = {
  P01: advice(
    "P01",
    "Renewal timing creates a cash gap.",
    "Commitments extend beyond confirmed funding.",
    "A delay matters even when the next award is confirmed.",
    "Delivery assumes income that is not yet committed.",
    "Place one funding end date beside the commitment it supports.",
    "Whether coverage is confirmed, delayed or unconfirmed.",
    "With the person responsible for that funding line, trace one commitment across its next renewal; record confirmed coverage, timing and one decision date. Review before making another commitment.",
    [
      outcome(
        "Coverage is confirmed but arrives later",
        "Timing may be the immediate constraint",
        "Compare a permitted timing adjustment for this commitment.",
      ),
      outcome(
        "Coverage is unconfirmed",
        "The commitment may exceed secured funding",
        "Agree what decision waits for confirmation.",
      ),
    ],
    "One funding line does not establish overall financial viability. Check conditions before suggesting a financing arrangement.",
  ),
  P02: advice(
    "P02",
    "Necessary support work is missing from budgets.",
    "It is budgeted but cannot be charged to this funding line.",
    "A recurring support task has no cost allocation.",
    "The cost exists but the relevant funding conditions restrict it.",
    "Trace one necessary support task to its budget line.",
    "Whether its cost is visible and an eligible source is identified.",
    "With whoever prepares the budget, estimate one task using available records and compare its allocation with the relevant funding conditions. Record the gap or uncertainty; review before the next budget revision.",
    [
      outcome(
        "The task has no allocation",
        "Visibility may be the first gap",
        "Add a clearly labelled estimate for discussion.",
      ),
      outcome(
        "It is allocated but restricted",
        "Eligibility may constrain the options",
        "Ask the responsible person to check permissible coverage.",
      ),
    ],
    "Do not infer a deficit or advise breaching funder terms; estimates need checking.",
  ),
  P03: advice(
    "P03",
    "Routine approval authority is unclear.",
    "The approval route is clear but a necessary input or review is missing.",
    "A request moves between people who disagree about who can decide.",
    "An identified approver waits for a specific missing item.",
    "Trace one routine decision from request to its next step.",
    "Where it waits and what would let it move.",
    "Use the timeline to choose one change: clarify one repeatedly missing input OR confirm the existing permitted decision route. Agree it with the request owner and appropriate approver for one comparable low-risk request. Record preparation, waiting and corrections as before; review at its next decision or an agreed stopping date. Keep other required checks in place so the comparison is useful.",
    [
      outcome(
        "A named owner can act once the boundary is clear",
        "Ambiguous authority may contribute",
        "Keep that boundary for this decision type and check another example.",
      ),
      outcome(
        "It still waits for a named input",
        "The input or review may be the constraint",
        "Improve that one handoff instead of widening authority.",
      ),
    ],
    "One faster decision does not establish that all approvals should be delegated.",
  ),
  P04: advice(
    "P04",
    "A role lacks a necessary decision right.",
    "It has the right but lacks an input or resource needed to use it.",
    "A person is accountable but must seek permission for the agreed step.",
    "Permission is clear while a specific dependency is unavailable.",
    "Compare one expected outcome with the decisions needed to deliver it.",
    "Which decision or dependency sits outside the role.",
    "With the role holder and whoever can approve its boundaries, examine one task. Agree a safe decision limit or a named dependency; record whether that task advances and review before extending the arrangement.",
    [
      outcome(
        "A clarified decision right allows the step",
        "An authority mismatch may matter",
        "Document that narrow right and its escalation boundary.",
      ),
      outcome(
        "The step still lacks a named dependency",
        "Authority alone may not resolve it",
        "Assign the next dependency to an agreed owner.",
      ),
    ],
    "Do not assume the reader can change a role or approve resources.",
  ),
  P05: advice(
    "P05",
    "Board and staff boundaries are unclear.",
    "The boundary is agreed but information arrives too late for oversight.",
    "The same operational decision is repeatedly reopened over who decides.",
    "People agree who decides but ask for missing assurance.",
    "Map the last handoff for one board–staff decision.",
    "Whether disagreement concerns authority or required assurance.",
    "With appropriate board and staff representatives, use one upcoming low-risk decision to agree who recommends, decides and is informed, using current governance documents. Record reopenings and missing information; review after that decision.",
    [
      outcome(
        "The agreed boundary is accepted",
        "Boundary ambiguity may contribute",
        "Retain the map for this decision type.",
      ),
      outcome(
        "Further assurance is still needed",
        "The information route may be incomplete",
        "Agree the specific assurance needed and when.",
      ),
    ],
    "Existing governing documents and duties take precedence; this is not legal advice.",
  ),
  P06: advice(
    "P06",
    "A routine rule conflicts with a stated principle.",
    "People interpret the principle differently in practical tradeoffs.",
    "Following the rule produces a result at odds with the principle.",
    "People choose different actions while citing the same value.",
    "Compare one recent decision with one stated principle.",
    "Which observable step supports or conflicts with it.",
    "Agree a suitable process owner and examine one decision using the actual rule and stated principle. Test one permitted adjustment or clarify one tradeoff; record the changed step and review with affected people.",
    [
      outcome(
        "A small rule change aligns the step",
        "The routine may need adjustment",
        "Check that the change remains workable in another case.",
      ),
      outcome(
        "Interpretations still differ",
        "The tradeoff may need explicit discussion",
        "Agree what the principle means for this decision.",
      ),
    ],
    "A single case does not establish hypocrisy or an organization-wide values gap.",
  ),
  P07: advice(
    "P07",
    "Incoming demand is persistently above available delivery time.",
    "Variation or a specific handoff creates a temporary bottleneck.",
    "Work accumulates across ordinary periods.",
    "Delays cluster around a particular stage or short surge.",
    "Compare incoming and completed work for one service over one short period.",
    "Whether the gap is sustained or concentrated at a stage.",
    "With whoever coordinates that service, use available counts for one manageable period. Agree one permissible commitment or handoff adjustment; record incoming work, completion and carried-over work. Review at that period's end.",
    [
      outcome(
        "The gap remains across the period",
        "Commitments may exceed current capacity",
        "Discuss a bounded demand, capacity or commitment adjustment.",
      ),
      outcome(
        "The queue sits at one handoff",
        "Flow may be the immediate constraint",
        "Test that handoff before changing all commitments.",
      ),
    ],
    "One period may not represent seasonal demand; do not invent staffing or promise access improvements.",
  ),
  P08: advice(
    "P08",
    "A handoff has no owner at the new scale.",
    "Ownership is clear but the method cannot handle the changed volume.",
    "Tasks bounce between old responsibilities.",
    "One owner receives work reliably but a queue still grows.",
    "Follow one recurring handoff that became harder after growth.",
    "Whether it reaches an agreed owner and where it queues.",
    "Agree the people involved and trace one handoff through a short cycle. Test a named receiver or one small method change; record lost/reworked items and waiting. Review before expanding the change.",
    [
      outcome(
        "Naming a receiver prevents the missed step",
        "Ownership may not have kept pace",
        "Document this handoff's boundary.",
      ),
      outcome(
        "It still queues with a clear owner",
        "The method or workload may be stretched",
        "Compare one process adjustment with available capacity.",
      ),
    ],
    "Growth alone does not prove the operating model is unsuitable.",
  ),
  P09: advice(
    "P09",
    "A recurring demand leaves little recovery time.",
    "A particular kind of work needs support beyond a workload adjustment.",
    "Pressure returns with the same recurring task or commitment.",
    "The difficulty persists despite a manageable amount of work.",
    "Identify one recurring demand using an example people are comfortable sharing.",
    "Whether the demand can change or needs a different support route.",
    "With affected people and an agreed coordinator, choose one safe demand adjustment for a short cycle. Record workload and self-reported experience only with consent; review whether the difficulty changes, without collecting sensitive personal details.",
    [
      outcome(
        "Pressure eases after the bounded adjustment",
        "That demand may contribute",
        "Review whether the adjustment is sustainable without shifting the burden.",
      ),
      outcome(
        "Difficulty persists",
        "Work volume may not explain it alone",
        "Ask what appropriate support or further evidence is needed.",
      ),
    ],
    "Do not diagnose burnout, infer emotions, promise recovery or solicit confidential health information.",
  ),
  P10: advice(
    "P10",
    "Vacant-role duties have no explicit coverage decision.",
    "Coverage is agreed but continuing commitments exceed available time.",
    "The same people absorb tasks informally.",
    "Coverage is named yet planned work is repeatedly displaced.",
    "List the duties absorbed from one vacant role and their current owners.",
    "Which duties are agreed, informal or unassigned.",
    "With the affected people and someone able to agree work priorities, test one explicit coverage or pause decision for one duty. Record whether it gets done and what other work moves; review after a short agreed cycle.",
    [
      outcome(
        "Explicit coverage reduces confusion without moving other work",
        "Unclear coverage may matter",
        "Document the arrangement and its end/review point.",
      ),
      outcome(
        "Another commitment is displaced",
        "Total commitments may remain too high",
        "Choose a proportionate pause or resource discussion.",
      ),
    ],
    "Do not assume recruitment is available or a vacancy caused every workload difficulty.",
  ),
  P11: advice(
    "P11",
    "A requirement lacks a named change owner.",
    "Ownership is clear but its applicability or evidence is unclear.",
    "People cannot name who checks completion.",
    "An owner is waiting for an authoritative clarification.",
    "Trace one current requirement from its source to an owner and completion check.",
    "Which link is missing or uncertain.",
    "With the responsible person, use the authoritative requirement for one relevant process. Record the required action, owner, due date if known and evidence of completion. Review the missing link before changing the process.",
    [
      outcome(
        "A named owner can complete a clear action",
        "Ownership may be the immediate gap",
        "Retain a simple completion check.",
      ),
      outcome(
        "The action itself remains uncertain",
        "Applicability needs clarification",
        "Seek a qualified interpretation before claiming compliance.",
      ),
    ],
    "No legal conclusions or invented deadlines; a checklist does not establish compliance.",
  ),
  P12: advice(
    "P12",
    "Disruption responsibilities are unclear.",
    "Roles are documented but contacts, dependencies or access are untested.",
    "People name different first actions or decision owners.",
    "The owner is agreed but cannot locate a necessary dependency.",
    "Walk through the first step of one plausible interruption.",
    "Whether an agreed owner can locate what that step needs.",
    "With those responsible for continuity, conduct a short tabletop for one interruption. Use current records without disrupting service; record unclear decisions or inaccessible dependencies and review one correction.",
    [
      outcome(
        "The first step is clear and feasible",
        "This part of the plan may be usable",
        "Test a different step before drawing wider conclusions.",
      ),
      outcome(
        "A role or dependency is missing",
        "That gap needs attention",
        "Assign one correction and repeat only the affected step.",
      ),
    ],
    "A tabletop success is not proof of organization-wide resilience or an instruction to test a live outage.",
  ),
  P13: advice(
    "P13",
    "Partners have not agreed a decision boundary.",
    "The agreement is clear but contributions or escalation are not followed.",
    "The same decision is negotiated again during delivery.",
    "People agree the rule but a promised contribution does not arrive.",
    "Compare one shared decision with the current partnership agreement.",
    "Whether the decision right or its execution is uncertain.",
    "With authorized partner contacts, trace one low-risk shared decision. Agree its decision route or contribution handoff; record where it moves or pauses and review after that decision.",
    [
      outcome(
        "A clarified route is accepted",
        "The boundary may need documentation",
        "Record it through the appropriate agreement process.",
      ),
      outcome(
        "The handoff still fails under an agreed rule",
        "Execution may need attention",
        "Name the missing contribution and use the agreed escalation route.",
      ),
    ],
    "Do not assume the reader can amend an agreement or speak for partners.",
  ),
  P14: advice(
    "P14",
    "Different reports reuse the same underlying information.",
    "Reports ask genuinely different definitions or time periods.",
    "The same measure is repeatedly copied or reformatted.",
    "Similar labels require incompatible calculations.",
    "Compare one repeated measure across two reporting requests.",
    "Whether its definition, period and evidence actually match.",
    "With the reporting owner, trace that measure to its source and test reuse only where definitions agree. Record duplication avoided and any mismatch; review before changing a required submission.",
    [
      outcome(
        "Definitions and periods match",
        "Reuse may reduce duplication",
        "Keep one source with a checked format conversion.",
      ),
      outcome(
        "Definitions differ",
        "Copying may create errors",
        "Document the distinction and clarify requirements before automating.",
      ),
    ],
    "Do not promise savings, alter funder requirements or infer equivalent definitions.",
  ),
  P15: advice(
    "P15",
    "A departure lacks interim responsibility coverage.",
    "An interim owner exists but cannot access key knowledge or relationships.",
    "Critical decisions have no temporary owner.",
    "The owner is named but cannot carry out a critical step.",
    "Check one essential responsibility against its interim coverage plan.",
    "Whether an owner and a usable handover exist.",
    "With the role holder if available and the authorized transition lead, walk through one critical responsibility with the proposed backup. Record missing decisions, access or handover steps; review before relying on the coverage.",
    [
      outcome(
        "The backup can follow the agreed step",
        "That responsibility may have usable coverage",
        "Check a different dependency before assuming full continuity.",
      ),
      outcome(
        "A decision or knowledge gap remains",
        "The handover needs a specific addition",
        "Agree that addition and repeat the affected step.",
      ),
    ],
    "Do not invent a departure date, successor, access permission or readiness guarantee.",
  ),
  P16: advice(
    "P16",
    "Practical knowledge has not been made accessible.",
    "Records exist but decisions or authorized access still depend on one person.",
    "A colleague cannot locate a usable procedure.",
    "The procedure is available but an approval or permission blocks it.",
    "Ask an authorized backup to locate the first step of one recurring task.",
    "Whether the difficulty is locating instructions or acting on them.",
    "With the task owner, let an authorized backup walk through one safe task using current records. Record where explanation or permission is needed; review that gap rather than granting broad access.",
    [
      outcome(
        "A short instruction lets the backup complete the step",
        "Documentation may help this dependency",
        "Check the instruction in another permitted instance.",
      ),
      outcome(
        "The backup still cannot act",
        "A decision or access boundary may matter",
        "Clarify the permitted route with its owner.",
      ),
    ],
    "A successful task does not establish full replaceability; preserve access controls and confidential information.",
  ),
  P17: advice(
    "P17",
    "Teams lack an agreed tradeoff between priorities.",
    "The priority is agreed but dependencies or capacity are unresolved.",
    "Different teams make incompatible choices for the same resource.",
    "People name the same priority but cannot complete its next handoff.",
    "Trace one active tradeoff to the last agreed decision.",
    "Whether the tradeoff or a downstream dependency is unresolved.",
    "With representatives able to agree this tradeoff, select one shared task and record its priority, next owner and dependency. Observe the next handoff and review any disagreement or delay.",
    [
      outcome(
        "An explicit tradeoff allows coordinated action",
        "Priority ambiguity may contribute",
        "Retain that decision until its agreed review point.",
      ),
      outcome(
        "The agreed priority still waits",
        "A dependency may be the immediate obstacle",
        "Resolve that one handoff before reopening all priorities.",
      ),
    ],
    "Do not assume a consensus, hierarchy or capacity to take on more work.",
  ),
  P18: advice(
    "P18",
    "The strategy is not translated into a routine decision rule.",
    "The rule is clear but new urgent work overrides it without an explicit tradeoff.",
    "People cannot explain how the plan guides one recent choice.",
    "They can explain the rule but an exception displaced it.",
    "Compare one routine decision with the relevant stated priority.",
    "Whether the missing link is an action rule or an exception decision.",
    "With the priority owner, apply one agreed strategy question to a low-risk upcoming choice. Record what the rule changes and any necessary exception; review after that choice without assuming urgent work is avoidable.",
    [
      outcome(
        "The rule changes the choice usefully",
        "The plan may need translation into routines",
        "Retain this decision prompt for a small next check.",
      ),
      outcome(
        "An exception still overrides it",
        "The tradeoff may need visibility",
        "Name who can agree the exception and what it displaces.",
      ),
    ],
    "One decision does not prove strategic alignment; urgent work can be legitimate.",
  ),
  P19: advice(
    "P19",
    "AI use lacks an explicit information or human-review rule.",
    "A rule exists but responsibility for applying it is unclear.",
    "People describe different boundaries for what may be entered or used.",
    "They agree the rule but cannot name who checks this output.",
    "Map one current AI use without entering real sensitive data.",
    "Whether allowed inputs, reviewer and permitted use are clear.",
    "With the responsible process owner, test one fictional input and a known checkable output under current policy. Record the review step, rejected errors and unresolved permissions; review before using real data or consequential outputs.",
    [
      outcome(
        "The rule and reviewer work for the fictional case",
        "This review path may be usable",
        "Test another bounded case; keep human responsibility.",
      ),
      outcome(
        "A boundary or review step is unclear",
        "Governance needs clarification",
        "Pause that uncertain use until its owner agrees the rule.",
      ),
    ],
    "No invented legal assurance, policy expertise or permission to upload sensitive information.",
  ),
  P20: advice(
    "P20",
    "A tool task lacks accessible guidance or support.",
    "Users understand the task but the tool or workflow itself fails.",
    "The difficulty changes when a usable instruction is available.",
    "The same step fails even with clear instructions and permitted access.",
    "Observe one recurring tool task using current guidance.",
    "Where guidance, access or the actual tool fails.",
    "With an authorized user and the support owner if available, repeat one low-risk task using a short checked instruction. Record the exact blocked step or successful outcome and review before recommending training or a tool change.",
    [
      outcome(
        "The checked instruction resolves the step",
        "Guidance may be the immediate gap",
        "Keep that instruction and check usability with another permitted task.",
      ),
      outcome(
        "The same failure persists",
        "The workflow or tool may need attention",
        "Escalate the specific reproducible failure through the existing support route.",
      ),
    ],
    "Do not assume incompetence, invent technical causes or promise a replacement system.",
  ),
};
