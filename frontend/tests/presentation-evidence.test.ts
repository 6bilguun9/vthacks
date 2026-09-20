import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { backendExample, presentationDate } from "../src/features/presentation/backend-example";
import { presentationMedia } from "../src/features/presentation/presentation-media";

describe("presentation evidence", () => {
  it("replays the actual checked-in synthetic contract response without changing its financial results", () => {
    const source = JSON.parse(readFileSync(new URL("../../contracts/examples/scenario-goal-delay.json", import.meta.url), "utf8"));
    expect(backendExample.response).toEqual(source);
    expect(backendExample.purchaseCents).toBe(
      source.funding.discretionaryCents + source.funding.unallocatedCents + source.funding.goalCents,
    );
    expect(backendExample.impact.nextWeekAffordable).toBeNull();
    expect(backendExample.impact.remainingWeeklyAffordable).toBeNull();
  });

  it("displays calendar dates consistently in any presenter timezone", () => {
    expect(presentationDate(backendExample.impact.originalDate)).toBe("Nov 16");
    expect(presentationDate(backendExample.impact.revisedDate)).toBe("Nov 23");
  });

  it("ships every presentation image with the correct file type", () => {
    for (const file of Object.values(presentationMedia)) {
      const image = readFileSync(new URL(`../public${file}`, import.meta.url));
      if (file.endsWith(".jpg")) {
        expect(image.subarray(0, 3).toString("hex"), file).toBe("ffd8ff");
      } else {
        expect(image.subarray(0, 8).toString("hex"), file).toBe("89504e470d0a1a0a");
      }
      expect(image.byteLength, file).toBeGreaterThan(1000);
    }
  });
});
