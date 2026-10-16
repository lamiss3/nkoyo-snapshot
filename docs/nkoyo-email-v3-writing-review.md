# Snapshot v3 writing revision and isolated generation review

## Implemented changes

The five-slot v3 contract, structured fields and acceptance bounds are unchanged. This follow-up updates the actual generator, topic guidance and renderer, rather than polishing the old manual example.

- **Voice:** the system prompt tells the writer to apply evidence/safety rules internally, without telling the recipient about writing-time constraints or model precautions. It asks for everyday words, concrete verbs and one material uncertainty near the relevant claim. This is guidance, not a semantic guarantee.
- **Progression:** Email 1 gives an interpretation and small first check; Email 2 must add a new observation tool; Email 3 tests one practical change informed by that observation; Email 4 interprets different possible outcomes; Email 5 helps decide the next internal step or useful conversation.
- **All 20 topics:** each selected advisory guide now includes an `obstacleTool` with an action, what to record and how that changes the next decision. The purchasing guide traces a past request, separates preparation/waiting/corrections, then tests one change on a comparable request. Other topics have different tools, such as matching reporting definitions, tracing a requirement's missing link, or locating a backup's first blocked step. Only selected guides enter the request.
- **Email 4:** the prompt requires two or three separate short `paragraphs[]` entries in its existing outcome section. Each pairs an observed result, limited interpretation and different next step. The existing renderer already preserves paragraph boundaries; a focused test verifies this. No brittle keyword rule or new schema restriction is used to claim good reasoning.
- **Customer framing:** v3 uses the brief scope note, “This Snapshot offers a starting point based on your answers. It is not a diagnosis or a verified audit.” It does not explain three-C percentages that the report is not required to show. Renderer functions accept an explicit saved journey version; Kit rendering and staff Markdown supply it. Default rendering remains historical for compatibility. V3 next-email copy uses plain words such as “one small change to try”.

The approved Email 5 route and one mainAction remain intact. Evidence references remain staff metadata. Consent/report-only behavior, offsets, queue/retry behavior, saved-content reuse, provider/model selection, escaping, sender/footer ownership and delivery controls have not changed. No migration was necessary. No saved journey or schedule was rewritten, and nothing was deployed or sent.

## One authorized real request: failed at the provider

The isolated development harness used the repository's local `.env` through Node's `--env-file`, then the application's `geminiConfigFromEnv("email")`. The selected configuration was **direct Google Gemini, `gemini-3.6-flash`**, not OpenRouter. Credentials were present but never printed or saved. No provider, model or production configuration was changed to make this test work.

Exactly **one POST** was attempted, with all five emails in the normal generation request. Google responded:

```json
{
  "code": 503,
  "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
  "status": "UNAVAILABLE"
}
```

There was no model email text, so no structured journey or customer-rendered sequence could be retained. The application raised `Gemini request failed (503)`. No retry, alternate provider, fallback copy or handwritten replacement was used. This demonstrates a provider availability failure, not a finding about the revised prompt's writing quality.

Retained review evidence:

- [All three fictional inputs and the exact generation briefs](examples/email-v3-model-review/fictional-inputs.json)
- [Exact credential-free model request body](examples/email-v3-model-review/request.json)
- [Exact system prompt used](examples/email-v3-model-review/system-prompt.txt)
- [Attempt status, HTTP code and provider error](examples/email-v3-model-review/run.json)
- [Isolation preflight](examples/email-v3-model-review/preflight.json)

The previous [manual example](examples/snapshot-email-v3-fictional.md) is now labelled **historical manual copy from before this writing revision**. Its prose was not rewritten or represented as live output. Its scope note/rendering and prompt snapshot were refreshed by the local sample script.

## Isolation and ready-to-run commands

`scripts/review-email-v3.mjs` imports the existing writer, input validation, renderers and local fixtures. It does not import database, job, subscriber or Kit clients. Its recorder stores data locally. Its fetch wrapper permits one POST to the configured model endpoint, rejects redirects and a second request, and has no retry loop. The writer retains its existing timeout. A failed response is retained; rendering occurs only after the normal application validator accepts the output.

The harness saves the exact model text and parsed response on success (or a validation failure with parseable output), alongside the validated journey and customer HTML/text only when accepted. Only credentials are redacted; model prose is not edited. Envelope request IDs and reasoning output are not needed in the review artifacts. A local exclusive attempt marker prevents accidental repetition/overwrite of the same run directory.

Prepare all fixtures without credentials or network calls:

