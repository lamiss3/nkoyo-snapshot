import { problemById } from "./problem-bank.ts";
import { buildAdaptivePresentation } from "./result-content.ts";
import type { Answer, AssessmentQuestion, AssessmentSession, EvaluationRecord, ProblemId } from "./types.ts";
import type { ModelCallRow, TraceEventRow, TraceSessionRow } from "./trace-types.ts";

export interface ReportContact {
  email: string;
  first_name: string;
  organization: string | null;
  role_title: string | null;
  challenge: string | null;
  marketing_consent: boolean;
  created_at: string;
}
export interface SessionReportInput {
  session: Pick<TraceSessionRow, "session_id" | "snapshot" | "status" | "stage" | "created_at" | "updated_at" | "completed_at" | "last_error">;
  events: TraceEventRow[];
  calls: ModelCallRow[];
  contacts: ReportContact[];
}
export type ReportBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "details"; title: string; blocks: ReportBlock[] };
export interface ReportSection { title: string; blocks: ReportBlock[] }
export interface SessionReport { title: string; sections: ReportSection[] }

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const when = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC") : "Time not recorded";
const topic = (id: string) => id in problemById ? problemById[id as ProblemId].name : id;
const evidence: Record<string, string> = { supported: "Supported by the answers", possible: "Possible; needs checking", contradicted: "Evidence against this issue", insufficient_information: "Not enough information" };
const support = (item: EvaluationRecord["evaluations"][number]) => item.probabilities.supported + 0.5 * item.probabilities.possible;
const percent = (value: number) => `${Math.round(value * 100)}%`;
const p = (text: string): ReportBlock => ({ kind: "paragraph", text });
const list = (items: string[]): ReportBlock => ({ kind: "list", items });
const heading = (text: string): ReportBlock => ({ kind: "heading", text });

function answerText(question: AssessmentQuestion, answer?: Answer) {
  if (!answer) return "No answer saved yet.";
  const selections = answer.optionIds?.map((id) => question.options?.find((option) => option.id === id)?.text ?? `Unrecognized saved choice: ${id}`) ?? [];
  return [...selections, ...(answer.text?.trim() ? [answer.text] : [])].join("\n") || "No answer saved yet.";
}

function answerConfirmed(questionId: string, answer: Answer, input: SessionReportInput) {
  // Confirm the actual saved revision, not an earlier Next press for this question.
  return input.events.some((event) => {
    const payload = object(event.payload);
    if (event.event_type !== "advance_started" && !(event.event_type === "answer_confirmed" && payload['questionId'] === questionId)) return false;
    const answers = object(payload['snapshot'])['answers'];
    return Array.isArray(answers) && answers.some((item) => {
      const saved = object(item);
      return saved['questionId'] === questionId && saved['submittedAt'] === answer.submittedAt;
    });
  });
}

function questions(blocks: ReportBlock[], chosen: AssessmentQuestion[], input: SessionReportInput, session: AssessmentSession) {
  for (const question of chosen) {
    const number = session.questions.findIndex((item) => item.id === question.id) + 1;
    const answer = session.answers.find((item) => item.questionId === question.id);
    blocks.push(heading(`Q${number}. ${question.text}`));
    blocks.push(p(question.source === "generated" ? `Written by Gemini (${question.model ?? "model not recorded"}).` : question.source === "fallback" ? "Fixed backup question; Gemini wording was not used." : "Fixed question from the assessment question bank."));
    if (question.problemId) blocks.push(p(`Topic explored: ${topic(question.problemId)}.`));
    if (question.options?.length) blocks.push({ kind: "details", title: `Available choices (${question.options.length})`, blocks: [list(question.options.map((option) => option.text))] });
    const hasAnswer = Boolean(answer?.text?.trim() || answer?.optionIds?.length);
    blocks.push(p(hasAnswer ? `Respondent answer — ${answerConfirmed(question.id, answer!, input) ? "confirmed" : "saved draft; not yet confirmed"}. Saved ${when(answer!.submittedAt)}.` : "Respondent answer — waiting."));
    blocks.push({ kind: "quote", text: answerText(question, answer) });
  }
}

