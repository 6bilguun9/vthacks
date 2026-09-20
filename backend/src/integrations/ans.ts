import { z } from "zod";

const linkSchema = z.object({ rel: z.string(), href: z.string().url() }).passthrough();
const resolutionSchema = z.object({
  links: z.array(linkSchema).max(30),
}).passthrough();
const detailsSchema = z.object({
  agentHost: z.string(),
  version: z.string(),
  agentStatus: z.literal("ACTIVE"),
  endpoints: z.array(z.object({
    protocol: z.enum(["HTTP-API", "HTTP_API"]),
    agentUrl: z.string().url(),
  }).passthrough()).max(30),
}).passthrough();

export class AnsUnavailableError extends Error {}

function trustedAgentEndpoint(value: string, expectedHost: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new AnsUnavailableError("ANS returned an invalid agent endpoint."); }
  if (url.protocol !== "https:"
    || url.hostname.toLowerCase() !== expectedHost.toLowerCase()
    || url.username
    || url.password
    || url.port
    || url.search
    || url.hash) {
    throw new AnsUnavailableError("ANS returned an untrusted agent endpoint.");
  }
  return url;
}

function trustedDetailsUrl(value: string, baseUrl: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new AnsUnavailableError("ANS returned an invalid agent-details link."); }
  const base = new URL(baseUrl);
  if (url.origin !== base.origin || url.username || url.password || url.search || url.hash) {
    throw new AnsUnavailableError("ANS returned an untrusted agent-details link.");
  }
  return url;
}

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
  if (!parsed.success) throw new AnsUnavailableError("ANS returned an invalid resolution response.");

  const endpointHref = parsed.data.links.find((link) => link.rel === "agent-endpoint")?.href;
  if (endpointHref) return trustedAgentEndpoint(endpointHref, input.agentHost);

  // Production ANS may expose the registered endpoint through agent details while
  // its resolution response is still missing the documented agent-endpoint link.
  const detailsHref = parsed.data.links.find((link) => link.rel === "agent-details")?.href;
  if (!detailsHref) throw new AnsUnavailableError("ANS response did not include an agent endpoint.");
  const detailsUrl = trustedDetailsUrl(detailsHref, input.baseUrl);
  let detailsResponse: Response;
  try {
    detailsResponse = await (input.fetch ?? fetch)(detailsUrl, {
      headers: { authorization: `sso-key ${input.apiKey}`, accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch { throw new AnsUnavailableError("ANS agent details could not be reached."); }
  if (!detailsResponse.ok) throw new AnsUnavailableError("ANS agent details were unavailable.");
  const details = detailsSchema.safeParse(await detailsResponse.json().catch(() => null));
  if (!details.success
    || details.data.agentHost.toLowerCase() !== input.agentHost.toLowerCase()
    || details.data.version !== input.version) {
    throw new AnsUnavailableError("ANS agent details did not match the requested agent.");
  }
  const registeredEndpoint = details.data.endpoints.find((endpoint) => ["HTTP-API", "HTTP_API"].includes(endpoint.protocol));
  if (!registeredEndpoint) throw new AnsUnavailableError("ANS agent details did not include an HTTP API endpoint.");
  return trustedAgentEndpoint(registeredEndpoint.agentUrl, input.agentHost);
}
