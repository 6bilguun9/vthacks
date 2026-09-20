import type { AppConfig } from "../config/env.js";
import { z } from "zod";

type ArcMessage = { role: "system" | "user"; content: string };

export type ArcOptions = { fetch?: typeof fetch; timeoutMs?: number };

/** A deliberately small ARC boundary. Callers own schemas and repair policy. */
export async function completeWithArc(config: AppConfig, messages: ArcMessage[], options: ArcOptions = {}): Promise<string> {
  const apiKey = config.ARC_API_KEY ?? config.llm_arc_api_key;
  if (!apiKey) throw new ArcUnavailableError("ARC is not configured.");
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(`${config.ARC_BASE_URL}/chat/completions`, {
      method: "POST",
      redirect: "error",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: config.ARC_MODEL, messages, temperature: 0.25, max_tokens: 3000, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
    });
  } catch { throw new ArcUnavailableError("ARC could not be reached."); }
  if (!response.ok) throw new ArcUnavailableError(`ARC returned HTTP ${response.status}.`);
  const payload = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string().min(1).max(64_000) }) })).min(1).max(10) }).safeParse(await response.json().catch(() => null));
  if (!payload.success) throw new ArcUnavailableError("ARC returned an invalid response.");
  const content = payload.data.choices[0]!.message.content;
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export class ArcUnavailableError extends Error {}
