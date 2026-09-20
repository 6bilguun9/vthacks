"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { ArrowUpRight, MessageSquare } from "lucide-react";
import { getDemoReply, suggestedQuestions } from "./demo-replies";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function ChatPanel({ isVisible = true }: { isVisible?: boolean }) {
  // State remembers values between renders and updates the screen when they change.
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "user", text: suggestedQuestions[1].question },
    { role: "assistant", text: suggestedQuestions[1].answer },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Cancel the fake response if this component is removed from the page.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (isVisible && conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, isThinking, isVisible]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Keep submitting the form from refreshing the page.
    const question = input.trim();
    // A ref updates immediately, so rapid Enter presses cannot start two replies.
    if (!question || timerRef.current !== null) return;

    setMessages((previous) => [...previous, { role: "user", text: question }]);
    setInput("");
    setIsThinking(true);
    inputRef.current?.focus();

    // This delay imitates a response; it never calls an API or reads bank data.
    timerRef.current = setTimeout(() => {
      const answer = getDemoReply(question);
      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: answer },
      ]);
      timerRef.current = null;
      setIsThinking(false);
    }, 900);
  }

  const focusStyle =
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#861f41]";

  return (
    <section
      id="finbot"
      aria-labelledby={`${id}-title`}
      className="finbot-chat flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#e5e1df] bg-[#fffdfb] text-stone-900"
    >
      <header className="border-b border-stone-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#f6eaf0] text-[#861f41]">
              <MessageSquare aria-hidden="true" />
            </span>
            <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
              Ask FinBot
            </h2>
          </div>
          <span className="rounded-md border border-[#e7d8c8] bg-[#fbf4e9] px-2 py-1 text-[10px] font-medium text-[#775331]">
            Sample replies
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Good questions. Clearer choices.
        </p>
        <p id={`${id}-disclaimer`} className="mt-2 text-xs leading-5 text-stone-600">
          Scripted answers from the sample profile. No accounts are connected.
        </p>
      </header>

      <div
        ref={conversationRef}
        role="log"
        aria-label="FinBot conversation"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        className={`max-h-[28rem] min-h-64 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-white p-5 sm:p-6 ${focusStyle}`}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "user" ? "ml-auto max-w-[90%]" : "max-w-[95%]"}
          >
            <p className="mb-1.5 text-xs font-semibold text-stone-600">
              {message.role === "user" ? "You" : "FinBot · sample response"}
            </p>
            <p
              className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "rounded-tr-sm bg-[#861f41] text-white"
                  : "rounded-tl-sm border border-stone-200 bg-stone-50 text-stone-800"
              }`}
            >
              {message.text}
            </p>
          </div>
        ))}
        {isThinking && (
          // The status below announces loading; hide this visual copy from screen readers.
          <div aria-hidden="true" className="max-w-[95%]">
            <p className="mb-1.5 text-xs font-semibold text-stone-600">FinBot · demo</p>
            <p className="rounded-2xl rounded-tl-sm border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
              Preparing a sample response…
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-stone-200 p-5 sm:p-6">
        <p id={`${id}-status`} role="status" className="mb-4 min-h-5 text-xs text-stone-600">
          {isThinking
            ? "FinBot is preparing a sample response. You can draft your next question."
            : messages.length > 2 ? "Ready for your next question." : "Where would you like to start?"}
        </p>
        <p id={`${id}-suggestions`} className="mb-2 text-[10px] font-semibold tracking-widest text-stone-600">
          EXPLORE THE SAMPLE
        </p>
        <div role="group" className="mb-5 flex flex-wrap gap-2" aria-labelledby={`${id}-suggestions`}>
          {suggestedQuestions.map((example) => (
            <button
              key={example.label}
              aria-label={`${example.label}: ${example.question}`}
              title={example.question}
              type="button"
              disabled={isThinking}
              onClick={() => {
                setInput(example.question);
                inputRef.current?.focus();
              }}
              className={`flex min-h-11 flex-1 items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-[#704053] hover:border-[#cba1b1] hover:bg-[#f9f1f4] disabled:cursor-not-allowed disabled:opacity-50 ${focusStyle}`}
            >
              {example.label}<ArrowUpRight className="size-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor={`${id}-input`} className="mb-2 block text-sm font-medium">
            Your question
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={inputRef}
              id={`${id}-input`}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-describedby={`${id}-disclaimer ${id}-status`}
              placeholder="What’s on your mind?"
              maxLength={1000}
              autoComplete="off"
              className={`min-h-12 min-w-0 flex-1 rounded-lg border border-stone-400 bg-white px-3 py-3 text-base text-stone-900 placeholder:text-stone-500 ${focusStyle}`}
            />
            <button
              type="submit"
              disabled={isThinking || !input.trim()}
              className={`min-h-12 rounded-lg bg-[#861f41] px-6 py-3 text-sm font-semibold text-white hover:bg-[#671832] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-600 ${focusStyle}`}
            >
              {isThinking ? "Preparing…" : "Send"}
            </button>
          </div>
        </form>
        <p className="mt-3 text-[11px] leading-5 text-stone-500">
          Demo conversation · History resets on refresh or when you leave the dashboard.
        </p>
      </div>
    </section>
  );
}
