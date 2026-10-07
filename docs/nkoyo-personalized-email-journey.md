# Nkoyo — five personalized assessment emails

## The chosen design

All five emails are written for the individual using the actual questions and answers from their completed assessment. The earlier topic-sequence approach is an alternative, not the current design. Topic IDs remain useful metadata, but the content comes from the person's examples and constraints.

| Email              | Target timing                                | Personalization                                                                                                                                                |
| ------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: detailed report | Immediately after generation/review is ready | Explain the result in more depth than the MVP, using their concrete examples, topic evidence, the three Cs, uncertainty and a suggested seven-day plan         |
| 2: awareness       | Day 2                                        | Connect the primary issue to a specific situation they described; explain what to notice in everyday work                                                      |
| 3: understanding   | Day 4                                        | Use their examples to explain a possible mechanism; address a relevant question they wrote and distinguish other explanations                                  |
| 4: action          | Day 7                                        | Propose one practical experiment adapted to their stated constraints, a possible owner to agree, and a progress check                                          |
| 5: secondary issue | Day 10                                       | Explore the secondary issue through relevant answers and its possible connection to the primary; if no secondary is established, write a personalized check-in |

The follow-ups must not assume someone replied or took the previous action. An email reply is not automatically part of the evidence source. Using new replies would require a separate reply-capture integration and explicit generation rules.

## Example of relevance

Suppose the respondent says two coordinator posts are vacant, the same three colleagues absorb that work, and their reports are delayed. Their primary topic is vacancies and recurring overload; their secondary topic is demand exceeding capacity.

- Email 1 explains how those observations support the result and which facts remain unclear.
- Email 2 calls attention to the repeated redistribution of work and the delayed reports.
- Email 3 explores how keeping the same commitments after losing staff can create a backlog, without declaring this the verified root cause.
- Email 4 suggests mapping the duties absorbed by the three colleagues and agreeing one task to pause or reassign, with a review of delays after seven days.
- Email 5 uses their stated referral/intake mismatch to explore demand, rather than repeating the staffing advice.

This is an illustration of the writing approach, not a real respondent's record.

## What Gemini receives and produces

Input: actual question text, selected option text, written answers, authoritative primary/secondary topics, evidence labels, whether priorities are joint, relative three-C emphasis and practical topic guidance. No contact email or browser capability token is sent in this brief.

Output: five distinct subjects, preview texts and complete email bodies, written together to avoid repetition. Every email has staff-only question references so its use of evidence can be reviewed. The recipient sees natural-language references to their situation, not question IDs or model logs.

- Jev and the existing result logic determine the topics; Gemini writes the content.
- Every email must include an evidence reference when responses exist. A valid reference alone does not prove the prose is accurate: staff review still checks the claims.
- Unclear answers produce a clearer evidence-gathering prompt, not invented facts.
- “Possible” stays tentative; joint priorities remain joint even if one is introduced later.
- Suggested owners, time commitments and resources are proposals, not assumed facts.
- Generate and save all five once. Sending later uses the saved version rather than rewriting the advice on each delivery day.

## Kit delivery

For this design, the server prepares **five individual broadcasts per respondent**, containing the saved complete HTML bodies. No full report or long email body needs to live in a Kit custom field. The existing draft builder sets `public: false`, an explicit private tag filter, and `send_at: null` for review.

Before scheduling, the server must verify the dedicated session/contact tag contains exactly the intended active subscriber, with no extra pages or other members. Kit's API currently supports tag/segment targeting and can default to all subscribers when a filter is omitted. It is not safe to rely on a shared primary-topic tag for an individually generated email.

After review and verification, the delivery worker schedules the first message as soon as ready and the later messages for days 2, 4, 7 and 10 from the agreed journey start. Record separate states for draft, scheduled, sending, delivered, failed and cancelled; a successful API request is not proof of delivery. Keep recipient tags stable until all relevant messages finish. Preserve Kit's unsubscribe/address footer and never reactivate an unsubscribed contact automatically.

Kit broadcasts are a subscriber email mechanism rather than a transactional send-to-any-address API. Report-only requests and unsubscribed contacts need an appropriate separate report delivery route if Kit will not deliver to them.

## Consent, storage and retries

The report request permits Email 1 for that request. Emails 2–5 require the separate follow-up opt-in. Proposed unchecked checkbox:

> Send me four personalized follow-up emails over the next 10 days, with explanations and practical steps based on my Snapshot. I can unsubscribe at any time.

