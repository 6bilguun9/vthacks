import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiBaseUrl, getHealth, healthSchema } from "../src/lib/api";

const health = JSON.parse(readFileSync(new URL("../../contracts/examples/health.json", import.meta.url), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); });

describe("browser API client", () => {
  it("accepts the shared health contract and calls the independent backend", async () => {
    const request = vi.fn().mockResolvedValue(Response.json(health));
    vi.stubGlobal("fetch", request);
    expect(healthSchema.parse(health)).toEqual(health);
    await expect(getHealth({ baseUrl: "http://localhost:3001/" })).resolves.toEqual(health);
    expect(request).toHaveBeenCalledWith("http://localhost:3001/api/v1/health", expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }));
  });

  it("reports an unavailable backend instead of inventing a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(getHealth()).rejects.toMatchObject({ code: "network" });
  });

  it("rejects an incompatible API version", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...health, apiVersion: "v2" })));
    await expect(getHealth()).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("handles non-JSON responses without showing the response body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private proxy error")));
    await expect(getHealth()).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("reports HTTP errors without parsing them as successful health results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private upstream error", { status: 503 })));
    await expect(getHealth()).rejects.toMatchObject({ code: "http", message: "The backend returned HTTP 503." });
  });

  it.each(["javascript:alert(1)", "https://user:secret@example.com", "https://example.com/api", "https://example.com?key=secret"])("rejects invalid API base %s", (value) => {
    expect(() => apiBaseUrl(value)).toThrow();
  });
});
