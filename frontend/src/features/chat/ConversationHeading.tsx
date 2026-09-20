"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Pencil } from "lucide-react";

export default function ConversationHeading({ title, onRename }: { title?: string; onRename: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const renameButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const focusName = useCallback((node: HTMLInputElement | null) => { node?.focus(); node?.select(); }, []);

  function finish() {
    setEditing(false);
    // The original trigger is visible again after React updates the screen.
    requestAnimationFrame(() => renameButton.current?.focus());
  }

  return (
    <div className="fb-conversation-heading">
      {editing ? (
        <form className="fb-rename-form" onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim() || draft.trim().length > 80) return;
          onRename(draft.trim());
          finish();
        }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); finish(); } }}>
          <label htmlFor={id}>Chat name</label>
          <input id={id} value={draft} ref={focusName} onChange={(event) => setDraft(event.target.value)} maxLength={80} autoComplete="off" />
          <button type="submit" disabled={!draft.trim()}>Save</button>
          <button type="button" onClick={finish}>Cancel</button>
        </form>
      ) : (
        <>
          <h3>{title ?? "New conversation"}</h3>
          {title && <button ref={renameButton} className="fb-rename" type="button" aria-label="Rename this chat" onClick={() => { setDraft(title); setEditing(true); }}><Pencil aria-hidden="true" /><span>Rename</span></button>}
          <span className="fb-demo-label">DEMO</span>
        </>
      )}
    </div>
  );
}
