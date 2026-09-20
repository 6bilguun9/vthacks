import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { readConfig } from "../src/config/env.js";

const applications: ReturnType<typeof createApp>[] = [];
function app() {
  const instance = createApp(readConfig({ LOG_LEVEL: "silent" }));
  applications.push(instance);
  return instance;
}
afterEach(async () => { await Promise.all(applications.splice(0).map((instance) => instance.close())); });

describe("API boundary", () => {
  it("starts without credentials and returns exactly the agreed health response", async () => {
    const response = await app().inject({ method: "GET", url: "/api/v1/health" });
    const expected = JSON.parse(readFileSync(new URL("../../contracts/examples/health.json", import.meta.url), "utf8"));
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expected);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("allows the configured browser origin and authorization preflight", async () => {
    const response = await app().inject({
      method: "OPTIONS", url: "/api/v1/health",
      headers: { origin: "http://localhost:3000", "access-control-request-method": "POST", "access-control-request-headers": "authorization,content-type" },
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
  });

  it.each(["https://unapproved.example", "http://localhost:3000.evil.example", "null"])("does not grant CORS access to %s", async (origin) => {
    const response = await app().inject({ method: "GET", url: "/api/v1/health", headers: { origin } });
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("does not mistake planned endpoints for implemented features", async () => {
    const spec = JSON.parse(readFileSync(new URL("../../contracts/openapi.json", import.meta.url), "utf8"));
    const instance = app();
    for (const [url, operations] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(operations as Record<string, Record<string, unknown>>)) {
        if (operation["x-implementation-status"] !== "planned") continue;
        const response = await instance.inject({ method: method.toUpperCase() as "GET" | "POST", url });
        expect(response.statusCode, url).toBe(404);
        expect(response.json().error.code).toBe("NOT_FOUND");
      }
    }
  });

  it("keeps internal exceptions out of the public error response", async () => {
    const instance = app();
    instance.get("/test-error", async () => { throw new Error("private-provider-secret"); });
    const response = await instance.inject({ method: "GET", url: "/test-error" });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("private-provider-secret");
    expect(response.json().error.code).toBe("INTERNAL_ERROR");
  });
});

describe("configuration", () => {
  it.each(["*", "https://example.com/path", "https://user:secret@example.com", "https://example.com/"])("rejects unsafe or non-origin CORS value %s", (value) => {
    expect(() => readConfig({ CORS_ORIGINS: value })).toThrow();
  });
  it("accepts an explicit comma-separated origin list", () => {
    expect(readConfig({ CORS_ORIGINS: "http://localhost:3000, https://app.example.com" }).CORS_ORIGINS)
      .toEqual(["http://localhost:3000", "https://app.example.com"]);
  });
  it("treats blank optional integration template values as unconfigured defaults", () => {
    expect(readConfig({
      NESSIE_BASE_URL: "", NESSIE_API_KEY: "", ANS_BASE_URL: "", ANS_API_KEY: "", COACH_AGENT_HOST: "", PLANNER_AGENT_HOST: "", ARC_API_KEY: "", llm_arc_api_key: "",
    })).toMatchObject({
      NESSIE_BASE_URL: "https://api.nessieisreal.com",
      NESSIE_API_KEY: undefined,
      ANS_BASE_URL: "https://api.godaddy.com/",
      ANS_API_KEY: undefined,
      COACH_AGENT_HOST: undefined,
      PLANNER_AGENT_HOST: undefined,
      ARC_API_KEY: undefined,
      llm_arc_api_key: undefined,
    });
  });
});
