"use client";

import { useId, useRef, useState } from "react";
import { MessageSquare, Search, Trash2, X } from "lucide-react";
import { filterConversations, groupConversations, type Conversation } from "./conversation-history";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function ChatHistory({ conversations, activeId, onSelect, onRemove }: Props) {
  const deleteButtons = useRef(new Map<string, HTMLButtonElement>());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const filtered = filterConversations(conversations, query);
  return (
    <>
      <div className="fb-history-heading"><h3>Your conversations</h3><span>{conversations.length}</span></div>
      <p className="fb-history-note">Saved on this browser only.</p>
      {conversations.length > 0 && <div className="fb-history-search">
        <label htmlFor={id}>Search chats</label>
        <div className="fb-search-row">
          <Search aria-hidden="true" />
          <input ref={searchRef} id={id} type="text" value={query} placeholder="Names or messages" autoComplete="off" aria-describedby={`${id}-results`} onChange={(event) => { setQuery(event.target.value); setConfirmDelete(null); }} />
          {query && <button type="button" aria-label="Clear chat search" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X aria-hidden="true" /></button>}
        </div>
        <p id={`${id}-results`} className="fb-search-results" role="status">{query.trim() ? `${filtered.length} ${filtered.length === 1 ? "chat found" : "chats found"}` : "Search names and message text."}</p>
      </div>}
      {conversations.length === 0 ? (
        <div className="fb-history-empty"><MessageSquare aria-hidden="true" /><p>Your first question starts a chat.</p><span>Come back to it here, anytime.</span></div>
      ) : filtered.length === 0 ? (
        <div className="fb-history-empty"><Search aria-hidden="true" /><p>No chats found.</p><span>Try a different word or clear your search.</span></div>
      ) : (
        <div className="fb-history-list" tabIndex={0} aria-label="Saved conversations by date">
          {groupConversations(filtered).map((group) => (
            <div className="fb-history-group" key={group.label}>
              <h4>{group.label}</h4>
              <ul>
                {group.conversations.map((chat) => (
                  <li key={chat.id}>
                    <div className="fb-history-row" data-selected={chat.id === activeId}>
                      <button type="button" className="fb-chat-select" aria-current={chat.id === activeId ? "true" : undefined} title={chat.title} onClick={() => { setConfirmDelete(null); onSelect(chat.id); }}>
                        <MessageSquare aria-hidden="true" />
                        <span><strong>{chat.title}</strong><small>{chat.messages.filter((message) => message.role === "user").length} {chat.messages.filter((message) => message.role === "user").length === 1 ? "question" : "questions"} · {new Date(chat.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</small></span>
                      </button>
                      <button ref={(node) => { if (node) deleteButtons.current.set(chat.id, node); else deleteButtons.current.delete(chat.id); }} type="button" className="fb-delete-chat" aria-label={`Delete chat: ${chat.title}`} onClick={() => setConfirmDelete(chat.id)}><Trash2 aria-hidden="true" /></button>
                    </div>
                    {confirmDelete === chat.id && (
                      <div className="fb-delete-confirm" role="group" aria-label={`Confirm deleting ${chat.title}`}>
                        <p>Delete this saved chat?</p>
                        <button type="button" onClick={() => { onRemove(chat.id); setConfirmDelete(null); }}>Delete</button>
                        <button type="button" onClick={() => { setConfirmDelete(null); deleteButtons.current.get(chat.id)?.focus(); }}>Cancel</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
