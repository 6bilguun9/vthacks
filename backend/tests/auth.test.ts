import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/domain/model.js";
import { createSupabaseAuthenticator } from "../src/auth/supabase.js";

describe("Supabase bearer authentication", () => {
  it("verifies the bearer with Supabase and never trusts a browser-supplied user id", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "guest-a" }), { status: 200 }));
    const auth = createSupabaseAuthenticator({ SUPABASE_URL: "https://project.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public" }, request);
    await expect(auth.authenticate("Bearer actual-token", "127.0.0.1")).resolves.toEqual({ userId: "guest-a", token: "actual-token", ip: "127.0.0.1" });
    expect(request).toHaveBeenCalledWith("https://project.supabase.co/auth/v1/user", expect.objectContaining({ headers: { apikey: "public", authorization: "Bearer actual-token" } }));
  });

  it("returns safe errors for malformed, rejected, and unconfigured auth", async () => {
    const rejected = createSupabaseAuthenticator({ SUPABASE_URL: "https://project.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public" }, vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(rejected.authenticate("Bearer no", "ip")).rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" } satisfies Partial<AppError>);
    await expect(rejected.authenticate(undefined, "ip")).rejects.toMatchObject({ statusCode: 401 });
    const missing = createSupabaseAuthenticator({});
    await expect(missing.authenticate("Bearer token", "ip")).rejects.toMatchObject({ statusCode: 503, code: "STORAGE_UNAVAILABLE" });
  });
});
