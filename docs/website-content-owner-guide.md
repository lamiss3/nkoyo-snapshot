# Website Content: owner guide

## Scope and access

This CMS manages the Snapshot app's marketing homepage and new libraries. It does not edit the separate WordPress site at ibanison.com, assessment questions/scoring, AI prompts, personalized Snapshot emails, schedules, or staff roles.

Sign in with an existing **administrator** account. Open **Website content** in the admin sidebar. Ordinary staff retain their existing Snapshot workspace access but cannot read drafts, publish, sync Kit or authorize uploads. These checks are enforced on the server and in database policies.

## The everyday workflow

1. Open an item with **Edit / preview**, or use **Add** in a library.
2. Edit the structured fields. Expand the labeled groups for promotion, access, search and delivery settings. Enter plain text; HTML and iframe code are not accepted. Use a lowercase slug with hyphens.
3. **Save draft** stores changes privately. Opening an editor never writes content.
4. **Preview draft** shows the current draft, including unsaved changes. Registration/download controls in library previews are disabled. Homepage preview links lead to existing destinations.
5. **Publish** asks for confirmation, validates the content and changes the public version in one transaction. A failed publication leaves the old public version intact. New page loads use the published version without a deployment; reload an already open public page to see changes.
6. **Unpublish** removes public display while keeping the draft/history. **Archive** also hides the item from the default admin list. Use **Include archived**, edit and save to recover it. Uploaded files and Kit registrations are not deleted.

If another administrator saves first, your revision is rejected. Copy your unsaved changes somewhere safe, close the editor, refresh and reopen the latest version before reapplying them.

Published slugs become fixed to preserve links. Titles and copy can still change. **Published version history → Restore to draft** restores an earlier version privately; preview and explicitly publish it to put that version online.

## Pages

The homepage exposes its existing hero, audience, benefit cards, report explanation, Culture/Capacity/Compliance cards, founder section, booking CTA, closing CTA, navigation/footer and SEO. Its layout and branding remain controlled by the app.

- Hide eligible sections with their visibility switches. Check navigation links still point to visible sections.
- Leave the portrait blank to retain the polished text layout. Use only an approved HTTPS image, with a useful portrait description.
- A booking link is optional and is not shown until configured.
- To make new libraries easy to find, add their links to **Header navigation** / **Snapshot footer links**, then publish the homepage. Paths: `/insights`, `/videos`, `/webinars`, `/resources`.
- **Show explicitly featured library items** adds genuine, published selections only. Select Featured + Show on homepage in a resource/video/webinar. Articles use their Featured setting. Supports four resources, three videos, three articles and one featured webinar.
- If the CMS is unavailable or the homepage has never been published, the app retains its original homepage copy. No fake library content is seeded.

## Blog / Kit articles

Click **Sync / refresh articles**. The CMS reads Kit V4 posts on the server and imports eligible article references as drafts. It never edits Kit originals. Publish an item's local display preferences to show it on `/insights`; use Visible, Featured, order and optional category to curate the list. The public CTA opens the original Kit article, with no duplicate full-text article page.

Only published, free posts with a valid HTTPS public URL and publication date qualify. Draft, paid-only, email-only and scheduled content is excluded. A later successful sync removes ineligible articles from public display even if their local preferences remain published.

Cache lives in Supabase, not a server's temporary memory. Public use rechecks after 15 minutes when published article preferences exist. Failed requests retain the last successful cache for up to 24 hours; after that the article cards are withheld. The admin shows last success and any sync error. API requests have bounded timeouts and cursor pagination. No partial API list replaces a complete cache.

## Videos

Add an approved YouTube watch, share, Shorts or embed URL; title, description, category and order. Optional: approved cover URL, related resource, Featured and Show on homepage. Preview, then publish.

The server validates the 11-character video ID and YouTube host. No YouTube API key or arbitrary iframe code is used. The public player loads only after a click, uses youtube-nocookie.com, and does not autoplay. The Watch on YouTube link remains available when embedding is blocked or a video becomes unavailable. A syntactically valid URL cannot prove the video is available or licensed for your use; check the approved video before publishing.

## Webinars and registration resources

The website provides the marketing page. **Kit provides registration, confirmation, delivery and optional nurture.** This module does not build a second email sender or enroll anyone while editing.

Before publishing a gated item:

1. In Kit, create a dedicated delivery form. Configure its incentive email/confirmation, the actual recording or file delivery, thank-you page and any appropriate delivery-only automation. Test this yourself using an address you control.
2. In the CMS, provide the active form ID and its exact Kit `embed_url`. Do not substitute a custom redirect or another form's URL. Publication checks both against Kit's active forms API.
3. Provide the genuine private recording/file information and acknowledge that you tested delivery. Private recording URLs, access instructions, PDF IDs and internal sequence/tag IDs are excluded from public responses.
4. If offering the optional five-day nurture, configure a **different Kit form** with explicit promotional consent, a five-day sequence and unsubscribe support. Enter that form's ID/URL and sequence ID; confirm its separate test. The public page offers a separate optional signup. Do not place unrelated promotions in the delivery-only form.
5. Publish only after those checks pass. The CMS can verify that forms exist and match; Kit's API does not verify incentive-email contents, consent wording, sequence timing or actual inbox delivery. Those require your test and acknowledgment. Sequence/tag/thank-you fields document your Kit setup; saving them does not create or change Kit automations.

