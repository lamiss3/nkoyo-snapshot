# Snapshot email journey v3 — local implementation guide

**Follow-up writing revision:** see [writing changes and actual generation review](nkoyo-email-v3-writing-review.md). That revision adds topic observation tools, plain-language instructions and version-specific scope copy. One authorized real request to the locally configured Gemini model returned HTTP 503; its failure and fictional inputs are retained. No emails were produced or sent. The sections below record the initial v3 structural implementation and its original checks/manual sample; they are not evidence of a successful live generation.

This revision is implemented locally against repository release `1ed8617`. It has not been deployed or tested against live AI, Kit or production records. It replaces the earlier shared-answer/report → awareness → explanation → Day 7 experiment → secondary-finding editorial structure.

## Reader progression and canonical contract

All five emails are generated in **one request**, before any send. Every message must work whether the reader has read or acted on the previous one. There is no reply ingestion or send-time regeneration.

`src/assessment-v2/email-contract.ts` owns the v3 purposes, ordered section roles, writing targets, acceptance bounds and editorial instructions. Provider schema variants, the prompt, runtime counts, staff labels and exports derive from these definitions. Section roles are **positional**, not added fields: headings stay reader-friendly. Software checks count/order assignments; it cannot establish that the prose actually performs each section's job.

| Email | Timing               | Purpose / practical contribution                                                              | Ordered section roles                                                                      | Target paragraph words | Normal accepted words | Sparse minimum |
| ----- | -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------- | --------------------- | -------------- |
| 1     | Report when prepared | `detailed_report`: finding, plausible mechanism, uncertainty and one useful first check       | `result_summary`, `evidence_and_interpretation`, `secondary_or_uncertainty`, `first_check` | 300–450                | 120–600               | 60             |
| 2     | Day 2                | `obstacle_distinction`: clues that distinguish explanations leading to different actions      | `explanations_to_distinguish`, `observable_clues`, `one_observation`                       | 160–240                | 70–330                | 40             |
| 3     | Day 4                | `bounded_test`: develop the same first check into an executable bounded test                  | `question_and_scope`, `test_method`, `what_to_record`                                      | 180–280                | 80–380                | 40             |
| 4     | Day 7                | `result_interpretation`: different possible outcomes, limited interpretations and adjustments | `interpretation_frame`, `outcome_branches`, `smallest_next_adjustment`                     | 180–280                | 80–380                | 40             |
| 5     | Day 10               | `next_decision`: internal next step versus a useful conversation with Nkoyo                   | `unresolved_decision`, `connection_or_boundary`, `next_step_criteria`                      | 160–260                | 70–360                | 40             |

Writing targets are editorial guidance, not an instruction to pad. Acceptance minima are deliberately lower. Sparse evidence means fewer than two usable answers, no primary finding, or usable answers consisting only of hypothetical matches. Maxima remain the normal maxima. Counts cover paragraph text, excluding headings, mainAction, previews and website framing.

The request also supplies explicit per-email `paragraphWordRequirements`, derived from these same targets and the applicable normal/sparse bounds. The writer is instructed to check them privately before returning and develop a useful step rather than add filler. Runtime validation remains authoritative; a length failure reports the email number, actual paragraph word count and accepted range without exposing respondent text. Prompt self-checks do not guarantee model compliance.

## Topic and evidence input

Topic selection is unchanged: retain saved `supported`/`possible` results, prioritize topics in the saved priority list, then sort by `prioritySignal`. The first two are the primary and secondary metadata; joint priorities retain their flag. No scores or priority order are re-evaluated by the writer.

For v3, **all five focus IDs are the primary ID**, or null without a primary. Email 5 now serves the unresolved decision rather than being assigned to the secondary topic by position. It may discuss relevant secondary evidence, qualified by its actual saved label. The secondary guide is context, not mandatory content. V1/v2 retain their original fifth-slot focus and purposes.

`email-topic-guides.ts` adds compact advisory guidance for every one of the existing 20 topics: two plausible explanations and their observable clues, a first check and its observation, a bounded test, two different result interpretations/next steps, and limits. The existing topic meaning/headline/exploration/action remains the base. Only the selected guides are sent. The catalog offers hypotheses, not research findings, diagnoses, legal conclusions or claims of Nkoyo expertise.

The writer receives primary/secondary IDs, jointPriority, selected topic labels/evidence/explanation/guides, optional three-C context, saved response wording/choice labels, answerMode, an evidence-use note, prescribed slots, sparseEvidence and omitted-answer count. It does **not** receive a contact record, recipient address, credentials, trace token or raw Jev API logs. Respondent text remains untrusted input and can itself contain identifying information; output instructions are not input redaction.

