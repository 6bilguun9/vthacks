import { describe, expect, it } from "vitest";
import { diningInput } from "../src/features/dining/dining-input";

function form() {
  const data = new FormData();
  Object.entries({ diningPlan: "Unlimited", studentStatus: "Off campus", diningBalance: "0.29", hokiePassportBalance: "20.5", weeksRemaining: "8", preferences: "Vegetarian" }).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("dining form request", () => {
  it("converts entered dollar decimals exactly and requires explicit permission for Passport funds", () => {
    expect(diningInput(form())).toMatchObject({ diningBalanceCents: 29, hokiePassportBalanceCents: 2050, allowHokiePassport: false });
    const data = form(); data.set("allowHokiePassport", "on");
    expect(diningInput(data).allowHokiePassport).toBe(true);
  });
  it.each(["", "-1", "1.005", "Infinity", "9007199254740992", "not a balance"])("rejects invalid or unsafe amount %s before the request", (amount) => {
    const data = form(); data.set("diningBalance", amount);
    expect(() => diningInput(data)).toThrow();
  });
  it("validates the plan, duration and trimmed preferences before sending", () => {
    const data = form(); data.set("preferences", "  ");
    expect(() => diningInput(data)).toThrow();
    data.set("preferences", "Vegetarian"); data.set("weeksRemaining", "37");
    expect(() => diningInput(data)).toThrow();
    data.set("weeksRemaining", "8"); data.set("diningPlan", "Invented plan");
    expect(() => diningInput(data)).toThrow();
  });
});
