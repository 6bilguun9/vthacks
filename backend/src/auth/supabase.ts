import { AppError, type Actor } from "../domain/model.js";
import type { Authenticator } from "../domain/ports.js";

export interface SupabaseAuthConfig {
  SUPABASE_URL?: string | undefined;
  SUPABASE_PUBLISHABLE_KEY?: string | undefined;
}

const timeoutMs = 5_000;

function unavailable(): never {
  throw new AppError(503, "STORAGE_UNAVAILABLE", "Private storage is temporarily unavailable.");
}

/** Verifies, rather than decodes, a Supabase access token. */
export function createSupabaseAuthenticator(config: SupabaseAuthConfig, request: typeof fetch = globalThis.fetch): Authenticator {
  const url = config.SUPABASE_URL?.replace(/\/$/, "");
  const key = config.SUPABASE_PUBLISHABLE_KEY;
  return {
    async authenticate(authorization: string | undefined, ip: string): Promise<Actor> {
      if (!url || !key) unavailable();
      const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
      if (!match?.[1]) throw new AppError(401, "UNAUTHORIZED", "A valid guest session is required.");
      const token = match[1];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await request(`${url}/auth/v1/user`, {
          headers: { apikey: key, authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) throw new AppError(401, "UNAUTHORIZED", "A valid guest session is required.");
        if (!response.ok) unavailable();
        const body: unknown = await response.json();
        const userId = typeof body === "object" && body !== null && typeof (body as { id?: unknown }).id === "string"
          ? (body as { id: string }).id : undefined;
        if (!userId) throw new AppError(401, "UNAUTHORIZED", "A valid guest session is required.");
        return { userId, token, ip };
      } catch (error) {
        if (error instanceof AppError) throw error;
        unavailable();
      } finally { clearTimeout(timer); }
    },
  };
}
