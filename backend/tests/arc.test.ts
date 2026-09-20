import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../src/config/env.js";
import { ArcUnavailableError, completeWithArc } from "../src/integrations/arc.js";

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
});
