export type GeminiTransport = "google" | "openrouter";
export interface GeminiClientConfig {
  apiKey: string;
  model?: string;
  transport?: GeminiTransport;
  fetcher?: typeof fetch;
}

/** Auto switches only after a server-only OpenRouter key is present. */
export function geminiConfigFromEnv(
  purpose: "assessment" | "email" = "assessment",
  env: Record<string, string | undefined> = process.env,
): GeminiClientConfig {
  const selection = env["AI_PROVIDER"]?.trim() || "auto";
  if (!["auto", "gemini", "openrouter"].includes(selection))
    throw new Error("AI_PROVIDER must be auto, gemini or openrouter");
  const openrouter =
    selection === "openrouter" ||
    (selection === "auto" && Boolean(env["OPENROUTER_API_KEY"]?.trim()));
  return openrouter
    ? {
        apiKey: env["OPENROUTER_API_KEY"]?.trim() ?? "",
        transport: "openrouter",
        model:
          (purpose === "email" ? env["EMAIL_OPENROUTER_MODEL"]?.trim() : "") ||
          env["OPENROUTER_MODEL"]?.trim() ||
          "google/gemini-3.5-flash-lite",
      }
    : {
        apiKey: env["GEMINI_API_KEY"]?.trim() ?? "",
        transport: "google",
        model:
          (purpose === "email" ? env["EMAIL_GEMINI_MODEL"]?.trim() : "") ||
          env["GEMINI_MODEL"]?.trim() ||
          "gemini-3.6-flash",
      };
}

/** Credentials never enter the returned request body or model logs. */
export function createGeminiClient(config: GeminiClientConfig) {
  const transport = config.transport ?? "google";
  const model =
    config.model ??
    (transport === "openrouter" ? "google/gemini-3.5-flash-lite" : "gemini-3.6-flash");
  if (!config.apiKey)
    throw new Error(`${transport === "openrouter" ? "OPENROUTER" : "GEMINI"}_API_KEY is required`);
  if (transport === "openrouter" && !/^google\/gemini-[a-z0-9.-]+$/.test(model))
    throw new Error("OPENROUTER_MODEL must identify a paid google/gemini model");
  return {
    model,
    transport,
    request(
      system: string,
      prompt: string,
      maxTokens: number,
      schema: { name: string; schema: object },
      outputFormat: "json_schema" | "json_object" = "json_schema",
    ) {
      return transport === "openrouter"
        ? {
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
            response_format:
              outputFormat === "json_object"
                ? { type: "json_object" }
                : { type: "json_schema", json_schema: { ...schema, strict: true } },
            provider: { require_parameters: true, allow_fallbacks: true },
            reasoning: { effort: "minimal", exclude: true },
            max_tokens: maxTokens,
            stream: false,
          }
        : {
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: maxTokens,
              ...(/^gemini-3\./.test(model)
                ? { thinkingConfig: { thinkingLevel: "minimal" } }
                : {}),
            },
          };
    },
    async complete(
      request: object,
      timeoutMs: number,
      capture: (response: Response) => Promise<void>,
    ) {
      const response = await (config.fetcher ?? fetch)(
        transport === "openrouter"
          ? "https://openrouter.ai/api/v1/chat/completions"
          : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers:
            transport === "openrouter"
              ? { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }
              : { "x-goog-api-key": config.apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      await capture(response);
      const label = transport === "openrouter" ? "OpenRouter Gemini" : "Gemini";
      if (!response.ok) throw new Error(`${label} request failed (${response.status})`);
      const payload = (await response.json()) as {
        error?: unknown;
        model?: string;
        modelVersion?: string;
        choices?: {
          finish_reason?: string;
          message?: { content?: string | null; refusal?: string | null };
        }[];
        candidates?: {
          finishReason?: string;
          content?: { parts?: { text?: string; thought?: boolean }[] };
        }[];
      };
      if (payload.error) throw new Error(`${label} returned a provider error`);
      let text: string;
      if (transport === "openrouter") {
        const choice = payload.choices?.[0];
        if (choice?.finish_reason !== "stop" || choice.message?.refusal)
          throw new Error("OpenRouter Gemini returned an incomplete or refused response");
        text = choice.message?.content ?? "";
      } else {
        const candidate = payload.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== "STOP")
          throw new Error("Gemini returned an incomplete response");
        text =
          candidate?.content?.parts
            ?.filter((part) => !part.thought)
            .map((part) => part.text ?? "")
            .join("") ?? "";
      }
      if (typeof text !== "string" || !text.trim())
        throw new Error(`${label} returned empty content`);
      return { text, model: payload.modelVersion ?? payload.model ?? model };
    },
  };
}
