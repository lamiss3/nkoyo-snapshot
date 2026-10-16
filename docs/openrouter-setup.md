# Gemini through OpenRouter

The adaptive assessment's two generated scenario questions and the personalized five-email writer share a server-only Gemini client. Jev evaluation, scoring, question selection, result calculation, consent and the Kit schedule continue to use their existing code.

## Activation

Add these settings in Vercel's server environment, then redeploy:

```dotenv
AI_PROVIDER=auto
OPENROUTER_API_KEY=your_private_openrouter_key
OPENROUTER_MODEL=google/gemini-3.5-flash-lite
```

Do not prefix these names with `VITE_`. Do not commit `.env` files. The model is a paid Gemini endpoint, not a `:free` model or random free-model router. `EMAIL_OPENROUTER_MODEL` can optionally choose a different paid `google/gemini-...` model for email writing; otherwise both writers use `OPENROUTER_MODEL`.

In auto mode, no OpenRouter key means the existing direct Google connection remains selected. Once the OpenRouter key is present, both writers use OpenRouter exclusively. Existing `GEMINI_MODEL` and `EMAIL_GEMINI_MODEL` values do not override the OpenRouter model. Set `AI_PROVIDER=openrouter` to require that connection explicitly, or `AI_PROVIDER=gemini` to select the existing direct Google credentials. An OpenRouter failure does not silently send the request through the old free Google key.

No OpenRouter key is included in this release. Credentials and a real API test are still required before claiming live OpenRouter generation works. Adding production environment variables requires a new deployment to take effect.

## Requests and validation

Requests go to the fixed HTTPS endpoint `https://openrouter.ai/api/v1/chat/completions`, authenticated with a Bearer token held only on the server. Requests include an explicit paid Gemini model, JSON Schema output instructions, supported-parameter enforcement and provider fallback within OpenRouter. They do not enable web search, plugins, streaming, random model selection or an additional model fallback.

The assessment and email writers keep their existing output validators. OpenRouter error payloads, refusals, missing or truncated completions, invalid JSON and invalid application output cannot become successful saved generations. Questions retain their fixed backup path; emails retain durable retries and do not silently use fixed test templates. Request timeouts and token caps remain bounded. No subscriber is created and no email is sent by the client itself.

Existing saved questions and email journeys retain their content. Older assessment sessions can still complete their original written-question flow through the same transport.

## Logs and staff reports

The private model-call log saves the exact request body, raw response, validated output, returned model, status and usage. OpenRouter returns token usage and cost; any returned cost is preserved in the existing usage JSON. It is not presented as a total invoice estimate. Authentication headers never enter request logs, and `OPENROUTER_API_KEY` is included in secret redaction for assessment and email trace storage.

The `provider` database category stays `gemini` because the generating model is still Gemini. The configured model uses the full `google/gemini-...` identifier. Staff technical logs label these calls **GEMINI VIA OPENROUTER**; readable reports identify the connection and understand both Google and OpenRouter prompt formats. No database migration is required.

## Verification before activation

Automated tests cover key-based selection and explicit rollback, both adaptive scenarios, historical written questions, email generation, raw response and usage logging, schema requests, credential isolation, HTTP 401/402/429/503, embedded provider errors, refusals, malformed content and truncated generations. They also verify that readable reports retain the assessment inputs after switching transport.

After adding a key, use synthetic data to verify both scenario calls and all five email drafts. Inspect the linked model logs for the full model ID, successful status and returned usage. That verification should not create a contact, schedule a broadcast or send a test email unless separately requested.

References: [OpenRouter API](https://openrouter.ai/docs/api/reference/overview), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), [Gemini model](https://openrouter.ai/google/gemini-3.5-flash-lite).
