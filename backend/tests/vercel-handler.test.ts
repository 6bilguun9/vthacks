import { describe, expect, it } from "vitest";
import handler from "../api/function.js";

describe("Vercel function handler", () => {
  it("serves the backend health endpoint", async () => {
    const response = await handler.fetch(new Request("https://api.example.test/api/v1/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "student-finance-api",
      apiVersion: "v1",
    });
  });

  it("restores the public API path after Vercel rewrites", async () => {
    const response = await handler.fetch(new Request(
      "https://api.example.test/api/function?__vercel_path=health",
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("returns a bodyless CORS preflight response", async () => {
    const response = await handler.fetch(new Request("https://api.example.test/api/v1/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
      },
    }));

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });
});
