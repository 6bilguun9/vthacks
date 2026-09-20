"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { Bell, Check, CheckCheck, Settings2, Target, X } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "./use-notifications";

export default function NotificationBell({ onViewGoal }: { onViewGoal?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const { items, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function close() { setOpen(false); trigger.current?.focus(); }

  return (
    <div ref={root} className="notifications" lang="en" dir="ltr" onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); close(); } }} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="notification-trigger" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} aria-controls={id} onClick={() => {
        if (!open) window.dispatchEvent(new Event("wallet-notifications-open"));
        setOpen(!open);
      }}><Bell aria-hidden="true" />{unread > 0 && <span className="notification-count" aria-hidden="true">{unread}</span>}</button>
      <span className="sr-only" role="status">{unread} unread notifications</span>
      {open && <section id={id} className="notifications-panel" aria-labelledby={`${id}-title`}>
        <header><div><h2 id={`${id}-title`}>Notifications</h2><p>{unread ? `${unread} unread` : "You’re all caught up"}</p></div><button ref={closeButton} type="button" aria-label="Close notifications" onClick={close}><X aria-hidden="true" /></button></header>
        <div className="notification-actions"><button type="button" aria-disabled={unread === 0} onClick={() => { if (unread > 0) markAllRead(); }}><CheckCheck aria-hidden="true" />Mark all as read</button></div>
        <ul>
          {items.map((item) => <li key={item.id} data-unread={!item.read}>
            <span className="notification-icon" aria-hidden="true">{item.kind === "goal" ? <Target /> : <Settings2 />}</span>
            <div className="notification-content">
              <div className="notification-meta"><span>{item.kind === "goal" ? "Savings" : "System"}</span>{item.sample && <span className="notification-sample">Sample</span>}{!item.read && <strong>Unread</strong>}</div>
              <h3>{item.title}</h3><p>{item.message}</p>
              {item.createdAt !== null && <time dateTime={new Date(item.createdAt).toISOString()}>{new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>}
              <div className="notification-item-actions">
                {item.kind === "goal" && <Link href="/#savings" onClick={(event) => { onViewGoal?.(event); markRead(item.id); close(); }}>View savings ↗</Link>}
                <button type="button" aria-disabled={item.read} onClick={() => { if (!item.read) markRead(item.id); }}><Check aria-hidden="true" />{item.read ? "Read" : "Mark read"}</button>
              </div>
            </div>
          </li>)}
        </ul>
      </section>}
    </div>
  );
}
