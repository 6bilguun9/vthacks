import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ApiError, overviewResponseSchema, type CommitRequest, type Plan } from "../src/lib/api";
import { PlanCommitStore, pendingSaveKey, saveReceiptKey } from "../src/features/dashboard/plan-commit-store";

const overview = overviewResponseSchema.parse(JSON.parse(readFileSync(new URL("../../contracts/examples/overview.json", import.meta.url), "utf8")));
const input: Omit<CommitRequest, "idempotencyKey"> = { expectedVersion: overview.plan.version, snapshotId: overview.snapshot.id, change: { kind: "replace_plan", plan: overview.plan } };
const request: CommitRequest = { ...input, idempotencyKey: "stable-key" };
function setup(options: { data?: Map<string, string>; userId?: string | null } = {}) {
  const data = options.data ?? new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); }),
  };
  const commit = vi.fn<(request: CommitRequest, options: { accessToken: string; signal: AbortSignal }) => Promise<Plan>>(async () => overview.plan);
  const reload = vi.fn(async () => {});
  const getAccessToken = vi.fn(async () => "test-token");
  const newKey = vi.fn(() => "stable-key");
  const store = new PlanCommitStore({ userId: options.userId === undefined ? "alice" : options.userId, storage: () => storage, newKey, getAccessToken, reload, commit });
  const stop = store.start();
  return { store, data, storage, commit, reload, getAccessToken, newKey, stop };
}

