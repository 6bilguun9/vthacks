import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { readConfig } from "../src/config/env.js";

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

describe("dining planner", () => {
  it("rejects dollar floats because the contract uses integer cents", async () => {
    const app = createApp(readConfig({ LOG_LEVEL: "silent" })); apps.push(app);
    const response = await app.inject({ method: "POST", url: "/api/v1/dining-plans", payload: { diningPlan: "Unlimited", studentStatus: "First-year, on campus", diningBalanceCents: 22.5, hokiePassportBalanceCents: 0, weeksRemaining: 15, preferences: "vegetarian" } });
    expect(response.statusCode).toBe(422);
  });

  it("does not expose the AI provider without configured guest authentication", async () => {
    const app = createApp(readConfig({ LOG_LEVEL: "silent" })); apps.push(app);
    const response = await app.inject({ method: "POST", url: "/api/v1/dining-plans", payload: { diningPlan: "Unlimited", studentStatus: "First-year, on campus", diningBalanceCents: 22500, hokiePassportBalanceCents: 0, weeksRemaining: 15, preferences: "vegetarian" } });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe("STORAGE_UNAVAILABLE");
  });
});