```powershell
node --experimental-strip-types scripts/review-email-v3.mjs --output docs/examples/email-v3-prepared-review
```

For a **subsequently authorized** single generation review, from the repository root, using its existing local configuration:

```powershell
node --env-file=.env --experimental-strip-types scripts/review-email-v3.mjs --generate-once --output docs/examples/email-v3-next-authorized-review
```

Use a new output directory to retain the failed run. Do not put a key in the command. Neither command activates production delivery. The second command was **not** run in this task; the one attempted run is already recorded above.

## Fictional cases

All three are created by `tests/fixtures/email-v3-review-cases.mjs` and pass `validateAssessmentSession` plus local option/evidence assertions. Saved labels are deliberately supplied for email review; this is not a test of Jev's scoring.

1. **Purchasing — attempted once:** supported approval-delay finding (P03), possible responsibility/authority finding (P04). A reported request took two weeks and returned twice for missing information. Its approver was known. Hypothetical answers select a complete-information approval delay and a colleague who would need permission; these are similarities, not further events. The writer must not turn them into things that happened or use them to erase the missing-information example. No new process has been tried.
2. **Sparse/conflicting — prepared only:** uncertainty choices plus one account of a same-day approval conflicting with an unverified claim of weeks-long delays. P03 remains possible; the secondary is insufficient. The brief marks sparse evidence. Useful writing should gather a dated example, not conclude there is a recurring approval problem.
3. **No eligible secondary — prepared only:** one concrete approval delay with returned information; staff agree who approves this purchase type. P03 is supported; the secondary is insufficient and excluded from the brief. Email 5 should deepen the remaining primary decision, without inventing another problem or a causal connection.

No generation requests were made for cases 2 or 3.

## Automated checks versus editorial review

Automated checks cover fixture/session and option validity, known IDs and staff metadata separation, contract/schema constraints, mock provider success/failure retention, one guarded request, escaping, paragraph preservation, version-specific scope notes, exact legacy fixtures, consent and existing scheduling behavior. They cannot show that a real model uses the observations well or writes naturally.

Because the actual provider returned no copy, the eight requested editorial judgments are **not assessable in this run**: distinct benefit per email, meaningful personalization, executable instructions, evidence/hypothetical fidelity, absence of internal-rule narration, readable Email 4 branches, a supported invitation, and usefulness without replies or action. The revised instructions address these directly, but success is unproven. The main remaining defect is that current model output has not been evaluated; a later successful isolated request and human review are still needed. The old manual sample's repetition and dense branches remain visible for comparison, not as an endorsement of the revision.

## Changed files in this follow-up

### Verification results

- **67 repository tests passed, 0 failed**, including 16 email-journey tests and four isolated-review tests. All test generation/delivery responses are mocked. The single real request above is separate from the automated suite.
- **TypeScript passed:** `tsc --noEmit`.
- **Local production compilation passed:** `NITRO_PRESET=vercel vite build`. This created local build outputs only.
- **Changed-file ESLint passed** on all ten modified/new executable files in this follow-up.
- **Broader maintained-source lint remains failing:** 1,691 errors and six warnings in the existing repository source/configuration. The revised executable files are clean; this task does not resolve the unrelated lint backlog.
- **Historical manual sample** still passes structural validation when rebuilt; this is explicitly not a real model result or evidence of improved writing.
- **Live request:** one request, HTTP 503, no generated copy and no delivery operations.

| Area                                          | Files                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt and slot guidance                      | `src/assessment-v2/email-journey.server.ts`, `src/assessment-v2/email-contract.ts`                                                    |
| Topic observations                            | `src/assessment-v2/email-topic-guides.ts`                                                                                             |
| Version-aware scope note and preview copy     | `src/assessment-v2/email-journey.ts`                                                                                                  |
| Isolated review harness                       | `scripts/review-email-v3.mjs`, `scripts/lib/email-v3-review.mjs`                                                                      |
| Review fixtures and tests                     | `tests/fixtures/email-v3-review-cases.mjs`, `tests/assessment-v2-email-review.test.mjs`, `tests/assessment-v2-email-journey.test.mjs` |
| Manual artifact labelling/versioned rendering | `scripts/preview-email-v3.mjs`, the four `docs/examples/snapshot-email-v3-*` artifacts                                                |
| Documentation and actual failure evidence     | This guide, the updated `docs/nkoyo-email-generation-v3.md`, and the six files in `docs/examples/email-v3-model-review/`              |

No provider, delivery, persistence or runtime-validation module was changed in this follow-up. The earlier local v3 implementation remains uncommitted alongside these changes.