describe("durable plan save", () => {
  it("writes and reads back the exact request before sending it", async () => {
    const { store, storage, commit, data } = setup();
    commit.mockImplementationOnce(async value => {
      expect(JSON.parse(data.get(pendingSaveKey("alice"))!)).toEqual(value);
      expect(storage.getItem).toHaveBeenCalledWith(pendingSaveKey("alice"));
      return overview.plan;
    });
    await store.save(input);
    expect(commit).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toMatchObject({ pending: null, busy: false, ready: true });
    expect(store.getSnapshot().message).toContain("was saved");
  });

  it("restores the same key and payload after an uncertain response and a page reload", async () => {
    const first = setup();
    first.commit.mockRejectedValueOnce(new ApiError("Timed out", "network"));
    await first.store.save(input);
    const original = first.commit.mock.calls[0]![0];
    first.stop();
    const second = setup({ data: first.data });
    expect(second.store.getSnapshot().pending).toEqual(original);
    await second.store.save({ ...input, expectedVersion: 999 });
    expect(second.commit.mock.calls[0]![0]).toEqual(original);
    expect(second.newKey).not.toHaveBeenCalled();
  });

  it("fails closed for malformed persisted changes without overwriting them", async () => {
    const data = new Map([[pendingSaveKey("alice"), "{broken"]]);
    const { store, commit } = setup({ data });
    expect(store.getSnapshot().ready).toBe(false);
    await store.save(input);
    expect(commit).not.toHaveBeenCalled();
    expect(data.get(pendingSaveKey("alice"))).toBe("{broken");
  });

  it("fails closed when recovery storage cannot be read", async () => {
    const { store, storage, commit, stop } = setup();
    stop();
    storage.getItem.mockImplementation(() => { throw new Error("storage disabled"); });
    store.start();
    expect(store.getSnapshot().ready).toBe(false);
    await store.save(input);
    expect(commit).not.toHaveBeenCalled();
  });

  it("never sends a save when persistence throws or silently fails", async () => {
    for (const failure of ["throw", "drop"]) {
      const { store, storage, commit } = setup();
      storage.setItem.mockImplementation(() => { if (failure === "throw") throw new Error("quota"); });
      await store.save(input);
      expect(commit).not.toHaveBeenCalled();
      expect(store.getSnapshot().ready).toBe(false);
    }
  });

  it("rechecks recovery storage after the asynchronous token refresh", async () => {
    const { store, data, getAccessToken, commit } = setup();
    getAccessToken.mockImplementation(async () => { data.delete(pendingSaveKey("alice")); return "test-token"; });
    await store.save(input);
    expect(commit).not.toHaveBeenCalled();
    expect(store.getSnapshot().ready).toBe(false);
  });

  it("clears a definitive conflict so a fresh preview can be saved", async () => {
    const { store, commit, data } = setup();
    commit.mockRejectedValueOnce(new ApiError("Conflict", "http", 409));
    await store.save(input);
    expect(store.getSnapshot()).toMatchObject({ pending: null, ready: true, busy: false });
    expect(store.getSnapshot().message).toContain("Reload it and preview");
    expect(data.has(pendingSaveKey("alice"))).toBe(false);
  });

  it("retains uncertainty for server failures, invalid success responses, and timeouts", async () => {
    for (const error of [new ApiError("Server error", "http", 503), new ApiError("Invalid result", "invalid_response"), new ApiError("Timeout", "http", 408)]) {
      const { store, commit, data } = setup();
      commit.mockRejectedValueOnce(error);
      await store.save(input);
      expect(store.getSnapshot().pending).toEqual(request);
      expect(JSON.parse(data.get(pendingSaveKey("alice"))!)).toEqual(request);
    }
  });

  it("still reports a successful save when refreshing the page data fails", async () => {
    const { store, reload, data } = setup();
    reload.mockRejectedValueOnce(new Error("overview unavailable"));
    await store.save(input);
    expect(store.getSnapshot().message).toContain("was saved, but");
    expect(store.getSnapshot().pending).toBeNull();
    const restored = setup({ data });
    expect(restored.store.getSnapshot().message).toContain("was saved, but");
  });

  it("remembers a confirmed save even when its own refresh unmounts the view", async () => {
    const { store, stop, reload, data } = setup();
    reload.mockImplementationOnce(async () => { stop(); throw new Error("offline"); });
    await store.save(input);
    const restored = setup({ data });
    expect(restored.store.getSnapshot().pending).toBeNull();
    expect(restored.store.getSnapshot().message).toContain("was saved, but");
  });

  it("reports success and blocks another change when clearing local confirmation fails", async () => {
    const { store, storage, commit } = setup();
    commit.mockImplementationOnce(async () => {
      storage.removeItem.mockImplementation(() => { throw new Error("storage unavailable"); });
      return overview.plan;
    });
    await store.save(input);
    expect(store.getSnapshot()).toMatchObject({ ready: false, pending: request });
    expect(store.getSnapshot().message).toContain("was saved");
    await store.save(input);
    expect(commit).toHaveBeenCalledOnce();
  });

  it("does not write after unmounting while a token is being refreshed", async () => {
    const { store, getAccessToken, stop, commit, data } = setup();
    let resolve!: (value: string) => void;
    getAccessToken.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const saving = store.save(input);
    stop();
    resolve("test-token");
    await saving;
    expect(commit).not.toHaveBeenCalled();
    expect(JSON.parse(data.get(pendingSaveKey("alice"))!)).toEqual(request);
  });

  it("isolates pending requests and confirmation receipts by guest", async () => {
    const data = new Map([[pendingSaveKey("alice"), JSON.stringify(request)], [saveReceiptKey("alice"), JSON.stringify({ message: "Alice result" })]]);
    const { store, commit } = setup({ userId: "bob", data });
    expect(store.getSnapshot()).toMatchObject({ pending: null, message: "" });
    await store.save(input);
    expect(commit).toHaveBeenCalledOnce();
    expect(data.get(pendingSaveKey("alice"))).toBe(JSON.stringify(request));
    expect(JSON.parse(data.get(saveReceiptKey("alice"))!).message).toBe("Alice result");
  });

  it("prevents parallel clicks from starting another write", async () => {
    const { store, commit } = setup();
    let resolve!: (value: Plan) => void;
    commit.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const saving = store.save(input);
    await vi.waitFor(() => expect(commit).toHaveBeenCalledOnce());
    await store.save(input);
    expect(commit).toHaveBeenCalledOnce();
    resolve(overview.plan);
    await saving;
  });
});
