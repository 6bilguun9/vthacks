"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { type Conversation } from "./conversation-history";

type Props = { messages: Conversation["messages"]; ready: boolean; thinking: boolean; isVisible: boolean };

export default function ConversationTranscript({ messages, ready, thinking, isVisible }: Props) {
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
            <span className="fb-empty-mark" aria-hidden="true">↗</span>
            <p className="fb-kicker">YOUR NEXT GOOD QUESTION</p>
            <h3>Money on your mind?<br />Start here.</h3>
            <p>Explore your spending, check your balances, or talk through a savings goal.</p>
          </div>
        ) : messages.map((message, index) => (
          <div key={index} className={`fb-message fb-message-${message.role}`}>
            <p className="fb-message-label">{message.role === "user" ? "You" : "FinBot · sample response"}</p>
            <p className="fb-message-text">{message.text}</p>
          </div>
        ))}
        {thinking && <div className="fb-thinking" aria-hidden="true"><span className="fb-pulse" />Preparing a sample response…</div>}
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