function reviewedAnswers(call: ModelCallRow): Record<string, unknown>[] {
  const request = object(call.request);
  if (call.provider === "jev") {
    const answers = object(request['state'])['respondentAnswers'];
    return Array.isArray(answers) ? answers.map(object) : [];
  }
  // The saved Gemini prompt has a JSON context followed by the writing instruction.
  const contents = Array.isArray(request['contents']) ? request['contents'] : [];
  const parts = object(contents[0])['parts'];
  const text = Array.isArray(parts) ? object(parts[0])['text'] : null;
  if (typeof text !== "string") return [];
  const prefix = "Assessment context (JSON): ";
  if (!text.startsWith(prefix)) return [];
  try {
    const context = object(JSON.parse(text.slice(prefix.length).split("\nWrite exactly")[0]!));
    return Array.isArray(context['responses']) ? context['responses'].map(object) : [];
  } catch { return []; }
}

function modelSteps(blocks: ReportBlock[], calls: ModelCallRow[]) {
  for (let index = 0; index < calls.length; index++) {
    const call = calls[index]!;
    blocks.push(heading(`${call.provider === "jev" ? "Jev evaluation" : "Gemini question writing"}${calls.length > 1 ? ` — attempt ${index + 1}` : ""}`));
    blocks.push(p(`Model: ${call.response_model ?? call.configured_model}. Started ${when(call.started_at)}. ${call.status === "succeeded" ? "Finished successfully." : call.status === "failed" ? "Failed; this attempt did not produce usable output." : "Started; no completed output saved yet."}${call.duration_ms !== null ? ` Time taken: ${(call.duration_ms / 1000).toFixed(1)} seconds.` : ""}`));
    blocks.push(p(call.provider === "jev" ? "Task: assess the evidence for each requested topic. The website's rules choose the next topics and calculate the result." : "Task: write neutral follow-up questions about the two selected topics. Gemini does not choose the topics or score the result."));
    const reviewed = reviewedAnswers(call);
    blocks.push(p(`Input: ${reviewed.length ? `${reviewed.length} saved answers. Open the model input below to see exactly what was sent in this attempt.` : "See the private technical log for the saved model request."}`));
    const inputBlocks: ReportBlock[] = [];
    for (const [index, answer] of reviewed.entries()) {
      inputBlocks.push(p(`Input ${index + 1}: ${String(answer['question'] ?? "Question not recorded")}`));
      const selected = Array.isArray(answer['selectedAnswers']) ? answer['selectedAnswers'].filter((value) => typeof value === "string") : [];
      inputBlocks.push({ kind: "quote", text: [...selected, ...(typeof answer['writtenAnswer'] === "string" && answer['writtenAnswer'] ? [answer['writtenAnswer']] : [])].join("\n") || "No response text recorded." });
    }
    if (inputBlocks.length) blocks.push({ kind: "details", title: `Model input (${reviewed.length} answers)`, blocks: inputBlocks });
    if (call.status !== "succeeded") {
      blocks.push(p(call.status === "failed" ? "Output: unavailable. A retry or a fixed backup may appear later in this report. The exact error and response remain in the technical log." : "Output: pending or interrupted. A started record alone does not prove a successful evaluation."));
      continue;
    }
    if (call.provider === "gemini") {
      const output = Array.isArray(call.output) ? call.output.filter((value) => typeof value === "string") as string[] : [];
      blocks.push(p("Output: the question wording returned by Gemini."), list(output.length ? output : ["No readable question output saved; see the technical log."]));
    } else {
      const output = object(call.output);
      const evaluations = Array.isArray(output['evaluations']) ? output['evaluations'] as EvaluationRecord["evaluations"] : [];
      blocks.push(p("Output: Jev's evidence assessment. Support is an internal ranking signal, not a probability that an organization has a problem."));
      blocks.push({ kind: "table", headers: ["Topic", "Evidence", "Support signal", ...(call.operation === "final" ? ["Impact signal", "Urgency signal"] : [])], rows: evaluations.map((item) => [topic(item.problemId), evidence[item.choice] ?? item.choice, percent(support(item)), ...(call.operation === "final" ? [item.impact === undefined ? "Not assessed" : percent(item.impact), item.urgency === undefined ? "Not assessed" : percent(item.urgency)] : [])]) });
    }
  }
}

/** A current document projected from existing private records. No new AI call,
 * duplicate storage, public link, or API credential is needed to read it. */
