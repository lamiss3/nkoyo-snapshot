/**
 * Editable results content. All wording is qualitative and rule-selected —
 * there are no scores, tiers, grades or rankings anywhere in this file.
 */

import type { DimensionId } from "./questions";

export interface PatternContent {
  headline: string;
  /** What the answers suggest. */
  suggests: string;
  /** A question worth exploring. */
  explore: string;
  /** One realistic action. */
  action: string;
  /** A prompt for the leadership team or board. */
  conversationPrompt: string;
  /** An action that can reasonably be completed within a week. */
  weekAction: string;
}

/** Pattern content keyed to the specific core question showing the strongest friction. */
export const questionPatterns: Record<string, PatternContent> = {
  q1: {
    headline: "Decision ownership may need more clarity.",
    suggests:
      "Your answer suggests that authority for recurring decisions may be unclear or concentrated in a small number of people.",
    explore:
      "Which decisions come back to you every month that someone else could reasonably own?",
    action:
      "Map one repeated decision: who owns it, what they can approve independently, and when it should escalate.",
    conversationPrompt:
      "Name the three decisions that wait on one person most often — who could own each of them instead?",
    weekAction:
      "Pick one recurring decision and write a single page naming the owner, their approval limit and the escalation trigger.",
  },
  q2: {
    headline: "Speaking up may not lead to a useful response.",
    suggests:
      "Your answer suggests people may hesitate to raise concerns or may not receive a useful response when they do.",
    explore: "When was the last time someone changed a decision by disagreeing with it?",
    action:
      "Add a short standing item to one staff and one board meeting for concerns and open questions, with a named person responsible for follow-up.",
    conversationPrompt:
      "What would make it genuinely safe, and genuinely useful, to disagree in our meetings?",
    weekAction:
      "Add a 'what are we not saying?' item to the next leadership meeting agenda and record what surfaces.",
  },
  q3: {
    headline: "Board and staff roles may be blurring in practice.",
    suggests:
      "Your answers suggest that written roles and daily practice may be drifting apart in some areas.",
    explore: "Where have board and staff recently worked on the same decision?",
    action:
      "Take one area where roles blur and write down what the board decides, what staff decide, and what is simply reported.",
    conversationPrompt:
      "In which areas do we disagree about who decides — and where has that cost us time?",
    weekAction:
      "Draft a one-page decide/advise/inform split for a single area, such as hiring or budget approvals.",
  },
  q4: {
    headline: "Essential work may depend on too few people.",
    suggests:
      "Your answer suggests essential work may be hard to continue when a key person is unavailable.",
    explore: "What would stop within a week if one key person were unexpectedly unavailable?",
    action:
      "Document one essential recurring task, identify a backup and test whether the instructions are usable by someone else.",
    conversationPrompt:
      "If our most experienced person were out for a month, what would we notice first?",
    weekAction:
      "Write down the steps for one essential recurring task and have a colleague follow them without help.",
  },
  q5: {
    headline: "Current commitments may exceed available capacity.",
    suggests:
      "Your answer suggests current commitments may require more time or resources than the team has available.",
    explore: "Which commitments consistently require more than the time allocated to them?",
    action:
      "Track where leadership and program time actually goes for two weeks, then name one commitment to resource properly or reduce.",
    conversationPrompt:
      "What are we delivering today that our current staffing cannot realistically sustain?",
    weekAction:
      "Log where your own week actually went, and bring the pattern to your next leadership meeting.",
  },
  q6: {
    headline: "New work may be arriving without a capacity check.",
    suggests:
      "Your answers suggest new programs or funding may be accepted before the added staffing and coordination are assessed.",
    explore: "What did the last new commitment actually require that was not budgeted?",
    action:
      "Create a short intake question set for new opportunities: who delivers it, what it displaces, and what it costs to coordinate.",
    conversationPrompt:
      "What is our standard for saying yes — and what would make us say no?",
    weekAction:
      "Write five questions the team must answer before accepting the next funding opportunity.",
  },
  q7: {
    headline: "Governance policies may need a practical review.",
    suggests:
      "Your answer suggests bylaws or key policies may lack a regular review schedule or a clear owner.",
    explore: "When were our bylaws last reviewed, and who is responsible for that review?",
    action:
      "Identify the owner and most recent review date for one important policy, then schedule the next review.",
    conversationPrompt:
      "Which governance documents have we not looked at in the last two years?",
    weekAction:
      "Locate your bylaws, note the last revision date, and add a review to the next board agenda.",
  },
  q8: {
    headline: "Conflict-of-interest practice may be lighter than the policy.",
    suggests:
      "Your answers suggest disclosures or documented decisions may not consistently follow the written policy.",
    explore: "Where would we find this year's disclosures and the decisions that followed them?",
    action:
      "Confirm who collects disclosures, where they are stored, and how a related decision gets recorded in minutes.",
    conversationPrompt:
      "How do we record a decision when someone at the table has an interest in the outcome?",
    weekAction:
      "Check whether current-year conflict-of-interest disclosures exist and where they are kept.",
  },
  q9: {
    headline: "Financial controls may rely on habit more than documentation.",
    suggests:
      "Your answers suggest controls may be practised informally rather than written down and consistently followed.",
    explore: "Could someone new follow our approval and payment process from written instructions?",
    action:
      "Write down the approval path for one common transaction type and confirm who checks it.",
    conversationPrompt:
      "Where do we rely on one person for both initiating and approving the same thing?",
    weekAction:
      "Document the approval steps for one payment type and review them with your finance lead.",
  },
};

