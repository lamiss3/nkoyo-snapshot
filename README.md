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

## Checks

```powershell
npx tsc --noEmit
node --experimental-strip-types --test tests\assessment-v2*.test.mjs
npm run build
```