Store each journey under its assessment ID, contact reference and content version. Store model request/response, source question IDs, review state, planned send times, Kit broadcast IDs and delivery events. Private assessment text remains protected by staff access policies.

Each message has a unique job key: assessment ID + contact + content version + email number. Do not retry an uncertain broadcast creation blindly; first reconcile the stored provider ID/status. Retakes need an explicit policy: finish the earlier journey, or cancel its pending messages before starting the new one. A new assessment must not accidentally change the content of an older scheduled message.

## Initial preparation release (historical)

- `src/assessment-v2/email-journey.server.ts`: server-only Gemini writer; exact model-call logging through the required recorder; validates topics, five slots, references, plain text and lengths.
- `src/assessment-v2/email-journey.ts`: authoritative brief, consent eligibility, safe HTML/plain text rendering, agreed day offsets, and draft-only Kit request payloads.
- `tests/assessment-v2-email-journey.test.mjs`: checks evidence-linked generation, invalid references/topics, consent, private filters, draft-only publication settings and HTML/Liquid escaping.
- `verification/preview-email-journey.mjs`: synthetic preview, with no real contacts or sending.

Report requests now go through a server endpoint that verifies the session capability, loads the canonical completed assessment, and atomically saves the contact plus one durable preparation job. Retries cannot create duplicate jobs or substitute a different recipient. A first generation attempt starts from the browser after capture; closing the browser does not delete the saved job. A lease and lock token prevent concurrent or late generation workers from replacing saved drafts. Three automatic worker attempts are permitted; staff can retry failed jobs explicitly.

Admin now includes **Personalized email journeys**: email/session lookup, status, consent, five readable drafts, evidence references, Markdown export, retry, staff approval and a Kit private-draft upload action. Each Gemini call is saved in the assessment model log. Kit requests/responses are recorded in private email events. Staff/admin access is checked on every management call and private tables enforce the same roles through RLS. Generation errors do not change a completed assessment into an error state.

The Kit adapter upserts a contact without reactivating an unsubscribed contact, creates a session-specific private tag, checks all tag members and pagination before every broadcast, and creates only private **unscheduled** drafts. Report-only requests upload Email 1; separately opted-in requests upload all five. A durable in-progress marker and saved provider IDs prevent blind retries after an uncertain network outcome. An explicitly empty tag index pauses as `awaiting_recipient`; staff can retry verification without recreating the contact, tag or confirmed drafts. Kit's index can take up to five minutes to reflect a new tag assignment. Other mismatches and uncertain writes require checking Kit and correcting state through a server operator; there is no automatic reset button for these cases. Configure a verified sender and a Classic template ID. Test mode accepts only explicitly allowlisted email addresses, so a personal test account cannot receive ordinary respondents.

**Delivery and scheduling are not activated.** The day offsets are planned metadata, not scheduled sends. There are no delivery claims, automatic retake cancellation, webhooks, or automatic scheduling yet. Validate private broadcast scheduling and unsubscribe behavior in the real Kit account before implementing activation. Kit's update documentation describes publication differently from its create endpoint; do not assume a scheduling update preserves privacy without testing. Existing captures are not silently enrolled in the new sequence.

Recovery endpoint: `GET /api/email-jobs`, protected by a server-only `CRON_SECRET` of at least 32 random characters. One call claims one eligible job. Configure a durable scheduler before relying on recovery after browser closure. No cron is enabled by this commit. Vercel Hobby allows a daily cron; Pro permits more frequent runs. For Hobby, add `{ "path": "/api/email-jobs", "schedule": "0 8 * * *" }` under `crons` in `vercel.json` after setting the secret; this is a limited backup, not a high-volume queue. A production queue should drain batches with bounded concurrency and alert on backlog. Admin retries work without the scheduler.

Server-only settings are documented in `.env.example`: `EMAIL_GEMINI_MODEL`, `CRON_SECRET`, `KIT_API_KEY`, `KIT_SENDER_EMAIL`, `KIT_CLASSIC_TEMPLATE_ID`, `KIT_MODE` (default test), and `KIT_TEST_EMAILS`. Never use a `VITE_` prefix for these. Missing Kit configuration disables its Admin action. Eleven focused tests, the TypeScript check and the Vercel production build pass. A live synthetic queue test verified idempotent capture, recipient immutability, anonymous denial and lease fencing. Live Gemini 3.6 and 3.5 email-writing attempts returned HTTP 503; linked failed calls and bounded retries were saved honestly. This does not establish successful live automated email generation.