export function buildSessionReport(input: SessionReportInput): SessionReport {
  const session = input.session.snapshot as unknown as AssessmentSession;
  const sections: ReportSection[] = [];
  const info: ReportBlock[] = [list([
    `Session ID: ${input.session.session_id}`,
    `Status: ${{ active: "In progress", completed: "Completed", restarted: "Restarted; this session was left behind", error: "Needs a retry after an error" }[input.session.status]}`,
    `Started: ${when(input.session.created_at)}`,
    `Last saved activity: ${when(input.session.updated_at)}`,
    `Finished: ${input.session.completed_at ? when(input.session.completed_at) : "Not finished"}`,
    `Version: ${session.version}`,
  ]), p("Private report for Nkoyo. It reads the latest saved answers, provider calls and email requests. The open admin report refreshes every 10 seconds. A downloaded Markdown file is a copy at the time of download; it does not update itself.")];
  if (!input.contacts.length) info.push(p("Email: not provided. Name, organization and role: not provided. The current adaptive form asks only for an email after the result."));
  for (const contact of [...input.contacts].sort((a, b) => b.created_at.localeCompare(a.created_at))) info.push(list([
    `Email: ${contact.email}`,
    `Name: ${contact.first_name || "Not provided"}`,
    `Organization: ${contact.organization || "Not provided"}`,
    `Role: ${contact.role_title || "Not provided"}`,
    `Additional context: ${contact.challenge || "Not provided"}`,
    `Marketing permission: ${contact.marketing_consent ? "Opted in" : "Not opted in"}`,
    `Email request saved: ${when(contact.created_at)}`,
  ]));
  info.push(p("An email request means the address was captured; it does not mean a report email was sent. Saved drafts can change until the respondent confirms them. Only server-received activity appears here."));
  sections.push({ title: "Session and respondent", blocks: info });
  const calls = (provider: "jev" | "gemini", operation: string) => input.calls.filter((item) => item.provider === provider && item.operation === operation).sort((a, b) => a.started_at.localeCompare(b.started_at) || a.id.localeCompare(b.id));
  const decision = (round: string) => input.events.filter((item) => item.event_type === "candidates_selected" && object(item.payload)['round'] === round).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  const selected = (round: string) => {
    const value = object(decision(round)?.payload)['problemIds'];
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") as string[] : [];
  };
  const opening: ReportBlock[] = [p("The first four fixed questions collect an opening picture. Jev checks all 20 topics. The rules rank supported or possible topics using supported + half of possible, followed by topics with too little information; ties use topic ID. Up to four are selected for fixed probes.")];
  questions(opening, session.questions.slice(0, 4), input, session);
  modelSteps(opening, calls("jev", "initial"));
  const topFour = selected("initial");
  opening.push(p(topFour.length ? `Website decision: explore ${topFour.map(topic).join("; ")}.` : session.topFour.length ? `Topics recorded in saved session: ${session.topFour.map(topic).join("; ")}. Historical selection event was not recorded.` : "No next-topic selection recorded yet."));
  sections.push({ title: "Phase 1 — Opening picture (Q1–Q4)", blocks: opening });

  const probes = session.questions.filter((question) => question.problemId && question.source === "fixed");
  const validation: ReportBlock[] = [p("Four fixed probes normally test the selected topics. Jev then checks all 20 topics again using the accumulated answers. The same ranking rule selects up to two finalists. Their identities come from the website's rules, rather than Gemini.")];
  if (probes.length) questions(validation, probes, input, session); else validation.push(p("The probe questions have not been selected, or this assessment finished early."));
  modelSteps(validation, calls("jev", "validation"));
  const finalists = selected("validation");
  validation.push(p(finalists.length ? `Website decision: investigate ${finalists.map(topic).join("; ")}.` : session.finalists ? `Finalists recorded in saved session: ${session.finalists.map(topic).join("; ")}. Historical selection event was not recorded.` : "No finalist selection recorded yet."));
  sections.push({ title: "Phase 2 — Check the likely issues (Q5–Q8)", blocks: validation });

  const deeper: ReportBlock[] = [p("Gemini writes Q9 to explore whether the two issues connect. After the answer, Jev reassesses those two topics. Gemini then writes Q10 and Q11 to explore each separately. After both answers, Jev assesses evidence, impact and urgency for the final result.")];
  modelSteps(deeper, calls("gemini", "bridge"));
  questions(deeper, session.questions.filter((question) => question.id === "q9"), input, session);
  modelSteps(deeper, calls("jev", "bridge"));
  modelSteps(deeper, calls("gemini", "finalists"));
  questions(deeper, session.questions.filter((question) => question.id === "q10" || question.id === "q11"), input, session);
  modelSteps(deeper, calls("jev", "final"));
  if (!session.questions.some((question) => question.id === "q9")) deeper.push(p("No deeper questions recorded. This phase may still be ahead, or the assessment may have finished early."));
  const fallbackEvents = input.events.filter((item) => item.event_type === "generation_failed");
  if (fallbackEvents.length) deeper.push(p(`${fallbackEvents.length} question-generation failure(s) were recorded. Questions labelled fixed backup use predefined wording.`));
  sections.push({ title: "Phase 3 — Understand the connection and impact (Q9–Q11)", blocks: deeper });

  const result: ReportBlock[] = [];
  if (session.result) {
    const presentation = buildAdaptivePresentation(session);
    result.push(heading(presentation.headline), p(presentation.summary));
    result.push(p(session.result.priority.length ? `Priority for discussion: ${session.result.priority.map(topic).join("; ")}.` : "No priority topic was established from the available evidence."));
    for (const insight of presentation.insights) result.push(heading(insight.title), p(`Area: ${insight.dimension}.`), p(insight.meaning), p(`Evidence: ${insight.evidence}`), p(`Explore: ${insight.explore}`), p(`Suggested next step: ${insight.action}`));
    result.push(list(Object.entries(session.result.threeCShare).map(([dimension, share]) => `${dimension[0]!.toUpperCase() + dimension.slice(1)}: ${share}%`)), p("The three percentages are a relative share of modeled pressure, not a validated organizational score or diagnosis."));
    result.push(p(session.evaluations.some((item) => item.round === "final") ? "Website calculation: priority = 45% support + 35% impact + 20% urgency. Only supported or possible topics qualify. If two qualifying priorities are within 0.05, both are prioritised. The three-C distribution also uses the wider validation evidence." : "This assessment finished early. No impact or urgency evaluation was made. With no supported or possible issue, it ends without a finding; if one candidate remains after probes, that topic is returned without a final scoring round."));
    result.push(p(`Starting action: ${presentation.startingAction}`), list(presentation.prompts.map((prompt) => `Discussion question: ${prompt}`)));
  } else result.push(p("No final result yet. The report retains all saved work even if the respondent stops or a provider fails."));
  if (input.session.last_error) result.push(p("The latest saved state includes an error. Review the technical log for details; a successful retry can continue the session."));
  const serverRounds = new Set(input.calls.filter((item) => item.provider === "jev" && item.status === "succeeded").map((item) => item.operation));
  const recovered = session.evaluations.filter((item) => !serverRounds.has(item.round));
  if (recovered.length) result.push(p(`Some evaluations exist only in the saved session (${recovered.map((item) => `${item.round}: ${item.model}`).join("; ")}). Their historical provider requests were not captured; this report cannot recreate them.`));
  sections.push({ title: "Final result and next conversation", blocks: result });
  return { title: "Nkoyo assessment session report", sections };
}