For webinars, add audience, outcomes, presenter, cover and the real recording provider/URL. Only one webinar may be Featured at a time: unfeature and publish the current one first, then feature the replacement. Older CMS versions and Kit registrations/delivery links are retained. Do not remove old Kit forms, files or recordings needed by previous registrants.

Registrations are managed in Kit; this CMS does not claim local registration totals or count a form-open click as a registration. An unlisted video URL is not identity-based access control. If strict authenticated recording access is required, configure an appropriate hosting platform.

## Resources and PDFs

Add an actual guide, checklist, worksheet or other approved resource, with its audience, benefit, description, cover and SEO. Unavailable resources should stay drafts. The architecture supports at least four featured resources but does not fabricate their contents.

For an **open** resource, upload a PDF or provide a public HTTPS resource URL. The public access control verifies the resource is currently published and open before issuing a 60-second signed PDF download. For a **registration** resource, its private CMS PDF is an administrative copy; also configure genuine delivery in the Kit incentive email. The website never issues anonymous download links for gated PDFs.

PDF uploads go directly to private persistent Supabase Storage through a scoped signed upload token, avoiding the application's request-body limit. The server checks PDF filename/type, maximum 10 MB, exact size and `%PDF-` signature before marking a file ready. No file is published just by uploading it. Private preview/download links expire after 60 seconds. This is format validation, not antivirus scanning or a PDF editing system.

Removing a file from a draft or archiving a resource does not delete stored files. Storage cleanup is a manual administrator maintenance task; confirm that no published item or historical delivery depends on an asset before deleting it in Supabase.

## Popups and announcement bars

Add a campaign with its internal name, public headline/message, CTA, optional approved image, display type, priority, allowed pages, delay, device visibility, frequency and optional ISO start/end timestamps with timezone.

- Use a modal or announcement bar. Modals always have Close, Dismiss and Escape behavior; only a bar can be non-dismissible.
- Preview is private and records no campaign events.
- Publish with Campaign status Active to activate. To pause: select Paused and publish. Saving a Paused draft alone does not change an already active public version. Unpublish/archive removes the campaign; history can restore it to draft.
- Allowed pages are `/`, `/insights`, `/videos`, `/webinars`, `/resources`. No popups run on admin, sign-in, the Snapshot, results, report pages or individual resource/webinar detail pages.
- One campaign is selected at a time. Lower priority numbers appear first. Session/day/week caps and dismissal use this browser's storage, scoped by published revision. A new publication resets that version's cap. Campaign eligibility is checked on page load and again before display; scheduled starts become eligible on a subsequent page load. An open campaign closes at its configured end.
- Visitors can hide promotions in Website preferences. If required frequency storage is unavailable, promotions are suppressed.

## Optional content measurement

Measurement is **off by default**. A homepage publication can offer the preference. Counts are sent only after a visitor opts in and with DNT/GPC off. Turning measurement on does not enroll anyone in emails. Review the published privacy information before enabling a new measurement purpose.

Events cover CTA clicks, issued open-resource access, registration-form opens and popup impressions/dismissals/clicks. They use a per-session random ID and per-document/event deduplication; no assessment answers, email addresses, IP addresses or registration claims are stored by this CMS event code. Server/hosting infrastructure has its own standard logs. Public event counts are not fraud-proof conversion statistics. These records are ready for a future dashboard; this release does not add invented metrics.

## Setup / developer handoff

Migration: `drizzle/migrations/0005_website_content_management.sql`. Applied to **nkoyoproject / yebjicrkisgrkchicoxz** during local verification. It adds five isolated tables, policies, a service-only publishing function and the private `website-resources` bucket. It does not alter assessment, journey, lead or staff rows.

Existing environment variables, with no new public secrets:

| Variable                                                                         | Location / purpose                                                    |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `SUPABASE_URL`                                                                   | Server: the same project as the frontend                              |
| `SUPABASE_PUBLISHABLE_KEY`                                                       | Server auth verification                                              |
| `SUPABASE_SERVICE_ROLE_KEY`                                                      | Server-only CMS data/storage operations; never prefix with VITE       |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Existing public app configuration                                     |
| `KIT_API_KEY`                                                                    | Server-only Kit V4 GET posts/forms; reuse the existing configured key |

Keep existing assessment, model, Kit sending and email job variables unchanged in production. The local review deliberately uses `ASSESSMENT_LOGGING_ENABLED=false`, `EMAIL_AUTOMATION_ENABLED=false` and `KIT_MODE=test`; do not deploy those local flags over the production settings.

This implementation is prepared on branch `codex/website-content` for review. It has not been deployed. All libraries are initially empty; the current Kit account returned zero eligible public posts and one form. No webinar, video, resource or campaign has been fabricated or published. Supply approved assets and configure/test the Kit delivery forms before publishing those items.
