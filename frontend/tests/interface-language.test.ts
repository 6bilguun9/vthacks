import { describe, expect, it } from "vitest";
import { getInterfaceCopy, isRtlLanguage, languageOptions } from "../src/features/dashboard/interface-language";

describe("interface languages", () => {
  it("offers ten unique languages with complete navigation and view headings", () => {
    expect(languageOptions).toHaveLength(10);
    expect(new Set(languageOptions.map((language) => language.code)).size).toBe(10);

    for (const language of languageOptions) {
      const copy = getInterfaceCopy(language.code);
      expect(Object.values(copy.nav).every(Boolean)).toBe(true);
      expect(Object.values(copy.views).every((view) => view.title && view.description)).toBe(true);
      expect(copy.languageHelp).toBeTruthy();
    }
  });

  it("marks Arabic and Urdu for right-to-left layout", () => {
    expect(isRtlLanguage("ar")).toBe(true);
    expect(isRtlLanguage("ur")).toBe(true);
    expect(isRtlLanguage("en")).toBe(false);
  });
});