// Escape untrusted respondent/model text so importing into Notion cannot turn it
// into HTML, links, headings or instructions disguised as document formatting.
const md = (value: string) => value.replace(/\\/g, "\\\\").replace(/[`*_{}\[\]()#|>~]/g, "\\$&").replace(/(^|\n)(\s*)([-+]|\d+\.)\s/g, "$1$2\\$3 ").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function sessionReportMarkdown(report: SessionReport): string {
  const lines = [`# ${md(report.title)}`];
  function append(blocks: ReportBlock[]) {
    for (const block of blocks) {
      if (block.kind === "heading") lines.push(`### ${md(block.text)}`);
      else if (block.kind === "paragraph") lines.push(md(block.text));
      else if (block.kind === "quote") lines.push(block.text.split(/\r?\n/).map((line) => `> ${md(line)}`).join("\n"));
      else if (block.kind === "list") lines.push(block.items.map((item) => `- ${md(item).replace(/\r?\n/g, "\n  ")}`).join("\n"));
      else if (block.kind === "details") { lines.push(`**${md(block.title)}**`); append(block.blocks); }
      else lines.push(`| ${block.headers.map(md).join(" | ")} |\n| ${block.headers.map(() => "---").join(" | ")} |\n${block.rows.map((row) => `| ${row.map((cell) => md(cell).replace(/\r?\n/g, " ")).join(" | ")} |`).join("\n")}`);
    }
  }
  for (const section of report.sections) {
    lines.push(`## ${md(section.title)}`);
    append(section.blocks);
  }
  return lines.join("\n\n") + "\n";
}
