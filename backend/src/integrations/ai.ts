import type { AppConfig } from "../config/env.js";
import { z } from "zod";

export type AiMessage = { role: "system" | "user"; content: string };
export type AiOptions = { fetch?: typeof fetch; timeoutMs?: number };

export class AiUnavailableError extends Error {}

export function getAiProvider(config: AppConfig): {
  provider: "arc" | "openrouter";
  source: "vt_arc" | "openrouter";
  model: string;
  baseUrl: string;
} {
  return config.AI_PROVIDER === "openrouter"
    ? { provider: "openrouter", source: "openrouter", model: config.OPENROUTER_MODEL, baseUrl: config.OPENROUTER_BASE_URL }
    : { provider: "arc", source: "vt_arc", model: config.ARC_MODEL, baseUrl: config.ARC_BASE_URL };
}

/** Small provider-neutral boundary. Callers own schemas, grounding, and repair policy. */
export async function completeWithAi(config: AppConfig, messages: AiMessage[], options: AiOptions = {}): Promise<string> {
  const provider = getAiProvider(config);
  const apiKey = provider.provider === "openrouter"
    ? config.OPENROUTER_API_KEY
    : config.ARC_API_KEY ?? config.llm_arc_api_key;
  if (!apiKey) throw new AiUnavailableError("The configured AI provider is not available.");

  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  if (provider.provider === "openrouter") {
    if (config.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = config.OPENROUTER_SITE_URL;
    if (config.OPENROUTER_APP_NAME) headers["X-OpenRouter-Title"] = config.OPENROUTER_APP_NAME;
  }

  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      redirect: "error",
      headers,
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.25,
        max_tokens: 3000,
        response_format: { type: "json_object" },
        ...(provider.provider === "openrouter" ? { provider: { require_parameters: true } } : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
    });
  } catch { throw new AiUnavailableError("The AI provider could not be reached."); }
  if (!response.ok) throw new AiUnavailableError(`The AI provider returned HTTP ${response.status}.`);

  const payload = z.object({
    choices: z.array(z.object({ message: z.object({ content: z.string().min(1).max(64_000) }) })).min(1).max(10),
  }).safeParse(await response.json().catch(() => null));
  if (!payload.success) throw new AiUnavailableError("The AI provider returned an invalid response.");
  return payload.data.choices[0]!.message.content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}
