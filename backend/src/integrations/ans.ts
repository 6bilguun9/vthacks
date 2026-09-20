import { z } from "zod";

const resolutionSchema = z.object({
  links: z.array(z.object({ rel: z.string(), href: z.string().url() }).passthrough()).max(30),
}).passthrough();

export class AnsUnavailableError extends Error {}

export async function resolveAgentEndpoint(input: {
  baseUrl: string;
  apiKey: string | undefined;
  agentHost: string;
  version: string;
  fetch?: typeof fetch;
}): Promise<URL> {
  if (!input.apiKey) throw new AnsUnavailableError("ANS is not configured.");
  let response: Response;
  try {
    response = await (input.fetch ?? fetch)(new URL("/v1/agents/resolution", input.baseUrl), {
      method: "POST",
      headers: { authorization: `sso-key ${input.apiKey}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ agentHost: input.agentHost, version: input.version }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch { throw new AnsUnavailableError("ANS could not be reached."); }
  if (!response.ok) throw new AnsUnavailableError("ANS did not resolve the planner.");
  const parsed = resolutionSchema.safeParse(await response.json().catch(() => null));
  const href = parsed.success ? parsed.data.links.find((link) => link.rel === "agent-endpoint")?.href : undefined;
  if (!href) throw new AnsUnavailableError("ANS response did not include an agent endpoint.");
  try { return new URL(href); } catch { throw new AnsUnavailableError("ANS returned an invalid agent endpoint."); }
}