Skipped answers are omitted and cannot be cited. Neutral/unknown choices are marked uncertain rather than confirmed. Scenario labels are identified as hypothetical matches. Ordinary answers carry an instruction to preserve their wording, tense and frequency; the application does not infer whether a statement is a verified event. Contradictory/weak answers must qualify the prose even when metadata retains a finding.

V3 does not send or require `threadQuestionId`, nor require one answer in every message. That optional property survives in the legacy type/brief for saved compatibility. Relevant evidence references are still required in each email when answers exist; generic sections may have empty reference lists. Continuity should come from a coherent evolving test, not repeated quotations.

## Request, schema and runtime validation

The provider selection, credentials, token cap, timeout and logging are unchanged. Both direct Gemini and Gemini through OpenRouter use the same new system/user instructions. OpenRouter email requests use `response_format: { type: "json_object" }`: the routed Gemini schema-enforcement path returned HTTP 400 INVALID_ARGUMENT with both the original five-variant schema and a compact shared schema. The compact reference schema remains derived from the contract, but is not sent for email JSON mode. Assessment-question requests retain their existing strict JSON-schema format. The unchanged runtime validator still enforces each email slot's exact number, purpose, focus, section count, array order, source references, lengths, plain text and leakage checks before saving anything. JSON mode by itself only establishes JSON syntax, not contract conformance. No model output is accepted merely because it parses. No new provider, automatic substitute text or delivery system is introduced.

The format is unchanged: each email has `number`, `purpose`, `focusId`, `subject`, `preview`, `mainAction`, `sections`; sections have `heading`, `paragraphs[]`, `sourceQuestionIds[]`. V3 requires one mainAction and rejects extra fields. It rejects wrong types/order/focus/purposes/counts, missing or skipped references, out-of-range lengths, HTML/Liquid/recognizable Markdown/URLs, duplicate subject/action strings, identical full bodies, repeated long sentences within a section and a verbatim mainAction duplicated as a paragraph.

Known question/probe IDs, selected topic IDs and targeted internal fragments/role names are rejected in customer fields, **including mainAction**. This is rejection, not destructive text removal. Exact known tokens distinguish `q4` from ordinary `Q4 planning`; the word “liquid” is not treated as a Liquid expression. These checks are format/leakage protection, not a general factual or semantic classifier.

`email-validation.ts` provides the same `validateEmailJourneyOutput` path used by the real writer and local fictional sample through `buildEmailJourney`. Provider response and validation errors remain failures in private logs and use the existing bounded queue retries. The old repeated automatic scenario-qualification insertion is removed for new v3 output: the prompt must preserve hypothetical scope naturally without forcing identical caveats into every message. That semantic fidelity needs editorial review; the validator does not prove it.

## Rendering and saved-content compatibility

The new saved version is `email-journey-v3`. V1/v2 remain readable and retain their historical purpose mappings and renderer behavior; golden fixtures compare exact HTML, text, staff Markdown and both consent modes' Kit payloads. Unknown versions are rejected. Saved content is not run through the v3 generator or validator on read/send.

New previews promise the obstacle distinction, bounded test, possible results and next decision, with an evidence-gathering variant when no primary exists. They never promise an unsupported “other finding”. Report-only Kit rendering removes the first preview because follow-ups require separate consent.

The existing renderer still owns greeting, signature, report scope note and approved contact destination. Kit still owns its unsubscribe/footer and sender settings. V3 renders mainAction once; in Email 5 the **same action text is the approved mailto link**, with no second fixed “Discuss…” CTA. Text/Markdown place the destination alongside that one action. Legacy invitations stay unchanged. Model strings remain escaped.

Staff Admin uses the saved version's labels, marks v3's different progression and shows ordered section-role/evidence metadata. Staff Markdown labels that metadata separately; customer HTML/text excludes it. The existing explicit fixed-template staff delivery test intentionally remains v2 and is labelled as such; it is excluded from automatic sending. The new v3 fictional review sample is not a replacement or fallback email generator.

`email_journeys.content` is JSONB. Migrations `0002`/`0003` check the five-email count and session ID, not individual purpose values. **No migration is needed or applied.** The claim query requires `content IS NULL`, preserving successful-journey reuse. Consent, private single-recipient targeting, offsets `[0,2,4,7,10]`, leases, retries, credentials, delivery switches and already scheduled messages are unchanged.

