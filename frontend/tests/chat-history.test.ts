import { describe, expect, it } from "vitest";
import { emptyHistory, filterConversations, groupConversations, historyStorageKey, historyReducer, readHistory } from "../src/features/chat/conversation-history";

const morning = new Date(2026, 8, 19, 9).getTime();
const first = () => historyReducer(emptyHistory, { type: "ask", id: "spending", question: "  What have I spent this month?  ", at: morning });

describe("FinBot conversation history", () => {
  it("renames a conversation without changing its messages or activity date", () => {
    const state = first();
    const result = historyReducer(state, { type: "rename", id: "spending", title: "  My September budget  " });
    expect(result.conversations[0]?.title).toBe("My September budget");
    expect(result.conversations[0]?.messages).toEqual(state.conversations[0]?.messages);
    expect(result.conversations[0]?.updatedAt).toBe(morning);
    expect(readHistory(JSON.stringify(result)).history.conversations[0]?.title).toBe("My September budget");
    expect(historyReducer(state, { type: "rename", id: "spending", title: "   " })).toEqual(state);
    expect(historyReducer(state, { type: "rename", id: "spending", title: "x".repeat(81) })).toEqual(state);
  });

  it("finds chats by title or message without changing their date order", () => {
    const state = historyReducer(first(), { type: "reply", id: "spending", questionIndex: 0, text: "Sample transportation total: $60", at: morning + 900 });
    expect(filterConversations(state.conversations, "  TRANSPORTATION  ").map((c) => c.id)).toEqual(["spending"]);
    expect(filterConversations(state.conversations, "spent").map((c) => c.id)).toEqual(["spending"]);
    expect(filterConversations(state.conversations, "rent")).toEqual([]);
    expect(filterConversations(state.conversations, "  ")).toEqual(state.conversations);
  });

  it("names a new conversation from its first question and keeps it when continuing", () => {
    const started = first();
    expect(started.activeId).toBe("spending");
    expect(started.conversations[0]?.title).toBe("What have I spent this month?");
    const answered = historyReducer(started, { type: "reply", questionIndex: 0, id: "spending", text: "Sample spending", at: morning + 900 });
    const continued = historyReducer(answered, { type: "ask", id: "spending", question: "What are my balances?", at: morning + 2000 });
    expect(continued.conversations).toHaveLength(1);
    expect(continued.conversations[0]?.title).toBe("What have I spent this month?");
    expect(continued.conversations[0]?.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("rejects empty questions and duplicate submissions while a reply is pending", () => {
    expect(historyReducer(emptyHistory, { type: "ask", id: "empty", question: "   ", at: morning }).conversations).toEqual([]);
    const state = first();
    expect(historyReducer(state, { type: "ask", id: "spending", question: "Duplicate", at: morning + 1 })).toEqual(state);
  });

  it("delivers a delayed response to its original chat after switching conversations", () => {
    const second = historyReducer(first(), { type: "ask", id: "savings", question: "How is my savings goal doing?", at: morning + 1 });
    const result = historyReducer(second, { type: "reply", questionIndex: 0, id: "spending", text: "Sample spending", at: morning + 900 });
    expect(result.activeId).toBe("savings");
    expect(result.conversations.find((c) => c.id === "spending")?.messages.at(-1)?.text).toBe("Sample spending");
    expect(result.conversations.find((c) => c.id === "savings")?.messages).toHaveLength(1);
  });

  it("rejects an older tab's delayed reply after the original question is answered", () => {
    const answered = historyReducer(first(), { type: "reply", questionIndex: 0, id: "spending", text: "First answer", at: morning + 900 });
    const followUp = historyReducer(answered, { type: "ask", id: "spending", question: "What are my balances?", at: morning + 1000 });
    const stale = historyReducer(followUp, { type: "reply", questionIndex: 0, id: "spending", text: "Old spending answer", at: morning + 1100 });
    expect(stale.conversations[0]?.messages).toHaveLength(3);
    expect(stale.conversations[0]?.messages.at(-1)?.text).toBe("What are my balances?");
  });

  it("starts a blank chat without adding empty entries or losing earlier conversations", () => {
    const state = historyReducer(first(), { type: "new" });
    expect(state.activeId).toBeNull();
    expect(state.conversations).toHaveLength(1);
    expect(historyReducer(state, { type: "select", id: "spending" }).activeId).toBe("spending");
    expect(historyReducer(state, { type: "select", id: "missing" }).activeId).toBeNull();
  });

  it("removes a chat without allowing an old pending reply to recreate it", () => {
    const removed = historyReducer(first(), { type: "remove", id: "spending" });
    expect(removed.activeId).toBeNull();
    expect(historyReducer(removed, { type: "reply", questionIndex: 0, id: "spending", text: "Late reply", at: morning + 900 }).conversations).toEqual([]);
  });

  it("restores saved messages and the selected conversation", () => {
    const result = readHistory(JSON.stringify(first()));
    expect(result.warning).toBeNull();
    expect(result.history.activeId).toBe("spending");
    expect(result.history.conversations[0]?.messages[0]?.text).toBe("What have I spent this month?");
  });

  it.each(["broken JSON", '{"version":12}', '{"version":1,"activeId":null,"conversations":[{"messages":"broken"}]}'])
  ("recovers from invalid saved history: %s", (raw) => {
    const result = readHistory(raw);
    expect(result.history.conversations).toEqual([]);
    expect(result.warning).toBeTruthy();
  });

  it("clears a stale selected id instead of displaying a missing conversation", () => {
    expect(readHistory(JSON.stringify({ ...first(), activeId: "missing" })).history.activeId).toBeNull();
  });

  it("groups by local calendar date and puts recently updated conversations first", () => {
    let state = first();
    state = historyReducer(state, { type: "ask", id: "yesterday", question: "Yesterday", at: new Date(2026, 8, 18, 23, 59).getTime() });
    state = historyReducer(state, { type: "ask", id: "older", question: "Older", at: new Date(2026, 8, 16, 12).getTime() });
    state = historyReducer(state, { type: "ask", id: "latest", question: "Latest", at: new Date(2026, 8, 19, 18).getTime() });
    const groups = groupConversations(state.conversations, new Date(2026, 8, 19, 19));
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "September 16, 2026"]);
    expect(groups[0]?.conversations.map((c) => c.id)).toEqual(["latest", "spending"]);
  });
});


describe("live chat isolation and recovery", () => {
  it("keeps legacy samples and each guest in distinct stores, with no disconnected live store", () => {
    expect(historyStorageKey("demo", null)).toBe("hokie-wallet-finbot-chats-v1");
    expect(historyStorageKey("demo", "guest-a")).toBe(historyStorageKey("demo", null));
    expect(historyStorageKey("live", null)).toBeNull();
    expect(historyStorageKey("live", "guest-a")).not.toBe(historyStorageKey("demo", null));
    expect(historyStorageKey("live", "guest-a")).not.toBe(historyStorageKey("live", "guest-b"));
  });

  it("allows editing an unanswered question without leaving a duplicate", () => {
    const discarded = historyReducer(first(), { type: "discard-question", id: "spending" });
    expect(discarded.conversations).toEqual([]);
    const answered = historyReducer(first(), { type: "reply", id: "spending", questionIndex: 0, text: "Answer", at: morning + 1 });
    expect(historyReducer(answered, { type: "discard-question", id: "spending" })).toEqual(answered);
    const followup = historyReducer(answered, { type: "ask", id: "spending", question: "Unanswered", at: morning + 2 });
    expect(historyReducer(followup, { type: "discard-question", id: "spending" }).conversations[0]?.messages).toEqual(answered.conversations[0]?.messages);
  });

  it("ignores an old tab’s reply after the unanswered question was edited", () => {
    const answered = historyReducer(first(), { type: "reply", id: "spending", questionIndex: 0, text: "Answer", at: morning + 1 });
    const question = historyReducer(answered, { type: "ask", id: "spending", question: "Original question", at: morning + 2 });
    const removed = historyReducer(question, { type: "discard-question", id: "spending" });
    const edited = historyReducer(removed, { type: "ask", id: "spending", question: "Changed amount and date", at: morning + 3 });
    expect(historyReducer(edited, { type: "reply", id: "spending", questionIndex: 2, question: "Original question", text: "Stale answer", at: morning + 4 })).toEqual(edited);
  });

  it("retains truthful backend execution metadata and rejects malformed comparisons on restore", () => {
    const backend = { kind: "clarification" as const, text: "Which date?", comparison: null, executionSource: "unavailable" as const };
    const answer = historyReducer(first(), { type: "reply", id: "spending", questionIndex: 0, text: backend.text, backend, at: morning + 1 });
    expect(readHistory(JSON.stringify(answer)).history.conversations[0]?.messages.at(-1)?.backend).toEqual(backend);
    const invalid = JSON.stringify(answer).replace('"kind":"clarification"', '"kind":"comparison"');
    expect(readHistory(invalid).warning).toBeTruthy();
  });
});