export type DimensionState = "strength" | "inconsistent" | "friction" | "uncertain" | "mixed";

/** Fallback content when no single question dominates a dimension. */
export const dimensionPatterns: Record<DimensionId, Record<DimensionState, PatternContent>> = {
  culture: {
    strength: {
      headline: "Decision-making appears to be holding up well.",
      suggests:
        "You reported clear ownership and room for honest conversation across your culture questions.",
      explore: "Which of these practices would survive a leadership change?",
      action:
        "Stress-test one strength: ask a newer team member to describe who owns a recurring decision.",
      conversationPrompt: "Which of our decision-making habits are written down, and which are simply remembered?",
      weekAction: "Ask two people to describe who owns one recurring decision and compare the answers.",
    },
    inconsistent: {
      headline: "Culture practices may be applied unevenly.",
      suggests:
        "Your answers suggest the practices exist but are not applied the same way across teams or situations.",
      explore: "Where does the approach change depending on who is involved?",
      action: "Pick one practice and define what 'consistently applied' would look like in a normal month.",
      conversationPrompt: "Where do our practices change depending on who is in the room?",
      weekAction: "Write a short description of how one decision should run every time, and share it with your team.",
    },
    friction: {
      headline: "Ownership and authority may be creating friction.",
      suggests:
        "Your answers suggest several culture practices are informal or not currently in place.",
      explore: "Which decisions slow down most often, and why?",
      action: "Choose one recurring decision and document its owner, limits and escalation path.",
      conversationPrompt: "What slows our decisions down most — and who could change that this quarter?",
      weekAction: "Document the owner and approval limit for one recurring decision.",
    },
    uncertain: {
      headline: "Culture is an area worth investigating, not assuming.",
      suggests:
        "You selected 'I'm not sure' on several culture questions. That signals questions to investigate, not confirmed gaps.",
      explore: "Who in the organization would actually know how these decisions run today?",
      action: "Ask two people at different levels to describe how one recurring decision is made and compare answers.",
      conversationPrompt: "What do we each believe about how decisions get made here — and do those beliefs match?",
      weekAction: "Have two short conversations to establish how one recurring decision actually happens.",
    },
    mixed: {
      headline: "Culture shows a mix of strengths and soft spots.",
      suggests: "Some culture practices are steady while others depend on individuals or situations.",
      explore: "Which practice would you least want to lose, and which is most fragile?",
      action: "Name one practice to protect and one to formalize over the next quarter.",
      conversationPrompt: "Which culture practice is strongest, and which is most dependent on one person?",
      weekAction: "List the culture practice you most rely on and note whether it is documented anywhere.",
    },
  },
  capacity: {
    strength: {
      headline: "Capacity appears to be deliberately managed.",
      suggests: "You reported continuity, planning and resourcing practices that are consistently in place.",
      explore: "When was the last time these plans were tested rather than assumed?",
      action: "Run a short tabletop test: one key person unavailable for two weeks, and see what the plan misses.",
      conversationPrompt: "When did we last test our continuity plan rather than review it?",
      weekAction: "Schedule a 45-minute continuity walkthrough with your leadership team.",
    },
    inconsistent: {
      headline: "Capacity planning may be applied case by case.",
      suggests: "Your answers suggest planning happens sometimes, but not as a reliable habit.",
      explore: "What determines whether a new commitment gets a capacity check?",
      action: "Agree one trigger — a size, a funder type, a new hire — that always requires a capacity review.",
      conversationPrompt: "What size of commitment should always trigger a capacity conversation?",
      weekAction: "Agree and write down one trigger that always requires a capacity review.",
    },
    friction: {
      headline: "Continuity may depend on individual memory.",
      suggests:
        "Your answers suggest essential work, planning or resourcing may be held informally or not in place.",
      explore: "What work would stall first if one person were unavailable?",
      action: "Document one essential recurring task, identify a backup and test whether the instructions are usable.",
      conversationPrompt: "What single absence would disrupt us most, and what would we do first?",
      weekAction: "Write usable instructions for one essential recurring task and have someone else follow them.",
    },
    uncertain: {
      headline: "Capacity is an area worth confirming.",
      suggests:
        "Several capacity answers were 'I'm not sure'. These are questions to investigate before drawing conclusions.",
      explore: "Who would know what our continuity and contingency arrangements currently are?",
      action: "Ask your operations or finance lead what exists today, and write down what you learn.",
      conversationPrompt: "What do we actually have in place for continuity — and where is it written?",
      weekAction: "Ask one colleague to show you any existing continuity or contingency documentation.",
    },
    mixed: {
      headline: "Capacity holds in some places and thins in others.",
      suggests: "Parts of your operation are well supported while others rely on individual effort.",
      explore: "Which part of delivery is closest to its limit right now?",
      action: "Identify the single most stretched function and decide whether to resource it or reduce its scope.",
      conversationPrompt: "Which function is closest to its limit, and what would relieve it fastest?",
      weekAction: "Name the most stretched function and list two realistic ways to relieve it.",
    },
  },
  compliance: {
    strength: {
      headline: "Governance practice appears to match governance paperwork.",
      suggests: "You reported review rhythms, documented controls and active policy use.",
      explore: "Would an outside reviewer find the same picture your answers describe?",
      action: "Pick one policy and trace a real decision through it end to end to confirm the documentation holds.",
      conversationPrompt: "If a funder asked for evidence tomorrow, what would take us longest to produce?",
      weekAction: "Trace one recent decision through the relevant policy and check the documentation exists.",
    },
    inconsistent: {
      headline: "Governance policies may need a practical review.",
      suggests: "Your answers suggest policies exist but are not applied or reviewed on a consistent rhythm.",
      explore: "Which policy gets used in practice, and which only exists on paper?",
      action: "Identify the owner and most recent review date for one important policy, then schedule its next review.",
      conversationPrompt: "Which policies do we actually use, and which have we not opened in years?",
      weekAction: "List your key governance policies with their owner and last review date.",
    },
    friction: {
      headline: "Governance practice may need a practical review.",
      suggests:
        "Your answers suggest several governance or compliance practices are informal or not currently in place. This reflects your answers, not a legal finding.",
      explore: "Which policy matters most to your current work, and who owns it?",
      action: "Identify the owner and most recent review date for one important policy, then agree the next step with your board.",
      conversationPrompt: "Who owns our governance policies, and when did we last review them together?",
      weekAction: "Find one key policy, note its owner and last review date, and add it to the next board agenda.",
    },
    uncertain: {
      headline: "Compliance is an area to investigate rather than assume.",
      suggests:
        "You selected 'I'm not sure' on several compliance questions. These are open questions, not confirmed problems.",
      explore: "Where are our governance documents kept, and who maintains them?",
      action: "Build a short inventory: policy name, owner, location, last review date. Leave unknowns visible.",
      conversationPrompt: "Do we have a single place where our governance documents live?",
      weekAction: "Start a one-page policy inventory and fill in what you can find this week.",
    },
    mixed: {
      headline: "Compliance practice is partly settled, partly informal.",
      suggests: "Some governance practices are steady while others depend on memory or individual attention.",
      explore: "Which compliance task would be hardest to evidence if asked today?",
      action: "Choose the least documented practice and write down how it currently works.",
      conversationPrompt: "Which governance obligation would be hardest for us to evidence right now?",
      weekAction: "Document how one governance practice currently works, exactly as it happens today.",
    },
  },
};

