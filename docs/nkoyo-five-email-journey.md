# Nkoyo's five-email assessment journey

**Updated direction:** The user chose all five emails personalized to the actual assessment answers. See [the current personalized journey design](nkoyo-personalized-email-journey.md). The segmentation plan below is retained as an alternative.

## The agreed journey

Use the test Creator account first. Move the reviewed workflow to Nkoyo's account before enrolling real respondents.

## Preferred architecture after the segmentation discussion

Use Gemini for the individual detailed report in Email 1. Use reusable, reviewed problem-specific content for Emails 2–5. The generic draft generator remains useful for copy previews; production does not need to generate all five emails for every person.

- Send Kit stable codes such as `primary_P10` and `secondary_P07`, alongside the contact and session reference. Human-readable problem names are for display; codes control routing.
- Prepare **20 primary sequences**, containing three emails each: awareness, explanation and action. This is **60 educational emails**.
- Prepare **20 secondary email variants**, one per topic. This is **20 additional educational emails**. A single secondary sequence can use 20 Liquid conditions/content blocks, or each variant can be its own one-email sequence.
- Therefore the content bank has **80 topic-specific follow-up pieces**, plus the individually generated report. There is no need for 400 primary/secondary combination journeys.
- Suggested setup: two routing automations, 20 primary sequences and one secondary sequence with conditional topic content. Conditions choose one primary sequence; after it finishes, add a `primary_complete` tag that triggers the secondary workflow. Its first email waits three days, reaching day 10 if the primary action email went on day 7. Use separate test-only tag names in the Creator test account.
- The primary sequence waits two days for awareness, another two days for explanation, and another three days for action. Start the primary journey after the requested report is successfully delivered, not just generated or scheduled.
- When two topics are joint priorities, sequence order must not falsely imply a lower-ranked secondary. When there is no secondary, use a generic check-in variant. When the result is inconclusive, use an evidence-gathering journey instead of a topic sequence.
- Keep topic-specific examples and action steps genuinely different. Vacancy cover, decision authority, and AI governance need different advice; swapping the name alone is insufficient.

Example: `primary_P10` (vacancies and recurring overload) selects its three-email sequence; `secondary_P07` (demand exceeding capacity) selects the day-10 secondary variant. Another person can use the same P10 primary sequence with a completely different secondary variant.

### Can the API send the complete generated email?

Yes. Kit's V4 broadcast endpoint accepts an HTML body and a `send_at` time. It does not require email body custom fields or Liquid. This makes a server-generated report possible within Kit.

The documented broadcast API currently targets **tag or segment IDs**, rather than an arbitrary recipient email directly. For an individual report, create a dedicated tag for that session/contact, verify it contains exactly the intended active subscriber, and target only that tag. Keep `public: false`. Never fall back to an empty recipient filter: Kit documents that an omitted filter defaults to all subscribers. Do not remove or reuse the private tag before the broadcast finishes.

This is a marketing broadcast mechanism, not a direct transactional `send(to, body)` endpoint. It will respect subscriber eligibility and unsubscribe status. A report-only request or a previously unsubscribed contact may still require a separate transactional service. Check these constraints in the test account before choosing Kit for requested reports.

Scheduling all five generated messages as individual broadcasts is also possible, but means five broadcasts per respondent and server-side retry/cancellation/delivery tracking. Prefer one generated report plus reusable topic sequences for manageable review and editing.

