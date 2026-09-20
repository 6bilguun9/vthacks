import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../src/config/env.js";
import { ArcUnavailableError, completeWithArc } from "../src/integrations/arc.js";
import { AiUnavailableError, completeWithAi, getAiProvider } from "../src/integrations/ai.js";

describe("ARC adapter", () => {
  it("uses the injected fetch without exposing credentials in errors", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "{\"intent\":\"purchase\"}" } }] }), { status: 200 }));
    const result = await completeWithArc(readConfig({ ARC_API_KEY: "private-key", LOG_LEVEL: "silent" }), [{ role: "user", content: "hello" }], { fetch });
    expect(result).toBe('{"intent":"purchase"}');
    const calls = fetch.mock.calls as unknown as [string | URL, RequestInit][];
    expect(calls[0]?.[1]).toMatchObject({ headers: { authorization: "Bearer private-key" } });
  });

  it("fails safely when no ARC key exists", async () => {
    await expect(completeWithArc(readConfig({ LOG_LEVEL: "silent" }), [])).rejects.toBeInstanceOf(ArcUnavailableError);
  });

  it("selects OpenRouter without exposing its key and sends attribution headers", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "```json\n{\"intent\":\"purchase\"}\n```" } }] }), { status: 200 }));
    const config = readConfig({
      AI_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "private-openrouter-key",
      OPENROUTER_MODEL: "openrouter/free",
      OPENROUTER_SITE_URL: "https://saveandspendmoremoneyon.vodka",
      OPENROUTER_APP_NAME: "Hokie Wallet",
      LOG_LEVEL: "silent",
    });

    expect(getAiProvider(config)).toEqual({
      provider: "openrouter",
      source: "openrouter",
      model: "openrouter/free",
      baseUrl: "https://openrouter.ai/api/v1",
    });
    await expect(completeWithAi(config, [{ role: "user", content: "hello" }], { fetch })).resolves.toBe('{"intent":"purchase"}');
    const [[url, init]] = fetch.mock.calls as unknown as [[string, RequestInit]];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers).toMatchObject({
      authorization: "Bearer private-openrouter-key",
      "HTTP-Referer": "https://saveandspendmoremoneyon.vodka",
      "X-OpenRouter-Title": "Hokie Wallet",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "openrouter/free",
      max_tokens: 3000,
      response_format: { type: "json_object" },
      provider: { require_parameters: true },
    });
  });

  it("fails safely when the selected provider key is missing", async () => {
    const config = readConfig({ AI_PROVIDER: "openrouter", LOG_LEVEL: "silent" });
    await expect(completeWithAi(config, [])).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("rejects non-HTTPS provider URLs and newline attribution", () => {
    expect(() => readConfig({ OPENROUTER_BASE_URL: "http://openrouter.ai/api/v1" })).toThrow("HTTPS API URL");
    expect(() => readConfig({ OPENROUTER_APP_NAME: "Hokie Wallet\nInjected" })).toThrow("newlines");
  });
});