### Fixed email integration test

In Admin, open **Test with fixed emails (no Gemini)** and supply a completed test assessment ID and an allowed test email. Explicitly request all five test drafts, then prepare them. This staff-only action uses the same durable capture queue and lease-protected save path. It never changes the visitor's automatic Gemini writer or silently replaces existing drafts. Existing report-only consent stays unchanged.

The fixed templates use the saved primary/secondary topics, reviewed topic guides and one verbatim answer excerpt. Subjects start `[TEST — FIXED]`, `source` is `fixed_test` and the writer is `fixed-test-v1 (no Gemini)`. Preparation records a private `fixed_test_drafts_prepared` event with the complete content and actor; no model call is fabricated. No new database migration or API key is needed.

Review the five emails in Admin, export Markdown if useful, approve and create private Kit drafts. Retry recipient verification if Kit is still indexing the tag. Repeating preparation or upload returns the existing saved content/provider IDs rather than duplicating them. Both preparation and Kit upload of fixed content require explicit `KIT_MODE=test` and an allowlisted recipient, even if other journeys later use production mode. Delivery and day-offset scheduling are still not enabled by this test action.

### Test connection verified on 6 October 2026

The authorized personal Creator test account is connected using a private V4 key in Vercel Production/Preview, test mode and one allowlisted recipient (`slamiss57@gmail.com`). A real API test uploaded the five previously reviewed **fictional, editorially revised** example emails, marked `[TEST]`, to a dedicated private tag. Kit confirmed all five broadcasts have `public: false` and `send_at: null`. No email was sent. These examples are not represented as the generated output of a real respondent's assessment. Provider IDs and request/response records are preserved in local verification artifacts. Delivery, scheduling and the automatic generation recovery scheduler still require implementation/configuration.

Implementation files: `email-actions.ts` (public/staff boundaries), `email-jobs.server.ts` (canonical data and worker), `email-job-policy.server.ts` (capability and cron verification), `kit-client.server.ts` / `kit-jobs.server.ts` (private drafts), `EmailJourneyPanel.tsx`, and migration `0002_personalized_email_journeys.sql`.

### First content drafts

Gemini subsequently returned a first pass for all five synthetic-example emails. The generated report was below the draft length limit, so the call remained a failed validation in the model log and was not approved for automatic delivery. The five messages were then expanded and edited in Codex into review drafts: 449 words for the report, and 163, 171, 175 and 189 words for the follow-ups. The actual question references were checked; all content remains marked as a synthetic example. These are content drafts, not delivered emails or a connected production workflow.

Review artifacts are saved under `output/email-journey/` in the chat workspace:

- `nkoyo-first-five-email-drafts.md`: complete copy and staff evidence references.
- `nkoyo-first-five-email-drafts.html`: readable customer-email preview.
- `nkoyo-first-five-email-drafts.json`: structured editorial draft for later integration.

### Fixed flow and preview delivery verified on 6 October 2026

The live staff Admin prepared five fixed-template emails from one completed test assessment, saved them through the durable queue, accepted staff approval and uploaded all five through the website's Kit adapter. Repeating preparation reused the existing journey. Private events confirm one capture, one fixed preparation, five broadcast creations and zero Gemini email-writing calls. Kit's API confirmed all five broadcasts remained private and unscheduled.

With the user's explicit approval, all five were sent manually using Kit's **Send test email / Send preview** controls. Kit displayed **Sent** for each. A focused Gmail search confirmed receipt of all five, all labeled **Spam**. The journey now preserves these manual preview confirmations, recipient, broadcast IDs, verification times and mailbox outcome in its private provider state and audit event; Admin displays the counts and outcome. These are test previews, not launched broadcasts or proof of automatic delivery.

