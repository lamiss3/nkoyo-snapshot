# Jev through OpenRouter

Jev evaluates the evidence in the Snapshot; the app still selects follow-up topics and calculates results with the existing scoring rules. All four evaluation rounds use the same server configuration. Question writing and email generation have separate settings.

## Switch the route

Set `JEV_PROVIDER=openrouter` in the server environment for the deployment. Use the existing `OPENROUTER_API_KEY` for inference. The management key is only for the admin balance indicator.

The app sends the same typed choice and score questions to the [OpenRouter Decisions API](https://openrouter.ai/docs/guides/community/jev). The default model is `~typesafe/jev-latest`, which tracks TypeSafe's newest Jev release. Set `JEV_OPENROUTER_MODEL` to a specific OpenRouter Jev ID to pin a version. OpenRouter bills these evaluations to the same account as other OpenRouter model calls. The existing private model logs retain the response model and any usage or cost data returned.

After changing Vercel environment variables, redeploy and verify a synthetic Snapshot through the final result. To switch back, set `JEV_PROVIDER=typesafe` (or remove it) and redeploy with the original `JEV_API_KEY` in place. Direct TypeSafe remains the default, and the production assessment does not switch providers after a failed call.
