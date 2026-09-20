"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowUp, ArrowUpRight, Check, FlaskConical, History, MessageSquarePlus, PanelLeftClose, ShieldCheck } from "lucide-react";
import ChatHistory from "./ChatHistory";
import ConversationHeading from "./ConversationHeading";
import ConversationTranscript from "./ConversationTranscript";
import { canSendQuestion, QUESTION_LIMIT, shouldSendOnEnter } from "./composer-input";
import { type Conversation } from "./conversation-history";
import { getDemoReply, suggestedQuestions } from "./demo-replies";
import { useChatHistory } from "./use-chat-history";
import "./chat.css";

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
    setAnnouncement("New conversation. Choose a question or type your own.");
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
    <section id="finbot" ref={shellRef} data-finbot data-wide={wide} className="finbot-chat" aria-labelledby={`${id}-title`}>
      <header className="fb-header">
        <div className="fb-brand">
          <Image className="fb-logo" src="/finbot/team-logo.png" alt="Our team’s orange robot logo" width={445} height={473} sizes="56px" />
          <div><p className="fb-kicker">A LITTLE CLARITY GOES A LONG WAY</p><h2 id={`${id}-title`}>Ask FinBot<span aria-hidden="true">.</span></h2></div>
        </div>
        <span className="fb-sample"><FlaskConical aria-hidden="true" />Sample mode</span>
      </header>
      <div className="fb-toolbar">
        <button ref={historyButtonRef} className="fb-history-toggle" type="button" hidden={wide} aria-expanded={showHistory} aria-controls={`${id}-history`} onClick={() => setHistoryOpen((open) => !open)}>
          {showHistory ? <PanelLeftClose aria-hidden="true" /> : <History aria-hidden="true" />}History<span className="fb-count">{history.conversations.length}</span>
        </button>
        <button className="fb-new-chat" type="button" onClick={newChat} disabled={!ready}><MessageSquarePlus aria-hidden="true" />New chat</button>
        <span className="fb-storage"><ShieldCheck aria-hidden="true" />Only on this browser</span>
      </div>
      <div className="fb-workspace">
        <aside id={`${id}-history`} className="fb-history" hidden={!showHistory} aria-label="FinBot chat history" onKeyDown={(event) => {
          if (event.key === "Escape" && !wide) { setHistoryOpen(false); historyButtonRef.current?.focus(); }
        }}>
          <ChatHistory conversations={history.conversations} activeId={history.activeId} onSelect={selectChat} onRemove={removeChat} />
        </aside>
        <div className="fb-conversation">
          <ConversationHeading key={`heading-${activeChat?.id ?? "new"}`} title={activeChat?.title} onRename={(title) => {
            if (!activeChat) return;
            dispatch({ type: "rename", id: activeChat.id, title });
            setAnnouncement("Chat renamed.");
          }} />
          <p id={`${id}-disclaimer`} className="fb-disclaimer">Scripted replies from the sample profile. No accounts connected.</p>
          <ConversationTranscript key={`transcript-${activeChat?.id ?? "new"}`} messages={messages} ready={ready} thinking={thinkingHere} isVisible={isVisible} />
          <div className="fb-composer">
            <p className="fb-suggestions-label">{messages.length ? "KEEP EXPLORING" : "TRY A SAMPLE QUESTION"}</p>
            <div className="fb-suggestions" data-expanded={messages.length === 0} role="group" aria-label="Suggested sample questions">
              {suggestedQuestions.map((example) => (
                <button key={example.label} type="button" disabled={!ready || pendingId !== null || interrupted} aria-label={`${example.label}: ${example.question}`} title={example.question} onClick={() => {
                  setDrafts((previous) => ({ ...previous, [draftKey]: example.question }));
                  inputRef.current?.focus();
                }}><span>{messages.length === 0 ? <><strong>{example.label}</strong><span>{example.question}</span></> : example.label}</span><ArrowUpRight aria-hidden="true" /></button>
              ))}
            </div>
            <p id={`${id}-status`} className="fb-status" role="status">
              {pendingId ? thinkingHere ? "Preparing your sample reply. You can draft your next question." : "Finishing a reply in another chat. You can keep drafting." : interrupted ? "This reply was interrupted. Resume it to keep chatting." : announcement || (messages.length ? "Ready for your next question." : "Choose a topic or ask a question below.")}
            </p>
            {interrupted && <button className="fb-resume" type="button" onClick={() => {
              if (activeChat && !pendingRef.current) prepareReply(activeChat.id, messages.at(-1)!.text, messages.length - 1);
            }}>Resume sample reply</button>}
            <form onSubmit={handleSubmit}>
              <label htmlFor={`${id}-input`}>Your question</label>
              <div className="fb-input-row">
                <textarea ref={inputRef} id={`${id}-input`} rows={3} value={input} onChange={(event) => { const value = event.target.value; setDrafts((previous) => ({ ...previous, [draftKey]: value })); }} onKeyDown={(event) => {
                  if (shouldSendOnEnter({ key: event.key, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing, keyCode: event.nativeEvent.keyCode })) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }} aria-describedby={`${id}-disclaimer ${id}-input-help ${id}-count`} aria-invalid={overLimit || undefined} aria-keyshortcuts="Enter" placeholder="What’s on your mind?" autoComplete="off" />
                <button className="fb-send" type="submit" disabled={!ready || pendingId !== null || interrupted || !canSendQuestion(input)}><span>{thinkingHere ? "Preparing…" : "Send"}</span><ArrowUp aria-hidden="true" /></button>
              </div>
              <div className="fb-input-help">
                <p id={`${id}-input-help`}>Enter to send · Shift+Enter for a new line</p>
                <p id={`${id}-count`} data-invalid={overLimit}>{overLimit ? `${input.length - QUESTION_LIMIT} ${input.length - QUESTION_LIMIT === 1 ? "character" : "characters"} over limit` : `${QUESTION_LIMIT - input.length} ${QUESTION_LIMIT - input.length === 1 ? "character" : "characters"} left`}</p>
              </div>
            </form>
            {!warning && <p className="fb-save-note"><Check aria-hidden="true" />Conversations stay here after refresh.</p>}
            {warning && <p className="fb-storage-warning" role="alert">{warning}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
