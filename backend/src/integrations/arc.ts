import type { AppConfig } from "../config/env.js";

type ArcMessage = { role: "system" | "user"; content: string };

export async function completeWithArc(config: AppConfig, messages: ArcMessage[]): Promise<string> {
  const apiKey = config.ARC_API_KEY ?? config.llm_arc_api_key;
  if (!apiKey) throw new ArcUnavailableError("ARC is not configured.");
  let response: Response;
  try {
    response = await fetch(`${config.ARC_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: config.ARC_MODEL, messages, temperature: 0.25, max_tokens: 3000, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch { throw new ArcUnavailableError("ARC could not be reached."); }
  if (!response.ok) throw new ArcUnavailableError(`ARC returned HTTP ${response.status}.`);
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new ArcUnavailableError("ARC returned an empty response.");
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export class ArcUnavailableError extends Error {}
