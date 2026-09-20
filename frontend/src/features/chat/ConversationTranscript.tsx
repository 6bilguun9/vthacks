"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { type Conversation } from "./conversation-history";
import { executionLabels } from "./live-chat";
import { ChatComparison } from "./chat-comparison";

type Props = { messages: Conversation["messages"]; ready: boolean; thinking: boolean; isVisible: boolean; live?: boolean };

export default function ConversationTranscript({ messages, ready, thinking, isVisible, live = false }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const previousCount = useRef(0);
  const [showLatest, setShowLatest] = useState(false);

  useEffect(() => {
    const sentQuestion = messages.length > previousCount.current && messages.at(-1)?.role === "user";
    previousCount.current = messages.length;
    if (sentQuestion) following.current = true;
    if (isVisible && following.current && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, thinking, isVisible]);

  return (
    <>
      <div ref={logRef} className="fb-transcript" role="log" aria-label="FinBot conversation" aria-live="polite" aria-relevant="additions" tabIndex={0} onScroll={(event) => {
        const log = event.currentTarget;
        following.current = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
        setShowLatest(!following.current);
      }}>
        {!ready ? <p className="fb-empty-note">Opening your conversations…</p> : messages.length === 0 ? (
          <div className="fb-empty">
            <div className="fb-welcome-mark" aria-hidden="true">
              <Image src="/finbot/team-logo.png" alt="" width={445} height={473} sizes="88px" />
              <span className="fb-welcome-wave">Hey, Hokie!</span>
            </div>
            <h2>Make room for<br />what matters.</h2>
            <p>Dining dollars, weekend plans, and everything in between.</p>
          </div>
        ) : messages.map((message, index) => (
          <div key={index} className={`fb-message fb-message-${message.role}`}>
            <p className="fb-message-label">{message.role === "user" ? "You" : live ? "FinBot · backend response" : "FinBot · sample response"}</p>
            <p className="fb-message-text" dir="auto">{message.text}</p>
            {message.backend && <>
              <p className="fb-execution-source">{executionLabels[message.backend.executionSource]}</p>
              {message.backend.comparison && <ChatComparison comparison={message.backend.comparison} />}
            </>}
          </div>
        ))}
        {thinking && <div className="fb-thinking" aria-hidden="true"><span className="fb-pulse" />{live ? "Asking the backend planner…" : "Preparing a sample response…"}</div>}
      </div>
      {showLatest && <div className="fb-latest-row"><button type="button" className="fb-latest" onClick={() => {
        const log = logRef.current;
        if (!log) return;
        following.current = true;
        log.focus({ preventScroll: true });
        log.scrollTop = log.scrollHeight;
        setShowLatest(false);
      }}><ArrowDown aria-hidden="true" />Jump to latest</button></div>}
    </>
  );
}
