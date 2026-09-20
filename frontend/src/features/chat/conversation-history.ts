import { z } from "zod";
import { chatResponseSchema, type ChatResponse } from "../../lib/api";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(20_000),
  backend: chatResponseSchema.optional(),
});
const conversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  createdAt: z.number().int().nonnegative().max(8.64e15),
  updatedAt: z.number().int().nonnegative().max(8.64e15),
  messages: z.array(messageSchema).min(1),
});
const historySchema = z.object({
  version: z.literal(1),
  activeId: z.string().nullable(),
  conversations: z.array(conversationSchema),
}).refine((value) => new Set(value.conversations.map((chat) => chat.id)).size === value.conversations.length);

export type Conversation = z.infer<typeof conversationSchema>;
export type ChatHistory = z.infer<typeof historySchema>;
export const emptyHistory: ChatHistory = { version: 1, activeId: null, conversations: [] };
export type HistoryAction =
  | { type: "new" }
  | { type: "select"; id: string }
  | { type: "remove"; id: string }
  | { type: "rename"; id: string; title: string }
  | { type: "discard-question"; id: string }
  | { type: "ask"; id: string; question: string; at: number }
  | { type: "reply"; id: string; questionIndex: number; question?: string; text: string; at: number; backend?: ChatResponse };

// A reducer describes how an action changes data, without changing the original object.
export function historyReducer(state: ChatHistory, action: HistoryAction): ChatHistory {
  if (action.type === "new") return { ...state, activeId: null };
  if (action.type === "select") {
    return state.conversations.some((chat) => chat.id === action.id) ? { ...state, activeId: action.id } : state;
  }
  if (action.type === "remove") {
    return { ...state, activeId: state.activeId === action.id ? null : state.activeId, conversations: state.conversations.filter((chat) => chat.id !== action.id) };
  }
  const existing = state.conversations.find((chat) => chat.id === action.id);
  if (action.type === "discard-question") {
    if (!existing || existing.messages.at(-1)?.role !== "user") return state;
    if (existing.messages.length === 1) return historyReducer(state, { type: "remove", id: action.id });
    return { ...state, conversations: state.conversations.map((chat) => chat.id === action.id ? { ...chat, messages: chat.messages.slice(0, -1) } : chat) };
  }
  if (action.type === "rename") {
    const title = action.title.trim();
    if (!existing || !title || title.length > 80) return state;
    return { ...state, conversations: state.conversations.map((chat) => chat.id === action.id ? { ...chat, title } : chat) };
  }
  if (action.type === "ask") {
    const question = action.question.trim();
    if (!question || existing?.messages.at(-1)?.role === "user") return state;
    const chat: Conversation = existing ?? { id: action.id, title: question.slice(0, 80), createdAt: action.at, updatedAt: action.at, messages: [] };
    const updated: Conversation = { ...chat, updatedAt: action.at, messages: [...chat.messages, { role: "user", text: question }] };
    return { ...state, activeId: action.id, conversations: [updated, ...state.conversations.filter((item) => item.id !== action.id)] };
  }
  // A delayed reply must never land in the newly selected chat or resurrect a deleted one.
  if (!existing || existing.messages.at(-1)?.role !== "user" || existing.messages.length - 1 !== action.questionIndex || (action.question !== undefined && existing.messages.at(-1)?.text !== action.question)) return state;
  return { ...state, conversations: state.conversations.map((chat) => chat.id === action.id ? { ...chat, updatedAt: action.at, messages: [...chat.messages, { role: "assistant", text: action.text, ...(action.backend ? { backend: action.backend } : {}) }] } : chat) };
}

export function readHistory(raw: string | null): { history: ChatHistory; warning: string | null } {
  if (!raw) return { history: emptyHistory, warning: null };
  try {
    const parsed = historySchema.parse(JSON.parse(raw));
    const activeId = parsed.conversations.some((chat) => chat.id === parsed.activeId) ? parsed.activeId : null;
    return { history: { ...parsed, activeId }, warning: null };
  } catch {
    return { history: emptyHistory, warning: "Saved chats could not be read. You can start a new conversation." };
  }
}

export function filterConversations(conversations: Conversation[], query: string) {
  const search = query.trim().toLocaleLowerCase();
  if (!search) return conversations;
  return conversations.filter((chat) => chat.title.toLocaleLowerCase().includes(search)
    || chat.messages.some((message) => message.text.toLocaleLowerCase().includes(search)));
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupConversations(conversations: Conversation[], now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const groups = new Map<string, { label: string; conversations: Conversation[] }>();
  for (const chat of [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const date = new Date(chat.updatedAt);
    const key = dateKey(date);
    const label = key === dateKey(now) ? "Today" : key === dateKey(yesterday) ? "Yesterday" : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!groups.has(key)) groups.set(key, { label, conversations: [] });
    groups.get(key)!.conversations.push(chat);
  }
  return [...groups.values()];
}

// Keep legacy sample chats, but never load them into a guest’s live conversation.
export function historyStorageKey(mode: "demo" | "live", userId: string | null) {
  return mode === "demo" ? "hokie-wallet-finbot-chats-v1" : userId ? `hokie-wallet-finbot-live-v1:${encodeURIComponent(userId)}` : null;
}
