# Snapshot Privacy Policy and Terms of Use

Updated October 20, 2026. These are Snapshot-specific pages, linked from the public footer at `/privacy` and `/terms`. The operator is Iban Ison Solutions LLC. The owner confirmed Georgia, United States, and purpose-based retention with manual review/deletion. The pages use the approved Snapshot contact `hello@nkoyoeffionglewis.com`; the company policy identifies `hello@ibanison.com` for general company matters.

## Relationship to existing company policies

The company policies were read on October 20, 2026:

- [Company Privacy Policy](https://ibanison.com/privacy-policy/), with the embedded Termly policy last updated January 29, 2024.
- [Company Terms and Conditions](https://ibanison.com/terms-conditions/), with the embedded Termly terms last updated February 7, 2024.
- [Existing privacy-request form](https://app.termly.io/dsar/cb9377bb-7c1c-4cb6-880f-dfabe6758ee6), linked by that privacy policy. No request was submitted while implementing this change.

The local pages explain this app and link the broader policies. They do not copy the broader site's payment, social-login, mapping or advertising features into the Snapshot. The general company's governing-law, dispute-resolution and liability provisions remain in its published terms; this implementation does not invent a new arbitration clause, waiver or liability cap. The company website and Termly documents were not edited.

The existing company Privacy Policy includes incomplete or inconsistent generic fields, including a blank mapping-retention period and a categories table that marks identifiers as not collected despite contact-email collection elsewhere. Those need a separate company-policy review; they were not reproduced as Snapshot facts. Confirm the published postal address remains current before reusing it elsewhere. The Snapshot pages link those existing contact details rather than inventing a new address.

## Implementation mapping

| Disclosure                                                                       | Implementation checked                                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Unfinished progress, answers, session IDs, staff review                          | `AdaptiveSnapshotPage.tsx`, `logging.server.ts`, `trace-runtime.server.ts`    |
| AI inputs/outputs, failures, usage and results                                   | `provider-trace.server.ts`, `jev.server.ts`, `gemini-client.server.ts`        |
| Jev via TypeSafe; OpenRouter with Google/Anthropic; direct Google configurations | `jev.server.ts`, `gemini-client.server.ts`, `email-journey.server.ts`         |
| Requested report and separately unchecked four-email opt-in                      | `AdaptiveEmailCapture.tsx`, `email-actions.ts`, `email-jobs.server.ts`        |
| Kit recipient/content and subscription handling                                  | `kit-client.server.ts`, `kit-jobs.server.ts`, `email-automation.server.ts`    |
| Local progress/request flags without a fixed expiry                              | `AdaptiveSnapshotPage.tsx`, `AdaptiveEmailCapture.tsx`, `snapshot-storage.ts` |
| Staff authentication and roles                                                   | `auth.tsx`, Supabase clients and staff authorization checks                   |
| Hosting/database/font services                                                   | Vercel configuration, Supabase integrations and `__root.tsx` font links       |

No claim is made that all AI providers have identical retention, training or data-location settings. The notice does not claim universal zero retention, guaranteed delivery, automatic deletion, anonymous raw responses or a verified organizational diagnosis.

## Manual retention and privacy-request handling

The approved notice creates an ongoing manual responsibility; adding it does not install a deletion scheduler.

1. Review whether a record is still needed for an active requested report/follow-up, unresolved support/security issue, consent preference or legal preservation obligation. Delete or anonymize information no longer needed for those purposes.
2. For a privacy request, identify the relevant assessment/email with proportionate verification. Do not ask for passwords or browser capability tokens.
3. Check linked assessment snapshots, event/model logs, results, captured contact details, email preparation/delivery records and relevant Kit records. Clearing local storage or deleting a staff account does not remove respondent records across these systems.
4. Handle pending email and subscription preferences before deleting data needed to enforce them. Keep only a minimal suppression record when necessary to respect an unsubscribe. Use the providers' existing controls; this change adds no new administrative delete/cancel button.
5. Explain any lawful retention exception and distinguish active records from provider/backups. Do not promise instant deletion from every provider or an unimplemented fixed expiry. Record the response to the request appropriately.

## Source checks

- [FTC privacy guidance](https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business-0) supports matching privacy promises to actual collection, retention and disposal practices.
- [ICO transparency guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) identifies retention criteria as an alternative where no fixed period exists; this reference does not assert that every jurisdictional rule applies to the company.
- [OpenRouter Privacy Policy](https://openrouter.ai/privacy) explains provider-dependent data handling. [TypeSafe's data-use guidance](https://help.typesafe.ai/articles/5974925716-how-is-submitted-data-used-or-retained) also makes retention dependent on the applicable agreements/settings.
- [Kit Privacy Policy](https://kit.com/privacy), [Vercel Privacy Notice](https://vercel.com/legal/privacy-notice), and [Supabase Privacy Policy](https://supabase.com/privacy) were checked for provider identification. Kit distinguishes its own creator-site practices from subscriber processing under its data-processing terms; the Snapshot notice does not attribute all Kit marketing-site tracking to this app.

## Scope and release

Only legal page/layout/configuration and footer identity/labels were changed in this task. Assessment logic, email prompts, model settings, renderer, delivery behavior and stored records remain unchanged. These updates are local and were not deployed or submitted to a third-party policy publisher. The pages are completed application content, not a certification of legal compliance or a claim of attorney approval.
