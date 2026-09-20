import { describe, expect, it } from "vitest";
import { canSendQuestion, shouldSendOnEnter } from "../src/features/chat/composer-input";

describe("FinBot question composer", () => {
  it("accepts multiline questions but rejects blank and overlong input without truncating it", () => {
    expect(canSendQuestion("My budget:\nFood and transport?")).toBe(true);
    expect(canSendQuestion(" \n \t")).toBe(false);
    expect(canSendQuestion("x".repeat(1000))).toBe(true);
    expect(canSendQuestion("x".repeat(1001))).toBe(false);
  });

  it("uses Enter to send and leaves Shift+Enter for a new line", () => {
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: false, isComposing: false })).toBe(true);
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: true, isComposing: false })).toBe(false);
    expect(shouldSendOnEnter({ key: "a", shiftKey: false, isComposing: false })).toBe(false);
  });

  it("never sends while an input method is composing a character", () => {
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: false, isComposing: true })).toBe(false);
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: false, isComposing: false, keyCode: 229 })).toBe(false);
  });
});
