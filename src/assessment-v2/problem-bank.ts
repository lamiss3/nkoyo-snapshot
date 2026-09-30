import type { ProblemDefinition, ProblemId } from "./types.ts";

/** Draft probes from the 20-problem question bank. IDs stay stable even when
 * a question is shown in a different Q5–Q8 slot. */
export const problemBank: readonly ProblemDefinition[] = [
  {
    "id": "P01",
    "name": "Short funding cycles",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "compliance"
    ],
    "probe": {
      "id": "probe_p01",
      "kind": "single",
      "text": "How do the timing and duration of your grants affect commitments such as staffing and service delivery?",
      "source": "fixed",
      "problemId": "P01",
      "options": [
        {
          "id": "option_1",
          "text": "Funding arrangements let us plan and maintain those commitments."
        },
        {
          "id": "option_2",
          "text": "Funding creates some uncertainty, but we usually maintain commitments without major changes."
        },
        {
          "id": "option_3",
          "text": "Short grants or uncertain renewals repeatedly make us postpone or revise commitments."
        },
        {
          "id": "option_4",
          "text": "Gaps or funding endings have forced us to interrupt services or staffing."
        },
        {
          "id": "option_5",
          "text": "We do not rely on grants."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P02",
    "name": "Restricted funding",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "compliance"
    ],
    "probe": {
      "id": "probe_p02",
      "kind": "single",
      "text": "How well does your available funding cover the support needed to keep programs running, such as administration, systems, and reserves?",
      "source": "fixed",
      "problemId": "P02",
      "options": [
        {
          "id": "option_1",
          "text": "Funding covers both program delivery and the support it needs."
        },
        {
          "id": "option_2",
          "text": "Some support costs are difficult to fund, but restrictions on funding are not the main reason."
        },
        {
          "id": "option_3",
          "text": "We receive program funding, but restrictions regularly leave essential support costs uncovered."
        },
        {
          "id": "option_4",
          "text": "We have had to weaken essential support or use reserves because available funding cannot cover those costs."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P03",
    "name": "Decision bottleneck",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "culture"
    ],
    "probe": {
      "id": "probe_p03",
      "kind": "single",
      "text": "What usually happens when someone needs a routine decision made within their area of work?",
      "source": "fixed",
      "problemId": "P03",
      "options": [
        {
          "id": "option_1",
          "text": "They decide within clear limits and move forward."
        },
        {
          "id": "option_2",
          "text": "Senior leadership handles only decisions that genuinely require its authority or judgment."
        },
        {
          "id": "option_3",
          "text": "Routine decisions often reach senior leadership because people are unclear about what they can decide."
        },
        {
          "id": "option_4",
          "text": "Routine decisions require senior approval, and work regularly waits for it."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P04",
    "name": "Responsibility without authority",
    "primaryDimension": "culture",
    "relatedDimensions": [
      "capacity",
      "compliance"
    ],
    "probe": {
      "id": "probe_p04",
      "kind": "single",
      "text": "How well does people’s decision-making authority match the results they are expected to deliver?",
      "source": "fixed",
      "problemId": "P04",
      "options": [
        {
          "id": "option_1",
          "text": "People can make the decisions needed to deliver the results they own."
        },
        {
          "id": "option_2",
          "text": "Some decisions require approval, but approval is timely and rarely prevents delivery."
        },
        {
          "id": "option_3",
          "text": "People sometimes own a result but cannot make a necessary decision or adjust the resources involved."
        },
        {
          "id": "option_4",
          "text": "This mismatch repeatedly prevents people from delivering results they are held accountable for."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P05",
    "name": "Board and staff boundaries",
    "primaryDimension": "compliance",
    "relatedDimensions": [
      "culture"
    ],
    "probe": {
      "id": "probe_p05",
      "kind": "single",
      "text": "How clear are the boundaries between board oversight and the decisions made by executives or staff?",
      "source": "fixed",
      "problemId": "P05",
      "options": [
        {
          "id": "option_1",
          "text": "The boundaries are clear and generally respected."
        },
        {
          "id": "option_2",
          "text": "Occasional overlap occurs, but we resolve it without disrupting work."
        },
        {
          "id": "option_3",
          "text": "People regularly disagree about which decisions belong to the board, executives, or staff."
        },
        {
          "id": "option_4",
          "text": "Board involvement or unclear boundaries repeatedly delay, reopen, or override operational decisions."
        },
        {
          "id": "option_5",
          "text": "We do not have a board or equivalent governing body."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P06",
    "name": "Values and everyday practice",
    "primaryDimension": "culture",
    "relatedDimensions": [
      "compliance"
    ],
    "probe": {
      "id": "probe_p06",
      "kind": "single",
      "text": "When your organization agrees to a principle such as trust, flexibility, or shared responsibility, what happens in everyday work?",
      "source": "fixed",
      "problemId": "P06",
      "options": [
        {
          "id": "option_1",
          "text": "Relevant rules and routines are reviewed and changed where needed."
        },
        {
          "id": "option_2",
          "text": "Changes are underway, and the remaining gaps are acknowledged."
        },
        {
          "id": "option_3",
          "text": "The principle is communicated, but conflicting rules or routines often remain."
        },
        {
          "id": "option_4",
          "text": "People repeatedly experience practices that contradict the principle."
        },
        {
          "id": "option_5",
          "text": "We have not made or reviewed a relevant commitment recently."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P07",
    "name": "Demand exceeding capacity",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "culture"
    ],
    "probe": {
      "id": "probe_p07",
      "kind": "single",
      "text": "How well can your organization meet current demand for its services with the resources available?",
      "source": "fixed",
      "problemId": "P07",
      "options": [
        {
          "id": "option_1",
          "text": "We can meet demand reliably within sustainable workloads."
        },
        {
          "id": "option_2",
          "text": "Demand sometimes exceeds capacity, but temporary adjustments are enough."
        },
        {
          "id": "option_3",
          "text": "Demand regularly exceeds capacity, creating backlogs, extra work, or reduced access."
        },
        {
          "id": "option_4",
          "text": "We are unable to meet significant demand, or service quality is becoming difficult to protect."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P08",
    "name": "Expansion outgrowing the operating model",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "culture",
      "compliance"
    ],
    "probe": {
      "id": "probe_p08",
      "kind": "single",
      "text": "Since adding programs, locations, partnerships, or other activities, how well have your working arrangements supported the larger organization?",
      "source": "fixed",
      "problemId": "P08",
      "options": [
        {
          "id": "option_1",
          "text": "Roles, processes, and coordination have adapted and generally work well."
        },
        {
          "id": "option_2",
          "text": "Some adjustments are still needed, but the main arrangements work."
        },
        {
          "id": "option_3",
          "text": "Arrangements that worked at our previous size now create repeated confusion, duplication, or delays."
        },
        {
          "id": "option_4",
          "text": "Expansion is substantially disrupted because roles, processes, or coordination have not adapted."
        },
        {
          "id": "option_5",
          "text": "We have not expanded in a relevant way."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P09",
    "name": "Persistent workload and emotional strain",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "culture"
    ],
    "probe": {
      "id": "probe_p09",
      "kind": "single",
      "text": "Which description best matches the pressure your team has been experiencing?",
      "source": "fixed",
      "problemId": "P09",
      "options": [
        {
          "id": "option_1",
          "text": "Work is generally manageable, with occasional busy periods."
        },
        {
          "id": "option_2",
          "text": "Busy periods are demanding, but people usually recover when they end."
        },
        {
          "id": "option_3",
          "text": "The same workload or emotional pressure returns repeatedly, with little opportunity to recover."
        },
        {
          "id": "option_4",
          "text": "Persistent pressure is affecting people’s ability to work, wellbeing, or willingness to stay."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P10",
    "name": "Vacancies and recurring overload",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "culture"
    ],
    "probe": {
      "id": "probe_p10",
      "kind": "single",
      "text": "How have vacancies or staff departures affected the people who remain?",
      "source": "fixed",
      "problemId": "P10",
      "options": [
        {
          "id": "option_1",
          "text": "We have had no significant staffing gaps."
        },
        {
          "id": "option_2",
          "text": "Gaps have been temporary, and work was covered without sustained overload."
        },
        {
          "id": "option_3",
          "text": "Remaining staff repeatedly absorb additional work while roles stay vacant or replacements settle in."
        },
        {
          "id": "option_4",
          "text": "Staffing gaps and departures keep feeding a cycle of overload and further instability."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P11",
    "name": "Ownership of changing requirements",
    "primaryDimension": "compliance",
    "relatedDimensions": [
      "capacity"
    ],
    "probe": {
      "id": "probe_p11",
      "kind": "single",
      "text": "When a legal, regulatory, funder, or other formal requirement changes, how does your organization handle it?",
      "source": "fixed",
      "problemId": "P11",
      "options": [
        {
          "id": "option_1",
          "text": "A clear owner identifies what applies, assigns changes, and checks completion."
        },
        {
          "id": "option_2",
          "text": "Ownership is clear, but implementation or checking sometimes falls behind."
        },
        {
          "id": "option_3",
          "text": "People know a change is needed, but ownership or the practical next steps are often unclear."
        },
        {
          "id": "option_4",
          "text": "Changes have been missed or left incomplete because responsibility was unclear."
        },
        {
          "id": "option_5",
          "text": "I have not observed this process."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P12",
    "name": "Preparation for disruption",
    "primaryDimension": "compliance",
    "relatedDimensions": [
      "capacity"
    ],
    "probe": {
      "id": "probe_p12",
      "kind": "single",
      "text": "If a disruption affected normal operations, how clear are the arrangements for deciding, communicating, and keeping essential work going?",
      "source": "fixed",
      "problemId": "P12",
      "options": [
        {
          "id": "option_1",
          "text": "Arrangements are clear, accessible, and have been tested or used successfully."
        },
        {
          "id": "option_2",
          "text": "Arrangements exist, but some roles or practical steps remain untested or unclear."
        },
        {
          "id": "option_3",
          "text": "People would need to work out important responsibilities or communication routes during the disruption."
        },
        {
          "id": "option_4",
          "text": "A recent disruption exposed significant gaps that remain unresolved."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P13",
    "name": "Partnership decision rules",
    "primaryDimension": "compliance",
    "relatedDimensions": [
      "culture",
      "capacity"
    ],
    "probe": {
      "id": "probe_p13",
      "kind": "single",
      "text": "When your organization works with external partners, how are shared decisions and disagreements handled?",
      "source": "fixed",
      "problemId": "P13",
      "options": [
        {
          "id": "option_1",
          "text": "Agreed rules make authority, responsibilities, and dispute resolution clear."
        },
        {
          "id": "option_2",
          "text": "Some arrangements are informal, but partners usually resolve issues effectively."
        },
        {
          "id": "option_3",
          "text": "Partners share the goal, but regularly need to negotiate who decides or takes responsibility."
        },
        {
          "id": "option_4",
          "text": "Shared work has stalled or become disputed because decision or accountability rules are unclear."
        },
        {
          "id": "option_5",
          "text": "We are not involved in relevant partnerships."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P14",
    "name": "Duplicated funder reporting",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "compliance"
    ],
    "probe": {
      "id": "probe_p14",
      "kind": "single",
      "text": "How much repeated work do different funders’ reporting requirements create?",
      "source": "fixed",
      "problemId": "P14",
      "options": [
        {
          "id": "option_1",
          "text": "Reporting uses largely shared information and creates little duplication."
        },
        {
          "id": "option_2",
          "text": "Requirements differ, but we can adapt existing information without much extra work."
        },
        {
          "id": "option_3",
          "text": "Staff regularly recreate information or describe the same results in different formats."
        },
        {
          "id": "option_4",
          "text": "Conflicting metrics or repeated reporting consume substantial time and interfere with other work."
        },
        {
          "id": "option_5",
          "text": "We do not report to multiple funders."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P15",
    "name": "Late succession planning",
    "primaryDimension": "compliance",
    "relatedDimensions": [
      "capacity",
      "culture"
    ],
    "probe": {
      "id": "probe_p15",
      "kind": "single",
      "text": "For the most recent or currently anticipated senior leadership departure, when were coverage and transition arrangements agreed?",
      "source": "fixed",
      "problemId": "P15",
      "options": [
        {
          "id": "option_1",
          "text": "Arrangements were agreed well before the departure became urgent."
        },
        {
          "id": "option_2",
          "text": "Planning began with enough time, although some arrangements remained incomplete."
        },
        {
          "id": "option_3",
          "text": "The departure was approaching before essential coverage or transition arrangements were agreed."
        },
        {
          "id": "option_4",
          "text": "The departure happened, or is imminent, and essential arrangements are still unresolved."
        },
        {
          "id": "option_5",
          "text": "There is no recent or anticipated departure to assess."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P16",
    "name": "Knowledge concentrated in one person",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "culture",
      "compliance"
    ],
    "probe": {
      "id": "probe_p16",
      "kind": "single",
      "text": "If a key person became unavailable, how easily could others access the knowledge and relationship history needed to continue their work?",
      "source": "fixed",
      "problemId": "P16",
      "options": [
        {
          "id": "option_1",
          "text": "Others could continue using shared records, established relationships, and practical guidance."
        },
        {
          "id": "option_2",
          "text": "Most information is accessible, although some details would need to be reconstructed."
        },
        {
          "id": "option_3",
          "text": "Important knowledge or relationship history would be difficult to access without that person."
        },
        {
          "id": "option_4",
          "text": "Essential work would be seriously disrupted because that person holds knowledge others cannot readily recover."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P17",
    "name": "Conflicting team priorities",
    "primaryDimension": "culture",
    "relatedDimensions": [
      "capacity",
      "compliance"
    ],
    "probe": {
      "id": "probe_p17",
      "kind": "single",
      "text": "When teams compete for the same people, time, or money, how are their priorities reconciled?",
      "source": "fixed",
      "problemId": "P17",
      "options": [
        {
          "id": "option_1",
          "text": "Shared priorities guide the tradeoffs, and teams generally follow the decisions."
        },
        {
          "id": "option_2",
          "text": "Differences occur, but teams usually resolve them together."
        },
        {
          "id": "option_3",
          "text": "Teams often continue pursuing separate priorities without resolving the tradeoffs."
        },
        {
          "id": "option_4",
          "text": "Conflicting priorities repeatedly create duplicated work, disputes, or delays."
        },
        {
          "id": "option_5",
          "text": "We do not have distinct teams or programs to compare."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P18",
    "name": "Plans failing to influence daily work",
    "primaryDimension": "capacity",
    "relatedDimensions": [
      "culture"
    ],
    "probe": {
      "id": "probe_p18",
      "kind": "single",
      "text": "How does your agreed strategy or organizational plan affect everyday priorities and decisions?",
      "source": "fixed",
      "problemId": "P18",
      "options": [
        {
          "id": "option_1",
          "text": "It guides decisions through clear actions, owners, and regular review."
        },
        {
          "id": "option_2",
          "text": "It influences some work, although the connection is inconsistent."
        },
        {
          "id": "option_3",
          "text": "People know the plan, but urgent work usually determines what happens."
        },
        {
          "id": "option_4",
          "text": "Planning produces commitments that rarely change daily responsibilities, resource decisions, or routines."
        },
        {
          "id": "option_5",
          "text": "We do not currently have an agreed plan to assess."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P19",
    "name": "AI governance and accountability",
    "primaryDimension": "compliance",
    "relatedDimensions": [
      "capacity"
    ],
    "probe": {
      "id": "probe_p19",
      "kind": "single",
      "text": "For AI used in your organization’s work, how clear are the rules about permitted uses, information handling, review, and responsibility?",
      "source": "fixed",
      "problemId": "P19",
      "options": [
        {
          "id": "option_1",
          "text": "Rules are clear, and people follow the relevant review and accountability arrangements."
        },
        {
          "id": "option_2",
          "text": "Rules exist, but some uses or responsibilities remain unclear."
        },
        {
          "id": "option_3",
          "text": "People use AI, but important rules or review responsibilities have not been agreed."
        },
        {
          "id": "option_4",
          "text": "AI outputs or sensitive information are being used without the necessary agreed safeguards or accountable review."
        },
        {
          "id": "option_5",
          "text": "AI is not currently used in our work."
        },
        {
          "id": "option_6",
          "text": "I’m not sure."
        }
      ]
    }
  },
  {
    "id": "P20",
    "name": "Technology skills and support",
    "primaryDimension": "capacity",
    "relatedDimensions": [],
    "probe": {
      "id": "probe_p20",
      "kind": "single",
      "text": "How reliably can staff use the technology your organization expects them to use?",
      "source": "fixed",
      "problemId": "P20",
      "options": [
        {
          "id": "option_1",
          "text": "Staff have the skills, support, and working processes needed."
        },
        {
          "id": "option_2",
          "text": "Some people need additional help, but work generally continues reliably."
        },
        {
          "id": "option_3",
          "text": "Missing training, support, or workflow guidance regularly makes tools difficult to use."
        },
        {
          "id": "option_4",
          "text": "Important work is disrupted or depends on one person because others lack the skills or support needed."
        },
        {
          "id": "option_5",
          "text": "I’m not sure."
        }
      ]
    }
  }
];

export const problemById: Record<ProblemId, ProblemDefinition> = Object.fromEntries(
  problemBank.map((problem) => [problem.id, problem]),
) as Record<ProblemId, ProblemDefinition>;
