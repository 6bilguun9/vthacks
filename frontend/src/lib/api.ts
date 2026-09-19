import { z } from "zod";

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("student-finance-api"),
  apiVersion: z.literal("v1"),
}).strict();

export type HealthResponse = z.infer<typeof healthSchema>;

export class ApiError extends Error {
  constructor(message: string, public readonly code: "configuration" | "network" | "http" | "invalid_response") {
    super(message);
    this.name = "ApiError";
  }
}

export function apiBaseUrl(value = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001") {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      throw new Error("Invalid API origin");
    }
    return url.origin;
  } catch {
    throw new ApiError("Set NEXT_PUBLIC_API_BASE_URL to the backend HTTP(S) origin.", "configuration");
  }
}

export async function getHealth(options: { baseUrl?: string; signal?: AbortSignal } = {}): Promise<HealthResponse> {
  const baseUrl = apiBaseUrl(options.baseUrl);
  const timeout = AbortSignal.timeout(5000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/v1/health`, { cache: "no-store", signal });
  } catch {
    throw new ApiError("Could not reach the backend. Check that it is running and allows this frontend origin.", "network");
  }

  if (!response.ok) {
    throw new ApiError(`The backend returned HTTP ${response.status}.`, "http");
  }

  try {
    return healthSchema.parse(await response.json());
  } catch {
    throw new ApiError("The backend response does not match the v1 health contract.", "invalid_response");
  }
}