export interface OverallHeadline {
  headline: string;
  summary: string;
}

export const overallHeadlines: Record<string, OverallHeadline> = {
  strengths: {
    headline: "Your systems appear to be carrying the mission, not the other way around.",
    summary:
      "Based on your answers, most practices are consistently in place. The useful work now is maintenance and stress-testing rather than repair.",
  },
  uncertainty: {
    headline: "The clearest next step is finding out what's actually in place.",
    summary:
      "Several answers were 'I'm not sure'. That isn't a gap — it's a set of questions worth answering before deciding what to change.",
  },
  friction: {
    headline: "Some of the weight you're carrying is structural, not personal.",
    summary:
      "Your answers point to practices that depend on individuals or aren't yet in place. Each one is a design question, not a failure.",
  },
  mixed: {
    headline: "Real strengths, with a few places worth tightening.",
    summary:
      "Your answers show practices that hold well alongside a few that depend on individuals or timing.",
  },
};

export const resultsDisclaimer =
  "These results reflect your screening choices and repeat your written responses in your own words. The written responses are not automatically interpreted. This is not a verified institutional audit, legal review, or compliance determination.";

export const defaultConversationPrompts = [
  "What is one decision we should stop routing through a single person?",
  "What would we want documented before our next leadership transition?",
  "Which governance practice would we most want to review with fresh eyes?",
];
