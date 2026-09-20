"use client";

import { useRef, useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { groupConversations, type Conversation } from "./conversation-history";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function ChatHistory({ conversations, activeId, onSelect, onRemove }: Props) {
  const deleteButtons = useRef(new Map<string, HTMLButtonElement>());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  return (
    <>
      <div className="fb-history-heading"><h3>Your conversations</h3><span>{conversations.length}</span></div>
      <p className="fb-history-note">Saved on this browser only.</p>
      {conversations.length === 0 ? (
        <div className="fb-history-empty"><MessageSquare aria-hidden="true" /><p>Your first question starts a chat.</p><span>Come back to it here, anytime.</span></div>
      ) : (
        <div className="fb-history-list" tabIndex={0} aria-label="Saved conversations by date">
          {groupConversations(conversations).map((group) => (
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
