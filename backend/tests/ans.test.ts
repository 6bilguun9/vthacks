import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { readConfig } from "../src/config/env.js";
import { AnsUnavailableError, resolveAgentEndpoint } from "../src/integrations/ans.js";

const applications: ReturnType<typeof createApp>[] = [];

afterEach(async () => { await Promise.all(applications.splice(0).map((instance) => instance.close())); });

describe("ANS CLI configuration", () => {
  it("defaults CLI wrappers to GoDaddy production and accepts only a complete API-key pair", () => {
    expect(readConfig({ LOG_LEVEL: "silent" }).ANS_BASE_URL).toBe("https://api.godaddy.com/");
    expect(readConfig({ ANS_API_KEY: "key:secret" }).ANS_API_KEY).toBe("key:secret");
    expect(() => readConfig({ ANS_API_KEY: "key-only" })).toThrow("KEY:SECRET");
    expect(() => readConfig({ ANS_BASE_URL: "https://api.godaddy.com/v1" })).toThrow("without credentials, a path");
  });
});

describe("agent development endpoints", () => {
  it("publishes runtime metadata without claiming verified ANS registration", async () => {
    const app = createApp(readConfig({
      LOG_LEVEL: "silent",
      COACH_AGENT_HOST: "coach.example.com",
      PLANNER_AGENT_HOST: "planner.example.com",
    }));
    applications.push(app);

    const descriptor = await app.inject({ method: "GET", url: "/api/v1/agents/coach" });
    expect(descriptor.statusCode).toBe(200);
    expect(descriptor.json()).toMatchObject({
      implementationStatus: "implemented",
      agent: { id: "coach", agentUrl: "https://coach.example.com/api/v1/agents/coach" },
    });

    const invocation = await app.inject({ method: "POST", url: "/api/v1/agents/coach" });
    expect(invocation.statusCode).toBe(503);
    expect(invocation.json().error.code).toBe("STORAGE_UNAVAILABLE");
  });
});

const input = {
  baseUrl: "https://api.godaddy.com/",
  apiKey: "key:secret",
  agentHost: "planner.example.com",
  version: "0.1.1",
};

it("uses a trusted endpoint returned directly by ANS resolution", async () => {
  const fetcher: typeof fetch = async (request, init) => {
    expect(String(request)).toBe("https://api.godaddy.com/v1/agents/resolution");
    expect(new Headers(init?.headers).get("authorization")).toBe("sso-key key:secret");
    return new Response(JSON.stringify({
      links: [{ rel: "agent-endpoint", href: "https://planner.example.com/api/v1/agents/planner" }],
    }));
  };

  const endpoint = await resolveAgentEndpoint({ ...input, fetch: fetcher });
  expect(endpoint.href).toBe("https://planner.example.com/api/v1/agents/planner");
});

it("falls back to the registered HTTP API endpoint in same-origin agent details", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (request, init) => {
    const url = String(request); calls.push(url);
    expect(new Headers(init?.headers).get("authorization")).toBe("sso-key key:secret");
    if (url.endsWith("/v1/agents/resolution")) {
      return new Response(JSON.stringify({
        links: [{ rel: "agent-details", href: "https://api.godaddy.com/v1/agents/agent-1" }],
      }));
    }
    return new Response(JSON.stringify({
      agentHost: "planner.example.com",
      version: "0.1.1",
      agentStatus: "ACTIVE",
      endpoints: [{ protocol: "HTTP-API", agentUrl: "https://planner.example.com/api/v1/agents/planner" }],
    }));
  };

  const endpoint = await resolveAgentEndpoint({ ...input, fetch: fetcher });
  expect(endpoint.href).toBe("https://planner.example.com/api/v1/agents/planner");
  expect(calls).toEqual([
    "https://api.godaddy.com/v1/agents/resolution",
    "https://api.godaddy.com/v1/agents/agent-1",
  ]);
});

it("does not send ANS credentials to a cross-origin agent-details link", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (request) => {
    calls.push(String(request));
    return new Response(JSON.stringify({
      links: [{ rel: "agent-details", href: "https://attacker.example/v1/agents/agent-1" }],
    }));
  };

  await expect(resolveAgentEndpoint({ ...input, fetch: fetcher })).rejects.toBeInstanceOf(AnsUnavailableError);
  expect(calls).toEqual(["https://api.godaddy.com/v1/agents/resolution"]);
});

it("rejects registered endpoints that do not match the requested agent host", async () => {
  const fetcher: typeof fetch = async (request) => {
    if (String(request).endsWith("/v1/agents/resolution")) {
      return new Response(JSON.stringify({
        links: [{ rel: "agent-details", href: "https://api.godaddy.com/v1/agents/agent-1" }],
      }));
    }
    return new Response(JSON.stringify({
      agentHost: "planner.example.com",
      version: "0.1.1",
      agentStatus: "ACTIVE",
      endpoints: [{ protocol: "HTTP-API", agentUrl: "https://attacker.example/api/v1/agents/planner" }],
    }));
  };

  await expect(resolveAgentEndpoint({ ...input, fetch: fetcher })).rejects.toThrow("untrusted agent endpoint");
});

it("rejects inactive or version-mismatched agent details", async () => {
  const fetcher: typeof fetch = async (request) => {
    if (String(request).endsWith("/v1/agents/resolution")) {
      return new Response(JSON.stringify({
        links: [{ rel: "agent-details", href: "https://api.godaddy.com/v1/agents/agent-1" }],
      }));
    }
    return new Response(JSON.stringify({
      agentHost: "planner.example.com",
      version: "0.1.0",
      agentStatus: "PENDING_DNS",
      endpoints: [{ protocol: "HTTP-API", agentUrl: "https://planner.example.com/api/v1/agents/planner" }],
    }));
  };

  await expect(resolveAgentEndpoint({ ...input, fetch: fetcher })).rejects.toThrow("did not match the requested agent");
});
