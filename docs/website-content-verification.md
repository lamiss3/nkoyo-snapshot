# Phase 2 verification — 22 October 2026

## Scope and release state

Implemented locally in `work/nkoyo-cms`, branch `codex/website-content`, starting from published Admin Portal commit `8b9b12465de4a959cfd95901311a750ba768a09e`.

No GitHub push or application deployment was performed. The additive `0005` migration was applied to **nkoyoproject (`yebjicrkisgrkchicoxz`)** after passing isolated PostgreSQL tests. No content was published. One homepage draft contains the existing copy; Kit's article cache contains its real empty eligible-post list. One small private file, `CMS-QA-UNPUBLISHED.pdf` (asset `6229d188-6c07-4849-83e3-b1a710a9e1f1`), remains as an unlinked storage integration-test artifact. It is not a genuine published resource.

## Automated checks

- **83 Node tests passed**, including the 74 existing tests and nine CMS tests.
- TypeScript `--noEmit`: passed.
- ESLint on every new/changed TypeScript/TSX file: passed, no warnings. A final scoped lint also covers the private-PDF download adjustment.
- Production Vite/Nitro build: passed.
- `git diff --check`: passed.
- Compared **62 protected existing files** against the release baseline: no changes to assessment scoring, prompts, email generation, rendering, scheduling, staff account services, Supabase authentication, config, existing migrations or assessment/report routes in that protected set.
- Scanned production browser output for actual local server-key values: no service-role or Kit API key present. Server keys remain in ignored local environment configuration.

Commands (use the project's installed Node/npm):

```text
node --experimental-strip-types --test tests/*.test.mjs
npx tsc --noEmit
npx eslint src/cms src/admin/navigation.ts src/admin/AdminLayout.tsx src/components/layout/SiteHeader.tsx src/components/layout/SiteFooter.tsx src/routes/index.tsx src/routes/_authenticated/admin/pages.tsx src/routes/_authenticated/admin/blog.tsx src/routes/_authenticated/admin/videos.tsx src/routes/_authenticated/admin/webinars.tsx src/routes/_authenticated/admin/resources.tsx src/routes/_authenticated/admin/popups.tsx src/routes/insights src/routes/videos src/routes/webinars src/routes/resources
npm run build
git diff --check
```

CMS tests cover URL/text/YouTube validation, public/free Kit filtering, pagination, timeout failure handling, staff denial before side effects, failed publication before writes, separate verified registration/nurture configuration, draft/private-field projection, stale-cache expiry, PDF validation, anonymous gated-download denial, campaign exclusions and consent gating.

## Isolated PostgreSQL checks

Executed the actual migration in a temporary PGlite PostgreSQL database with compatibility auth/storage schemas. The isolated test runtime is outside the repository's production dependencies. Tests passed for:

- Creation of all additive tables/policies/function/private bucket.
- Draft save, publish, later draft edits leaving published content intact.
- Optimistic concurrency rejecting stale writes.
- Restore into draft without changing the live publication.
- Previously published slug protection.
- One-featured-webinar uniqueness and rollback of a rejected new publication.
- Preservation of historical delivery links.
- Archive and restore.
- Service RPC's administrator check, anonymous permission denial and staff read/write denial through RLS/grants.
- Administrator reads and content-event deduplication.

Test script: `outputs/cms-phase2/migration-check.mjs` in the task workspace. These transaction/publish/archive scenarios were isolated; they did not publish test content into the connected project.

## Connected integration checks

- Signed-in administrator saved the existing homepage as **draft revision 1**, then opened its private preview.
- Actual Kit V4 GET-only posts/forms requests succeeded: **zero eligible public articles, one active form**. The admin's Sync control saved the real empty cache and reported success accurately. No subscriber, broadcast, sequence, tag or email write endpoint was called.
- Private PDF: scoped direct upload succeeded, server signature/MIME/size verification succeeded, anonymous bucket download was denied. No public resource references that QA file.
- Real HTTP calls to all seven private CMS endpoints without an Authorization header were rejected: list, history, change, sync, begin upload, finish upload and private PDF preview.
- Cross-site server-function request rejected with **403 Forbidden** by the existing CSRF middleware.

## Browser checks

- All six admin modules checked at **390 px mobile** and **1440 px desktop**: no horizontal overflow, no error alerts.
- New public Insights, Videos, Webinars and Resources listings checked at mobile/desktop sizes: truthful empty states, no published placeholder cards or active campaigns.
- Original public homepage copy and its social-sharing defaults retained as the unpublished fallback.
- Homepage draft preview retained the navy/lime/magenta design and original section structure.
- Resource and campaign detail previews checked using unsaved, clearly labeled layout fixtures; fixtures were discarded.
- Mobile navigation has an independently scrollable region and reaches all content links. Editor/preview close targets are 44 × 44 px; editor action bars remain visible at a shorter desktop height.
- In-page discard confirmation tested; no native browser confirmation is used by the CMS editor.
- Invalid non-YouTube URL rejected by the real server before saving. An unsaved unavailable-video fixture rendered no iframe before a click, then loaded the `youtube-nocookie.com` player and showed “This video is unavailable” while retaining the Watch on YouTube fallback. That fixture was discarded.
- Existing Snapshot entry opened its original first question and five choices. Its scoring/AI behavior is covered by the unchanged existing contract tests; no additional paid model generation was run.

Review screenshots and JSON evidence are in `outputs/cms-phase2` in the task workspace: `pages-desktop.png`, `pages-mobile.png`, `navigation-mobile.png`, `resource-preview-desktop.png`, `resource-preview-mobile.png`, `popup-preview-mobile.png`, `video-unavailable.png`, responsive checks, preservation checks, HTTP security checks, bundle scan and build/test logs.

## Configuration and remaining owner work

- Uses existing Supabase server/public variables and server-only `KIT_API_KEY`; no new model keys, public secrets or sending configuration.
- Approved articles, video URLs, covers and genuine resource contents have not been supplied; libraries remain empty until explicitly published.
- Webinar/resource delivery requires dedicated active Kit forms and owner-tested incentive/confirmation delivery. Optional nurture requires a different form, its five-day sequence ID, and a separate test acknowledgment. CMS validates form ID/URL against Kit; it cannot verify email content or actual inbox delivery through the forms API. Those delivery workflows were **not activated or inbox-tested** in this task.
- Local registration totals are not claimed. Content event capture is opt-in and off by default; no new analytics dashboard or anti-fraud conversion measurement is included.
- File format validation is not antivirus scanning. Storage cleanup is manual, and archived files are retained to avoid breaking historical use.
- This CMS edits the Snapshot app's marketing site, not the separate WordPress installation at ibanison.com.

See `docs/website-content-owner-guide.md` for the day-to-day publishing and Kit setup instructions.
