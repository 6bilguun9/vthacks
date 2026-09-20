import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { readConfig } from "../src/config/env.js";

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
