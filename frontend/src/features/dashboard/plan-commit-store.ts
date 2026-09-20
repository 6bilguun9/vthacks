import { ApiError } from "../../lib/api";
import { commitRequestSchema, type CommitRequest, type Plan } from "../../lib/finance-contracts";

type DurableStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type PlanCommitState = { pending: CommitRequest | null; busy: boolean; message: string; ready: boolean };
type Dependencies = {
  userId: string | null;
  storage(): DurableStorage;
  newKey(): string;
  getAccessToken(): Promise<string>;
  reload(): Promise<void>;
  commit(request: CommitRequest, options: { accessToken: string; signal: AbortSignal }): Promise<Plan>;
};
export const pendingSaveKey = (userId: string) => `hokie-wallet-pending-save:${userId}`;
export const saveReceiptKey = (userId: string) => `hokie-wallet-save-result:${userId}`;
const storageMessage = "Save recovery storage is unavailable or unreadable. Further saves are paused. Restore this browser's session storage before trying again; do not clear an unconfirmed save.";
const savedMessage = "Your plan was saved. No bank transaction was made.";
const refreshMessage = "Your plan was saved, but its refreshed view could not load. Reload the plan to see the latest version.";

/** A write is sent only after its exact payload and idempotency key survive a storage read-back. */
export class PlanCommitStore {
  private state: PlanCommitState = { pending: null, busy: false, message: "", ready: false };
  private listeners = new Set<() => void>();
  private generation = 0;
  private active = false;
  private controller: AbortController | null = null;
  constructor(private readonly dependencies: Dependencies) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(update: Partial<PlanCommitState>) { this.state = { ...this.state, ...update }; this.listeners.forEach(listener => listener()); }
  private key() { if (!this.dependencies.userId) throw new Error("A guest session is required."); return pendingSaveKey(this.dependencies.userId); }
  private readPending(storage: DurableStorage) {
    const raw = storage.getItem(this.key());
    return raw === null ? null : commitRequestSchema.parse(JSON.parse(raw));
  }
  private readReceipt(storage: DurableStorage) {
    const value = storage.getItem(saveReceiptKey(this.dependencies.userId!));
    if (value === null) return "";
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || !("message" in parsed) || typeof parsed.message !== "string" || parsed.message.length > 1000) throw new Error("Invalid save receipt.");
    return parsed.message;
  }
  private receipt(message: string) {
    try { this.dependencies.storage().setItem(saveReceiptKey(this.dependencies.userId!), JSON.stringify({ message })); }
    catch { /* A confirmed backend save remains successful even if its local receipt cannot be written. */ }
  }
  private clearExact(storage: DurableStorage, request: CommitRequest) {
    const current = this.readPending(storage);
    if (current === null) return;
    if (JSON.stringify(current) !== JSON.stringify(request)) throw new Error("Another save is awaiting confirmation.");
    storage.removeItem(this.key());
    if (storage.getItem(this.key()) !== null) throw new Error("Save recovery storage could not be cleared.");
  }
  start = () => {
    this.active = true;
    this.generation++;
    if (!this.dependencies.userId) this.patch({ ready: false, busy: false, pending: null, message: "Connect a guest session before saving." });
    else {
      try {
        const storage = this.dependencies.storage();
        const pending = this.readPending(storage);
        const message = this.readReceipt(storage);
        this.patch({ pending, message, busy: false, ready: true });
      } catch { this.patch({ ready: false, busy: false, message: storageMessage }); }
    }
    return () => { this.active = false; this.generation++; this.controller?.abort(); this.controller = null; };
  };
  save = async (input?: Omit<CommitRequest, "idempotencyKey">): Promise<void> => {
    if (!this.active || this.state.busy || !this.state.ready || !this.dependencies.userId) return;
    const generation = this.generation;
    let storage: DurableStorage;
    let request: CommitRequest | null;
    try { storage = this.dependencies.storage(); request = this.readPending(storage); }
    catch { this.patch({ ready: false, message: storageMessage }); return; }
    if (!request) {
      if (!input) return;
      try { request = commitRequestSchema.parse({ ...input, idempotencyKey: this.dependencies.newKey() }); }
      catch { this.patch({ message: "Check the proposed change and preview it again before saving." }); return; }
    }
    const durableRequest = request;
    try {
      const serialized = JSON.stringify(durableRequest);
      storage.setItem(this.key(), serialized);
      if (storage.getItem(this.key()) !== serialized) throw new Error("The pending save did not persist.");
      storage.removeItem(saveReceiptKey(this.dependencies.userId));
    } catch { this.patch({ pending: durableRequest, ready: false, message: storageMessage }); return; }
    const controller = new AbortController();
    this.controller = controller;
    this.patch({ pending: durableRequest, busy: true, message: "" });
    try {
      const accessToken = await this.dependencies.getAccessToken();
      if (!this.active || generation !== this.generation || controller.signal.aborted) return;
      try {
        if (JSON.stringify(this.readPending(storage)) !== JSON.stringify(durableRequest)) throw new Error("Save recovery changed before sending the request.");
      } catch { this.patch({ ready: false, message: `${storageMessage} This request was not sent.` }); return; }
      await this.dependencies.commit(durableRequest, { accessToken, signal: controller.signal });
      // Complete only this guest's exact receipt, even if their view unmounted during the response.
      let cleared = true;
      try { this.clearExact(storage, durableRequest); } catch { cleared = false; }
      const confirmed = cleared ? savedMessage : "Your plan was saved, but its local confirmation could not be cleared. Keep this browser open and restore session storage before making another change.";
      this.receipt(confirmed);
      if (this.active && generation === this.generation) this.patch({ pending: cleared ? null : durableRequest, ready: cleared, message: confirmed });
      if (this.active && generation === this.generation) {
        try { await this.dependencies.reload(); }
        catch {
          const message = cleared ? refreshMessage : confirmed;
          this.receipt(message);
          if (this.active && generation === this.generation) this.patch({ message });
        }
      }
    } catch (cause) {
      const definitive = cause instanceof ApiError && (cause.code === "invalid_request" || (cause.status !== undefined && [400, 401, 403, 404, 405, 409, 410, 413, 415, 422, 429].includes(cause.status)));
      let cleared = false;
      if (definitive) { try { this.clearExact(storage, durableRequest); cleared = true; } catch { /* Preserve the blocked state if local recovery cannot be updated. */ } }
      const message = cause instanceof ApiError && cause.status === 409
        ? "Your plan changed since this preview. Reload it and preview the change again."
        : cause instanceof ApiError ? cause.message
        : "The save could not be confirmed. Restore your connection, then retry the pending save with its original request.";
      if (this.active && generation === this.generation) this.patch({ pending: cleared ? null : durableRequest, ready: !definitive || cleared, message: definitive && !cleared ? `${message} ${storageMessage}` : message });
    } finally {
      if (this.active && generation === this.generation) { this.controller = null; this.patch({ busy: false }); }
    }
  };
}
