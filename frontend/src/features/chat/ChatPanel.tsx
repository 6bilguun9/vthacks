"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowUp, History, MessageSquarePlus, PanelLeftClose } from "lucide-react";
import ChatHistory from "./ChatHistory";
import ConversationHeading from "./ConversationHeading";
import ConversationTranscript from "./ConversationTranscript";
import { canSendQuestion, QUESTION_LIMIT, shouldSendOnEnter } from "./composer-input";
import { type Conversation } from "./conversation-history";
import { getDemoReply } from "./demo-replies";
import { demoData } from "@/features/dashboard/demo-data";
import { useChatHistory } from "./use-chat-history";

const noMessages: Conversation["messages"] = [];

export default function ChatPanel({ isVisible = true }: { isVisible?: boolean }) {
  const { history, dispatch, ready, warning } = useChatHistory();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const id = useId();
  const shellRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const activeChat = history.conversations.find((chat) => chat.id === history.activeId);
  const messages = activeChat?.messages ?? noMessages;
  const draftKey = activeChat?.id ?? "new";
  const input = drafts[draftKey] ?? "";
  const thinkingHere = pendingId !== null && pendingId === activeChat?.id;
  const interrupted = !pendingId && messages.at(-1)?.role === "user";
  const showHistory = wide || historyOpen;
  const overLimit = input.length > QUESTION_LIMIT;

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    // Observe this panel, because it is narrower inside the dashboard overview.
    const observer = new ResizeObserver(([entry]) => setWide((entry?.contentRect.width ?? 0) >= 720));
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (pendingRef.current) clearTimeout(pendingRef.current.timer);
  }, []);

  function prepareReply(chatId: string, question: string, questionIndex: number) {
    setPendingId(chatId);
    pendingRef.current = { id: chatId, timer: setTimeout(() => {
      dispatch({ type: "reply", id: chatId, questionIndex, text: getDemoReply(question), at: new Date().getTime() });
      pendingRef.current = null;
      setPendingId(null);
    }, 900) };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!ready || !canSendQuestion(input) || pendingRef.current || interrupted) return;
    const chatId = activeChat?.id ?? crypto.randomUUID();
    dispatch({ type: "ask", id: chatId, question, at: new Date().getTime() });
    setDrafts((previous) => ({ ...previous, [draftKey]: "", [chatId]: "" }));
    setAnnouncement("");
    prepareReply(chatId, question, activeChat?.messages.length ?? 0);
    inputRef.current?.focus();
  }

  function selectChat(chatId: string) {
    dispatch({ type: "select", id: chatId });
    setHistoryOpen(false);
    setAnnouncement("Conversation opened.");
    inputRef.current?.focus();
  }

  function newChat() {
    dispatch({ type: "new" });
    setDrafts((previous) => ({ ...previous, new: "" }));
    setHistoryOpen(false);
    setAnnouncement("New chat started.");
    inputRef.current?.focus();
  }

  function removeChat(chatId: string) {
    if (pendingRef.current?.id === chatId) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
      setPendingId(null);
    }
    dispatch({ type: "remove", id: chatId });
    setAnnouncement("Conversation deleted from this browser.");
    inputRef.current?.focus();
  }

  return (
    <section id="finbot" ref={shellRef} data-finbot data-wide={wide} data-empty={messages.length === 0} className="finbot-chat" lang="en" dir="ltr" aria-labelledby={`${id}-title`}>
      <header className="fb-header">
        <div className="fb-brand">
          <Image className="fb-logo" src="/finbot/team-logo.png" alt="Our team’s orange robot logo" width={445} height={473} sizes="60px" />
          <div><h1 id={`${id}-title`}>FinBot</h1><p id={`${id}-disclaimer`} className="fb-disclaimer">Sample replies · No accounts connected.</p></div>
        </div>
        <div className="fb-header-tools">
          <span className="fb-date">{demoData.month} {demoData.year}</span>
          <div className="fb-toolbar">
            <button ref={historyButtonRef} className="fb-history-toggle" type="button" hidden={wide} aria-expanded={showHistory} aria-controls={`${id}-history`} onClick={() => setHistoryOpen((open) => !open)}>
              {showHistory ? <PanelLeftClose aria-hidden="true" /> : <History aria-hidden="true" />}History<span className="fb-count">{history.conversations.length}</span>
            </button>
            <button className="fb-new-chat" type="button" onClick={newChat} disabled={!ready}><MessageSquarePlus aria-hidden="true" />New chat</button>
          </div>
        </div>
      </header>
      <div className="fb-workspace">
        <aside id={`${id}-history`} className="fb-history" hidden={!showHistory} aria-label="FinBot chat history" onKeyDown={(event) => {
          if (event.key === "Escape" && !wide) { setHistoryOpen(false); historyButtonRef.current?.focus(); }
        }}>
          <ChatHistory conversations={history.conversations} activeId={history.activeId} onSelect={selectChat} onRemove={removeChat} />
        </aside>
        <div className="fb-conversation">
          {activeChat && <ConversationHeading key={`heading-${activeChat.id}`} title={activeChat.title} onRename={(title) => {
            if (!activeChat) return;
            dispatch({ type: "rename", id: activeChat.id, title });
            setAnnouncement("Chat renamed.");
          }} />}
          <ConversationTranscript key={`transcript-${activeChat?.id ?? "new"}`} messages={messages} ready={ready} thinking={thinkingHere} isVisible={isVisible} />
          <div className="fb-composer">
            <p id={`${id}-status`} className={`fb-status${interrupted ? "" : " sr-only"}`} role="status">
              {pendingId ? thinkingHere ? "Preparing your sample reply…" : "Finishing a reply in another chat…" : interrupted ? "Reply interrupted. Resume to continue." : announcement}
            </p>
            {interrupted && <button className="fb-resume" type="button" onClick={() => {
              if (activeChat && !pendingRef.current) prepareReply(activeChat.id, messages.at(-1)!.text, messages.length - 1);
            }}>Resume sample reply</button>}
            <form onSubmit={handleSubmit}>
              <div className="fb-input-row">
                <label htmlFor={`${id}-input`}>Message FinBot</label>
                <textarea ref={inputRef} id={`${id}-input`} dir="auto" rows={2} value={input} onChange={(event) => { const value = event.target.value; setDrafts((previous) => ({ ...previous, [draftKey]: value })); }} onKeyDown={(event) => {
                  if (shouldSendOnEnter({ key: event.key, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing, keyCode: event.nativeEvent.keyCode })) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }} aria-describedby={`${id}-disclaimer ${id}-input-help ${id}-count`} aria-invalid={overLimit || undefined} aria-keyshortcuts="Enter" placeholder="Ask about your money…" autoComplete="off" />
                <div className="fb-composer-actions">
                  <span className="fb-composer-signature" aria-hidden="true">One step at a time.</span>
                  <button className="fb-send" type="submit" disabled={!ready || pendingId !== null || interrupted || !canSendQuestion(input)}><span>{thinkingHere ? "Preparing…" : "Send"}</span><ArrowUp aria-hidden="true" /></button>
                </div>
              </div>
              <div className="fb-input-help">
                <p id={`${id}-input-help`}>Enter to send · Shift+Enter for a new line</p>
                <p id={`${id}-count`} className={input.length < 800 ? "sr-only" : undefined} data-invalid={overLimit}>{overLimit ? `${input.length - QUESTION_LIMIT} ${input.length - QUESTION_LIMIT === 1 ? "character" : "characters"} over limit` : `${QUESTION_LIMIT - input.length} ${QUESTION_LIMIT - input.length === 1 ? "character" : "characters"} left`}</p>
              </div>
            </form>
            {warning && <p className="fb-storage-warning" role="alert">{warning}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