[Official broadcast API](https://developers.kit.com/api-reference/broadcasts/create-a-broadcast) · [API sequence enrolment](https://developers.kit.com/api-reference/sequences/add-subscriber-to-sequence)

| Email | Target timing | Focus | What the reader gets |
|---|---|---|---|
| 1 | Immediately after the report is ready | Detailed assessment report | What their answers suggest, evidence for the primary and secondary topics, the three Cs, uncertainty, and a suggested seven-day plan |
| 2 | Day 2 | Primary issue: awareness | Recognize the pattern in everyday work; one observation prompt |
| 3 | Day 4 | Primary issue: understanding | Explain a possible mechanism and distinguish it from another explanation |
| 4 | Day 7 | Primary issue: action | One small experiment, who should own it, and what to check after seven days |
| 5 | Day 10 | Secondary issue | Explore the secondary pattern and how it may relate to the primary; one next step |

These are target dates from the report's delivery. Kit's day/time restrictions can move the actual send date. The immediate email can also take a few minutes.

## How personalization works

1. The completed assessment and answers are the evidence source.
2. Jev's evaluations and the existing result logic select the topics. Gemini does not re-rank them.
3. Gemini receives the questions, actual selected option text, written answers, selected topic names/evidence labels, and practical guidance. The contact email and browser access token are excluded.
4. Gemini writes five draft emails in one structured response. Email 1 is substantially longer than the current result page: approximately 350–650 words, with six sections. Emails 2–5 target 140–240 words each.
5. Each evidence-based section carries staff-only source question IDs. Customer emails omit these references. Staff review checks that claims match those answers; structural validation alone cannot establish factual accuracy.
6. Validate the five positions, topic IDs, evidence references, plain text and length. Invalid or incomplete output is an error, not a report ready to send.
7. Store the reviewed content as an immutable version under the assessment ID. Log generation inputs, raw response, actual model version, parsed drafts, errors and retries. Delivery jobs use this saved version, rather than generating again at send time.

The draft generator is `src/assessment-v2/email-journey.server.ts`. It uses the existing Gemini configuration and model-call recorder. It is deliberately not connected to the public form yet. The synthetic preview saves the generation log locally. Future production calls must supply the session-linked recorder.

### Cases that need different wording

- **Joint priorities:** The assessment can identify two joint priorities. Email order is a learning sequence, not proof that one is less important.
- **Only one supported/possible topic:** Email 5 is a progress check-in. Do not invent a secondary problem.
- **No supported/possible topic:** Email 1 explains uncertainty. Emails 2–4 help gather evidence, and Email 5 reviews what was learned.
- **Possible evidence:** Use tentative language and invite the reader to check the pattern. An explanation is not an established root cause.
- **Three-C shares:** Describe relative emphasis in this assessment. Do not call them a measured score, probability, benchmark or organization-wide audit.
- **No first name:** Use “Hello,”. The current capture form does not ask for a name; don't guess one from an email address.

## Report delivery and Kit

Kit runs timed sequences and can insert subscriber custom fields with Liquid. Its official documentation says custom fields aren't intended for paragraph text and are stored as plain text. Do not put five full Gemini email bodies into custom fields.

There are three practical delivery designs. The API-broadcast design above is worth testing first for opted-in, active Kit subscribers; these two alternatives handle different needs:

### Full detailed report inside Email 1

Send Email 1 through a server-side transactional email service. Its body can contain the complete saved Gemini report. After successful delivery, enroll an opted-in contact into a Kit sequence containing Emails 2–5. Delays are 2 days, then 2 days, then 3 days, then 3 days. No transactional email service is configured yet.

### Kit handles all five emails

Email 1 contains a short personalized introduction and a link to the full Gemini report. Kit sends the five-email sequence: as soon as possible, then 2, 2, 3 and 3 days after the previous email. A secure report page must be built before using this design. Do not use `/admin`, the assessment ID alone, or the browser trace token as a report link. Report access needs a separate expiring credential, with a way to request a fresh link.

For the Creator account test, the five synthetic drafts can be pasted directly into a sequence. That verifies copy and timing for the sample, but does not connect automatic per-respondent personalization.

## Kit setup for the synthetic test

1. Create a tag named `nkoyo_snapshot_test_ready`. No production contact should receive this tag.
2. Create a sequence named **Nkoyo Snapshot — five-email test**.
3. Add the five emails from the synthetic example, with their subject and preview text. Staff evidence-reference notes are for review; leave them out of the customer email body.
4. Set the first email to **As soon as possible**. Set the next delays to **2 days**, **2 days**, **3 days**, **3 days** after the previous email. Enable all send days for the intended day 2/4/7/10 spacing.
5. Create a Visual Automation from scratch. Entry point: **Tag is added → nkoyo_snapshot_test_ready**. Action: **Email sequence → Nkoyo Snapshot — five-email test**. After completion, add `nkoyo_snapshot_test_complete`.
6. Keep the test automation inactive and emails unpublished while reviewing. Activate only after the test recipient and sender are selected. Do not import real respondents into the personal test account.
7. Check the actual subscriber preview. A test message with placeholder fields is not proof that the final personalization will render correctly.

## Fields and template approach for production

Use short topic metadata and reviewed one-sentence text in Kit fields. Keep complete reports, raw answers and model logs in Supabase.

Suggested fields:

| Field | Purpose |
|---|---|
| `snapshot_session_id` | Reference to the locked journey |
| `snapshot_primary` | Human-readable primary topic |
| `snapshot_secondary` | Human-readable secondary topic, or empty |
| `snapshot_has_secondary` | `yes` or `no` |
| `snapshot_joint_priority` | `yes` or `no` |
| `snapshot_report_url` | Separate secure report link, if using the Kit report-link design |
| `snapshot_primary_observation` | Reviewed short paraphrase of evidence |
| `snapshot_primary_meaning` | Reviewed short explanation |
| `snapshot_primary_question` | One reflection prompt |
| `snapshot_primary_action` | One achievable first step |
| `snapshot_primary_check` | What to measure or review |
| `snapshot_secondary_meaning` | Reviewed short explanation |
| `snapshot_secondary_question` | One reflection prompt |

Create the fields in Kit before setting them through the API. Populate all required fields successfully before adding the trigger tag. Never store Liquid or raw HTML supplied by a respondent or generated model inside a field.

Example greeting:

```liquid
Hello {{ subscriber.first_name | strip | default: "there" }},
```

Example subject, using no filters (Kit does not support filters in subject lines):

```liquid
One practical step for {{ subscriber.snapshot_primary }}
```

Email 5 can branch inside the template:

```liquid
{% if subscriber.snapshot_has_secondary == "yes" %}
Your Snapshot also raised {{ subscriber.snapshot_secondary }}.

{{ subscriber.snapshot_secondary_meaning }}

One question to explore: {{ subscriber.snapshot_secondary_question }}
{% else %}
Your Snapshot did not establish a second priority. This is a useful moment to
check what you observed about your first focus, what remains unclear, and
which example would help you decide what to do next.
{% endif %}
```

Reviewed topic-specific templates or Liquid conditions can provide the fuller educational text for each of the 20 topics. The Gemini drafts provide a starting point for that copy. Sending all five full, individually generated bodies requires a delivery system that supports per-message content, rather than putting those bodies into Kit subscriber fields.

## Consent and repeat assessments

- Requesting the report permits Email 1 for that request. Emails 2–5 require the separate follow-up opt-in.
- Proposed unchecked checkbox: **“Send me four personalized follow-up emails over the next 10 days, with explanations and practical steps based on my Snapshot. I can unsubscribe at any time.”**
- Without this opt-in, deliver only the requested report. Do not silently enroll the person in the five-email marketing sequence or reactivate an unsubscribed subscriber.
- Kit fields are tied to the contact, not an assessment. Do not overwrite fields while a sequence for an older assessment is still running. Choose an explicit policy: finish the old journey before starting another, or cancel it and start the new one. The server should enforce one active journey per contact.
- Use unique jobs for assessment ID + contact + journey version + email number. Record provider delivery IDs, retry transient failures, and avoid triggering the tag twice.
- Add no trigger tag on a generation failure. A saved report request is not the same as a delivered report.

## Current status

Prepared locally: the draft generator, topic/consent rules, structural validation, synthetic preview script and this workflow guide. The three focused tests and TypeScript check passed. The live Gemini 3.6 preview returned HTTP 503; the alternate 2.5 Flash preview returned HTTP 404. No generated example is claimed from these failed calls. The latest request/error was saved locally. Kit sign-in was verified on the sequence page; no sequence has been created or activated yet.

Not connected yet: automatic generation after a capture, saved production email jobs, transactional sending/private report page, Kit contact sync and live automation. The existing capture form still only saves the request. Testing Kit requires sign-in; delivery testing also needs a chosen test recipient and sender.

## Official Kit references

- [Create a Visual Automation](https://help.kit.com/en/articles/5523023-how-to-create-your-first-kit-visual-automation)
- [Create and schedule a sequence](https://help.kit.com/en/articles/2502629-creating-and-sending-an-email-sequence-in-kit)
- [Liquid personalization and preview](https://help.kit.com/en/articles/2502633-basic-email-personalization-with-liquid-faqs)
- [Custom fields and their limitations](https://help.kit.com/en/articles/2502504-how-to-add-and-manage-custom-fields)
- [Kit V4 subscriber creation/upsert](https://developers.kit.com/api-reference/subscribers/create-a-subscriber)
