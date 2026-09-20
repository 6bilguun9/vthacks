import { describe, expect, it } from "vitest";
import { notificationReducer, readNotifications, sampleNotifications, type WalletNotification } from "../src/features/notifications/notification-state";

const update: WalletNotification = { id: "text-size", kind: "system", title: "Text size updated", message: "Text size is now 120%.", createdAt: 10, sample: false, read: false };

describe("notification history", () => {
  it("keeps synthetic goal and system examples explicitly labeled", () => {
    expect(sampleNotifications.every((item) => item.sample)).toBe(true);
    expect(sampleNotifications.find((item) => item.kind === "goal")?.message).toContain("$700.00");
  });

  it("coalesces repeated settings updates and makes a read update unread again", () => {
    const first = notificationReducer([], { type: "publish", item: update });
    const read = notificationReducer(first, { type: "read", id: update.id });
    expect(read[0]?.read).toBe(true);
    const next = notificationReducer(read, { type: "publish", item: { ...update, message: "Text size is now 140%.", createdAt: 20 } });
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ read: false, message: "Text size is now 140%." });
  });

  it("marks all read without changing content and restores that state after serialization", () => {
    const read = notificationReducer(sampleNotifications, { type: "read-all" });
    expect(read.every((item) => item.read)).toBe(true);
    expect(read.map((item) => item.message)).toEqual(sampleNotifications.map((item) => item.message));
    expect(readNotifications(JSON.stringify(read))).toEqual(read);
  });

  it("bounds history and safely recovers malformed saved data", () => {
    let items: WalletNotification[] = [];
    for (let index = 0; index < 35; index++) items = notificationReducer(items, { type: "publish", item: { ...update, id: `event-${index}`, createdAt: index } });
    expect(items).toHaveLength(30);
    expect(items[0]?.id).toBe("event-34");
    expect(readNotifications("not json")).toEqual(sampleNotifications);
    expect(readNotifications(JSON.stringify([{ ...update, createdAt: "invalid" }]))).toEqual(sampleNotifications);
  });
});
