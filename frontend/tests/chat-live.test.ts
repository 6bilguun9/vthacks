import { describe, expect, it } from "vitest";
import { ApiError } from "../src/lib/api";
import { executionLabels, liveRequestError } from "../src/features/chat/live-chat";

describe("live FinBot status copy", () => {
  it("does not present local or unavailable results as ANS success", () => {
    expect(executionLabels.ans_remote).toBe("Signed ANS planner response");
    expect(executionLabels.local_fallback).toContain("ANS not used");
    expect(executionLabels.unavailable).toBe("No new planner comparison");
  });
  it("explains presenter restriction rather than suggesting an auth bypass", () => {
    expect(liveRequestError(new ApiError("Forbidden", "http", 403), "chat")).toContain("reconnecting will not bypass");
  });
  it("asks for explicit retry after a plan version conflict", () => {
    const message = liveRequestError(new ApiError("Conflict", "http", 409), "chat");
    expect(message).toContain("Reloading the latest data");
    expect(message).toContain("then retry");
  });
});
