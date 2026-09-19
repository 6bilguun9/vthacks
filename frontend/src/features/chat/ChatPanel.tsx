"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { demoChatExamples as examples } from "@/features/dashboard/demo-data";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function ChatPanel() {
  // State remembers values between renders and updates the screen when they change.
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "user", text: examples[0].question },
    { role: "assistant", text: examples[0].answer },
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
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, isThinking]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Keep submitting the form from refreshing the page.
    const question = input.trim();
    if (!question || timerRef.current !== null) return;

    setMessages((previous) => [...previous, { role: "user", text: question }]);
    setInput("");
    setIsThinking(true);
    inputRef.current?.focus();

    // This delay imitates a response; it never calls an API or reads bank data.
    timerRef.current = setTimeout(() => {
      const example = examples.find(
        (item) => item.question.toLowerCase() === question.toLowerCase(),
      );
      const answer = example?.answer ??
        "This is a demo, so I can’t analyze that question yet. Try one of the example prompts to explore a sample savings or spending plan. No real account data is connected.";
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
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-stone-900 shadow-sm"
    >
      <header className="border-b border-stone-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
            Ask FinBot
          </h2>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
            Demo · mock data
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Make room for life at VT. Explore a spending or savings plan.
        </p>
        <p id={`${id}-disclaimer`} className="mt-2 text-xs leading-5 text-stone-600">
          Sample conversation and scripted replies. No bank accounts are connected.
        </p>
      </header>

      <div
        ref={conversationRef}
        role="log"
        aria-label="FinBot conversation"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        className={`max-h-96 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6 ${focusStyle}`}
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
      </div>

      <div className="border-t border-stone-200 p-5 sm:p-6">
        <p role="status" className="mb-3 min-h-5 text-xs font-medium text-stone-600">
          {isThinking ? "FinBot is thinking… (simulated)" : "Ready for your next question."}
        </p>
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Example prompts">
          {examples.map((example) => (
            <button
              key={example.label}
              type="button"
              disabled={isThinking}
              onClick={() => {
                setInput(example.question);
                inputRef.current?.focus();
              }}
              className={`min-h-11 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 ${focusStyle}`}
            >
              {example.label}
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
              aria-describedby={`${id}-disclaimer`}
              placeholder="Ask about spending or saving…"
              maxLength={1000}
              autoComplete="off"
              className={`min-h-12 min-w-0 flex-1 rounded-lg border border-stone-400 bg-white px-3 py-3 text-base text-stone-900 placeholder:text-stone-500 ${focusStyle}`}
            />
            <button
              type="submit"
              disabled={isThinking || !input.trim()}
              className={`min-h-12 rounded-lg bg-[#861f41] px-6 py-3 text-sm font-semibold text-white hover:bg-[#671832] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-600 ${focusStyle}`}
            >
              {isThinking ? "Thinking…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
