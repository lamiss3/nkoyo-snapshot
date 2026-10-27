# Administrator OpenRouter credits indicator

## Setup

Server environment only (private `.env.local` for local development; Vercel server environment variables for deployment):

```dotenv
OPENROUTER_MANAGEMENT_KEY=your_dedicated_management_key
OPENROUTER_CREDITS_LOW_THRESHOLD=10
OPENROUTER_CREDITS_CRITICAL_THRESHOLD=3
OPENROUTER_CREDITS_CACHE_SECONDS=450
```

Never prefix these with `VITE_`, commit a real key, or reuse the inference `OPENROUTER_API_KEY`. The management key is used only for `GET https://openrouter.ai/api/v1/credits`. See the [official credits reference](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits).

Restart the local server after environment changes. Set the dedicated key in the relevant Vercel environments and redeploy when releasing. Local environment files are not uploaded by a Git push.

## Behavior

- The existing header renders the wallet only for administrators. On phones, the name/role and wallet use a second compact row so the title and sign-out control remain clear.
- `GET /api/admin/openrouter-credits` requires the existing Supabase bearer session. The server verifies the user with Supabase Auth and reads `user_roles` for the verified user ID on **every** request, before accessing cached account information. Staff and other signed-in users get 403; missing/invalid sessions get 401. Access lookup failures fail closed.
- Server modules retain the management key. Responses contain only allowlisted balance fields, status, thresholds and refresh timestamps; upstream bodies, errors and headers are never returned or logged.
- Remaining credits are exactly `total_credits - total_usage`. Genuine zero and negative balances are preserved. Invalid/missing totals and failed requests show **Balance unavailable**, with no invented dollars or stale totals presented as current. A failed refresh retains the last successful refresh timestamp.
- Healthy is strictly above the low threshold; Low includes both boundaries ($3–$10 by default); Critical is below the critical threshold. Invalid threshold ordering falls back to $10 / $3.
- Successful results are cached for 450 seconds by default, configurable within 300–600 seconds. Cache entries and in-flight work are scoped to a management-key fingerprint, so rotating the key invalidates the old account cache. Concurrent calls share one provider request.
- This is an in-memory cache per warm server process. Independent serverless instances/cold starts have independent caches. No database tables or external cache service are added.
- Manual Refresh bypasses the normal cache after a 30-second cooldown. Failures have a 60-second automatic retry backoff. Provider calls time out after eight seconds and do not follow redirects. No retries or fallback to inference credentials are made.
- HTTP responses are `private, no-store` and vary by Authorization; browser/CDN caches must not retain account data. React Query keeps the current administrator's display state in memory, with a 7½-minute refresh interval, and the existing sign-out flow clears query state.
- Add credits is only an external link to `https://openrouter.ai/settings/credits`. The app has no purchase, charge, automatic top-up or other credit-management mutation endpoint.

## Verification (October 27, 2026)

- 104 existing/new Node tests pass, including 19 balance tests for authentication/roles, authorization before cached reads, expiry, manual throttling, concurrency, key rotation, configuration, status boundaries, missing credentials, real zero/negative balances, provider 401/403/429/500, malformed replies, network failure and private error sanitization.
- TypeScript, edited-file ESLint and the local Vercel production build pass.
- A real authenticated account request and manual Refresh succeeded using the private local management key. The local anonymous HTTP request returned 401 with only `{ "available": false }`.
- Desktop dropdown and phone header/dropdown checked against actual account data; keyboard Escape closes the dropdown. Low warning and the correct external link were verified. A temporary process-only empty management key confirmed the unavailable dropdown and mobile label; the saved private file was not edited by that test, and the real-key local server was restored afterward.
- Browser asset scan found neither the actual management key nor `OPENROUTER_MANAGEMENT_KEY` in the production static assets. `.env.local` remains ignored by Git.
- No Snapshot/model settings, Kit configuration, saved records, email generation or delivery were changed. Local email automation remains disabled for QA.

Screenshots are in `outputs/openrouter-credits-review/` in the task workspace, outside the repository. Production release uses the existing Vercel environment without copying or changing credentials, as requested. If `OPENROUTER_MANAGEMENT_KEY` is absent there, the indicator shows **Balance unavailable**; it never falls back to the model API key.