The immediate/day 2/day 4/day 7/day 10 schedule remains inactive. Gemini generation is still a separate pending live test. Fixed templates are an explicit staff test action, not an automatic fallback for visitors. Before launch, use Nkoyo's verified sending domain and retest inbox placement; the current Gmail sender and sending to that same account can contribute to Spam placement according to [Kit's deliverability guidance](https://help.kit.com/en/articles/3372365-why-are-my-emails-going-to-spam). This is a possible contributor, not a verified diagnosis of these messages.

Local verification artifacts contain the saved five-email Markdown, API verification summary, Kit preview receipts and Gmail/Kit screenshots. The equivalent Markdown artifact was checked for all five messages; an in-app browser download event was not confirmed, so browser export remains unverified in that browser.

## Official Kit references

## Automatic delivery — 7 October 2026

New report requests now use a durable automatic journey. Email 1 is authorized by the report request; Emails 2–5 require the separate unchecked follow-up opt-in. Earlier review requests and fixed test templates remain excluded. Recipient and consent cannot be silently changed by retries.

The working email writer is `gemini-3.5-flash-lite`: both synthetic generation and a genuine saved completed assessment produced five validated emails. Attempts with Gemini 3.6 Flash and 3.5 Flash returned high-demand 503 responses; 2.5 Flash returned 404 for this key. The selected model generates all five together once, with saved input/output and evidence references. It does not replace Jev's topic evaluation.

The Kit adapter schedules private broadcasts through POST with `public: false`, an explicit session-specific tag containing exactly one verified active recipient, and an exact `send_at`. The report has a short preparation buffer; the four subsequent messages are anchored to that report's scheduled time at days 2, 4, 7 and 10. Existing unsubscribed contacts are not reactivated. A report-only request schedules one broadcast. Kit retains its unsubscribe/footer mechanism.

Production settings: `EMAIL_AUTOMATION_ENABLED=true`, `EMAIL_GEMINI_MODEL=gemini-3.5-flash-lite`, `KIT_MODE=production`, the existing server-only Kit settings and a random `CRON_SECRET`. Preview automation stays disabled. Migration `0003_automatic_email_delivery.sql` adds per-request eligibility and eight bounded generation attempts with increasing delays. Old rows default to `automation_enabled=false`; they are not bulk enrolled.

`drizzle/operational/nkoyo_email_worker.sql` installs the named Supabase Cron worker every minute. Store the matching production credential in Vault as `nkoyo_email_worker` first, deploy the worker, then run this operational SQL. The scheduled HTTP call reads its credential from Vault and invokes the protected `GET /api/email-jobs`. No service-role key or cron secret is committed. Recovery survives browser closure; each tick performs a bounded generation or Kit stage plus a periodic provider status check. Server duration is configured to 300 seconds and provider uploads have a shorter time budget than their lease.

An empty Kit tag index pauses and resumes without recreating confirmed resources. Unknown write outcomes, privacy mismatches and expired upload leases are marked for reconciliation instead of risking duplicate sends. Admin shows saved content, consent, broadcast IDs, scheduled dates and provider status; private audit records retain each API request/response and error. Kit's `completed` state is a provider send status, not evidence of inbox placement. There are no delivery webhooks or automatic operator alerts yet; inspect Admin for failures.

The authorized real assessment test saved five Gemini emails and scheduled five private broadcasts: report on 7 October, then 9, 11, 14 and 17 October. Kit confirmed the report completed and the later four scheduled. These are live scheduled sends, unlike the earlier fixed test previews. Future dates have not elapsed. The connected personal Gmail sender is being used at the user's request; earlier previews landed in Spam, so inbox placement still needs work before moving to Nkoyo's verified sender.

The live report was confirmed in the authorized recipient's Gmail Inbox. Gmail displayed a sender verification warning for the personal Gmail address sent through Kit. This single receipt does not establish inbox placement for other recipients; switching to Nkoyo's verified sending domain remains necessary before relying on deliverability.

A retake creates a separate journey only after another explicit request. It does not modify or cancel already scheduled broadcasts. Turning the global automation flag off stops new preparation, but does not cancel messages already scheduled in Kit; cancel those in Kit if required.

Fourteen focused email tests cover consent, private targeting, scheduling offsets, second-precision provider timestamps, idempotence, safe index resumption and rejection of uncertain settings. TypeScript and the production build are checked before deployment. Browser capture and background scheduling are verified separately; successful API creation alone is never called inbox delivery.

### Current operating references

- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Vault-backed scheduled HTTP calls](https://supabase.com/docs/guides/functions/schedule-functions)
- [Kit broadcast status](https://developers.kit.com/api-reference/broadcasts/get-a-broadcast)

### Kit API references

- [Eventual consistency and tag indexing](https://developers.kit.com/api-reference/eventual-consistency)

- [Create or schedule a broadcast with its complete HTML body](https://developers.kit.com/api-reference/broadcasts/create-a-broadcast)
- [Read all subscribers belonging to a tag](https://developers.kit.com/api-reference/tags/list-subscribers-for-a-tag)
