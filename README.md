# Institutional Readiness Snapshot

Nkoyo's adaptive assessment for Culture, Capacity and Compliance. The site uses TanStack Start, React, and Vite. Jev evaluates possible topics; Gemini can write the three deeper questions. The result copy is generated from the local topic guide.

## Run locally

Use Node.js 20 or newer. Copy `.env.example` to `.env`, fill in the values, then run:

```powershell
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). The local assessment can use labeled rule-based routing when `JEV_API_KEY` is absent. Public deployments require `JEV_API_KEY`; Gemini is optional and fixed fallback questions are used if it is absent or unavailable.

## Deploy to Vercel

Create a Git repository in this project folder and push it to a new GitHub repository. Import that repository in Vercel with the **TanStack Start** framework preset. `vercel.json` records the framework, and Nitro selects the Vercel build target in Vercel's environment.

Add the variables from `.env.example` in Vercel's **Project Settings → Environment Variables**. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are browser-visible; `JEV_API_KEY` and `GEMINI_API_KEY` must remain server-only. The matching unprefixed Supabase values are used by the admin authentication middleware. Never commit `.env`.

The optional report-request form stores an email address linked to a completed Snapshot in Supabase. Automated email delivery is not configured, so the site does not claim a report was sent. Review the draft privacy and terms copy, configure a real contact address, and test the public assessment before sharing broadly.

## Private assessment logging

The server can capture the complete adaptive journey independently of the email form. Setup is required before enabling it:

1. In this project's Supabase SQL editor, run `drizzle/migrations/0001_adaptive_assessment_logging.sql`. It creates three private tables with staff/admin read policies and server-only write access.
2. Add `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` to the server environment locally and in Vercel. The key must be this project's service-role key or secret key. Never put it in a `VITE_` variable or commit it.
3. Set `ASSESSMENT_LOGGING_ENABLED=true` and redeploy. Leave this switch false until the SQL and server key are in place. If enabled storage is unavailable, the app asks the visitor to retry rather than silently skipping capture.
4. Sign in at `/admin` using an account with an existing admin or staff role. **Assessment logs** lists recent sessions and supports lookup by full ID, a step timeline, individual model requests/responses, results and a full JSON export.

What is captured:

- `adaptive_assessment_traces`: one record per assessment ID, last saved state, questions and answers, evaluations, result, status and last activity.
- `adaptive_assessment_events`: starts, confirmed answers, progress saves (including the visible question), restarts, server decisions, fallbacks, errors and stage completions. Identical browser checkpoints are deduplicated.
- `adaptive_model_calls`: one row per real provider call, correlated to the server attempt, with the exact request body, raw response, parsed output, model names, HTTP status, duration, usage when supplied and errors. A `started` row remains visible if a server process stops before finalizing the call. A retry gets a new attempt ID and preserves previous calls.
- Completed results also go into `assessment_sessions` automatically, even without an email request.

Drafts sync after an 800 ms typing pause. Next confirms the answer on the server, and each stage saves its result before returning. An abrupt tab close or network outage can prevent the last unsynced draft from reaching the server; the last received state remains available. Sessions that stop are retained as active/incomplete with their last activity; restarting records the previous session before creating a new ID. Late browser autosaves cannot downgrade a saved server stage or erase a completed result.

Logs are private to existing admin/staff roles. Authentication headers, provider keys and raw browser capability tokens are excluded/redacted. The browser holds a random token that authorizes writes to its own session; only its hash is stored in the database. Historical provider calls made before logging was enabled cannot be recovered. Existing browser state can be saved when a visitor resumes, but it is labelled as browser data rather than a historical server trace.

The draft privacy page describes this capture. Set the organization's actual retention/contact policy before wider use. No retention period or automatic deletion is invented by this implementation.

## Checks

```powershell
npx tsc --noEmit
node --experimental-strip-types --test tests\assessment-v2*.test.mjs
npm run build
```
