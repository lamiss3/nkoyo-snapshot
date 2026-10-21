# Snapshot Admin Portal

Implemented from published commit `6ded638b95474ea4ec23175ee44b1cf3bf57ca7f` on branch `codex/admin-portal`. Production publication was authorized after local review; the release commit and deployment status are tracked through GitHub and Vercel.

## Existing architecture retained

- React 19, TanStack Start/file routes, React Query, Tailwind and the existing Radix Sheet component. No new dependencies.
- `src/routes/_authenticated/route.tsx` still verifies the Supabase user. The new admin layout checks the existing `user_roles` table before mounting any page with private data.
- Supabase RLS still enforces admin/staff reads for sessions, leads, events, traces, model calls and journey events. Client navigation is not the security boundary.
- `src/staff/account-actions.ts` and `account-service.server.ts` still require an administrator on the server, including account listing, creation and deletion. Existing self/last-admin safeguards and audit operations remain intact.
- `src/assessment-v2/email-actions.ts`, all job/Kit/worker modules, scoring, prompts, generation, scheduling, consent checks and the email renderer are unchanged.
- No schema, migrations, data edits or new public account-creation feature.

## Routes and ownership

| URL                      | Implementation                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `/admin`                 | `src/admin/DashboardPage.tsx`                                                                               |
| `/admin/leads`           | `src/admin/LeadsPage.tsx`                                                                                   |
| `/admin/assessments`     | `src/admin/AssessmentsPage.tsx`                                                                             |
| `/admin/assessments/$id` | `src/admin/AssessmentDetailPage.tsx`                                                                        |
| `/admin/email-journeys`  | Existing `EmailJourneyPanel.tsx`, with filters, pagination, event timeline and explicit action confirmation |
| `/admin/staff`           | Existing `StaffAccountPanel.tsx`, mounted only for an administrator                                         |

The shared shell is `AdminLayout.tsx`; access context, navigation, read queries, data projection, formatting, presentation primitives and scoped CSS live separately under `src/admin/`. Navigation configuration is separate from page implementations so a future content group can be added without changing database or assessment code. No future content features were implemented.

`/admin#staff-accounts` redirects to `/admin/staff`. Known legacy leads, snapshots, logs and email section hashes map to their corresponding pages. Existing auth URLs remain valid. Unknown hashes remain on Dashboard.

## Reporting definitions

- Started: distinct saved assessment IDs, reconciling `assessment_sessions.session_key` with `adaptive_assessment_traces.session_id`.
- Completed: those assessment records with a saved completion timestamp. Completion rate is completed/started in the selected start-date cohort, as of now. It is not a unique-user conversion rate.
- Raw start events are shown separately and never added to saved assessment counts.
- Booking clicks count recorded events, including repeated clicks.
- Marketing opt-ins count consented lead submissions, not unique contacts or current Kit subscribers.
- Patterns count each recorded pattern once per completed assessment; one assessment may have several patterns.
- Assessment date filters apply to start dates. Events and lead metrics use their own recorded timestamps. Calendar boundaries use the staff browser’s timezone.
- Exact known email/assessment exclusions affect the current Dashboard view only. Email matches exclude linked session records and identifiable events. Unlinked activity cannot reliably be classified. No deletion or merging occurs.

## Leads and exports

Unique contacts groups case-insensitive, trimmed email addresses for display. The latest saved submission supplies the displayed consent; history preserves every earlier submission and choice. This is not a live unsubscribe check.

Search includes email, name, organization, role, linked assessment ID and focus across contact history. Sorting, consent filters and 20-row pagination apply to the selected view.

- Contacts CSV: one row per matching contact, latest fields and original submission count.
- Submissions CSV: all matching original lead fields, one row per original submission.
- Saved snapshots CSV: original session key, completion timestamp, summary and pattern fields for matching saved results. Trace-only records are identified separately.
- Markdown and full JSON exports are available from assessment detail; Markdown email-journey export remains available.
- CSV exports include all matching pages. Cells are quoted and spreadsheet-formula prefixes are neutralized.
- No private capability token/hash is selected by the new summary/detail reads.

## Loading and refresh behavior

Summary queries page through existing rows instead of silently stopping at 1,000. They have a 60-second stale period and focus/manual refresh. Detailed assessment history loads only on its detail route; automatic 10-second refresh is opt-in and stops when the page unmounts. The obsolete monolithic logs panel was removed. The only report-builder edit updates its refresh description; saved reports and processing logic are unchanged.

Email status retains the existing 10-second page-local refresh. Recorded journey events load only for the selected journey, with 25-at-a-time display and manual refresh. No browser read calls Kit, creates drafts or initiates delivery. Existing action handlers are called only after a deliberate confirmation. Staff management retains its existing server-backed operations and page-local refresh.

## Verification and limits

- All 74 Node tests pass, including six new admin projection/CSV tests and existing assessment, logging, provider, email/Kit job and staff authorization tests.
- TypeScript, scoped ESLint, production build and diff checks pass; logs and screenshots are in `outputs/admin-portal-2026-10-21/` in the task workspace.
- Signed-in administrator browser verification covered all five pages, direct assessment details, legacy staff link, desktop collapse persistence, keyboard activation, mobile drawer navigation, Escape/focus return, search, grouped/original submissions, completed filter, pagination and existing journey content/events.
- Recorded data at review: 27 assessment IDs, 16 completed (59%); 14 lead submissions grouped into 6 contacts. Counts are a review observation, not seeded demo data.
- Verified contact CSV: 6 rows representing all 14 submissions. Verified detail JSON: 71 events, 9 model calls, saved snapshot, no token hash. Markdown downloaded successfully. Original submission/snapshot export controls use the same tested CSV/download utility.
- Ordinary staff management denial is covered by server tests; a second real staff-only browser login was not performed. No account creation/deletion, model generation, sequence approval/upload, email send or rescheduling was exercised against production data.
- Local preview intentionally omits model/Kit credentials and disables email automation/log writes. Its “Kit not configured” warning describes this environment, not production.
- The existing journey API returns the latest 100 jobs; that limit remains clearly stated. Summary metadata is fully paged but held client-side; very large future datasets would benefit from server-side filtering/pagination.

## Manual checks before a future release

1. In a staging environment, sign in as staff and verify the Staff Accounts link is absent and its direct route refuses access. Confirm signed-out deep links require sign-in.
2. With disposable staging accounts, exercise creation/deletion and existing last-admin/self protections.
3. Verify production environment banners after deployment. If testing generation or Kit mutations, use an explicitly authorized test recipient and disposable request; navigating the portal must never trigger them.
4. Review the private screenshots locally before sharing them; some contain contact or assessment information.