Staff `generate` recovery now also invokes the existing `processAutomaticKitJob` for that specific job when global automatic delivery is enabled, matching the visitor preparation path. The helper still verifies the job's own automatic flag, saved content, consent and private recipient state. This avoids holding a successfully recovered automatic request behind its previous generation-backoff time; review-only jobs and already scheduled messages retain their existing guards. No new delivery mechanism or database migration is introduced.

## Local verification and editorial review

Run the local-only sample builder:

```powershell
node --experimental-strip-types scripts/preview-email-v3.mjs
```

It uses invented answers and manually written copy, passes the same structural validator, and writes [staff Markdown](examples/snapshot-email-v3-fictional.md), [customer HTML preview](examples/snapshot-email-v3-fictional.html), [structured journey](examples/snapshot-email-v3-fictional.json), and the [exact current system prompt](examples/snapshot-email-v3-system-prompt.md). It loads no credentials and makes no network call or send. These are editorial artifacts, not proof of model quality.

The fictional approval case follows one request: trace its first wait → distinguish missing information from unclear authority → test a complete handoff and agreed route → interpret movement, returned inputs or disputed authority differently → decide on an internal change or outside perspective. Email 4 includes an entry point for someone who has not started. This is a human editorial judgment about this one sample, not an automated guarantee about future generations.

Tests cover v3 contracts/schema/lengths/references/leakage, all 20 guide entries, sparse/null/joint/contradictory/hypothetical input metadata, mock provider calls and failed validation, single-CTA safe rendering, report-only eligibility, and exact v1/v2 fixtures. Syntax/type/build checks cannot prove source-faithful interpretation, distinct practical benefits, test coherence or persuasive copy. No live AI generation, delivery, Kit/subscriber change, production mutation or deployment was used to validate this revision.

### Completed local checks — initial structural revision

- TypeScript: `tsc --noEmit` passed.
- Complete repository test suite: **61 passed, 0 failed**, including 14 focused email-journey tests and mocked provider/delivery tests.
- Production compilation: `NITRO_PRESET=vercel vite build` passed locally. Compilation did not deploy the application.
- ESLint on all changed executable source, scripts and tests: passed. Full maintained-source lint remains blocked by existing repository debt: the unchanged baseline and revised source each reported 1,692 errors. Unrelated lint failures were not changed.
- Fictional sample: accepted by the same runtime validator; paragraph word counts **305, 177, 183, 205, 184**, within all five writing targets. No live model was used.

These checks establish contract conformance for the tested fixtures, buildability, and the specific compatibility/consent assertions. They do not establish live provider reliability, deliverability, or the factual and editorial quality of future generated emails. The sample needs human review for tone, usefulness, conditional interpretation and continuity.

### Changed-file manifest

All paths below are relative to the repository root.

| Area                                               | Files                                                                                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical contract, topic advice, validation (new) | `src/assessment-v2/email-contract.ts`, `src/assessment-v2/email-topic-guides.ts`, `src/assessment-v2/email-validation.ts`                                                                              |
| Brief, generation, rendering and legacy fixed test | `src/assessment-v2/email-journey.ts`, `src/assessment-v2/email-journey.server.ts`, `src/assessment-v2/email-journey-fixed.ts`                                                                          |
| Staff display                                      | `src/components/snapshot/EmailJourneyPanel.tsx`                                                                                                                                                        |
| Tests                                              | `tests/assessment-v2-email-journey.test.mjs`, `tests/assessment-v2-email-jobs.test.mjs`, `tests/assessment-v2-openrouter.test.mjs`                                                                     |
| Fictional and historical fixtures (new)            | `tests/fixtures/email-v3-fictional.mjs`, `tests/fixtures/email-journey-legacy.json`                                                                                                                    |
| Local sample builder (new)                         | `scripts/preview-email-v3.mjs`                                                                                                                                                                         |
| Guides                                             | `docs/nkoyo-email-generation-v3.md` (new), `docs/nkoyo-personalized-email-journey.md`                                                                                                                  |
| Generated review artifacts (new)                   | `docs/examples/snapshot-email-v3-fictional.md`, `docs/examples/snapshot-email-v3-fictional.json`, `docs/examples/snapshot-email-v3-fictional.html`, `docs/examples/snapshot-email-v3-system-prompt.md` |

No database migration was prepared because the existing JSONB persistence accepts the v3 contract without a schema change. No deployment, send, live generation, Kit upload, subscriber change or production update is part of this revision.
