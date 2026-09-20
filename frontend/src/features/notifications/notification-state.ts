import { z } from "zod";
import { demoData, formatMoney } from "../dashboard/demo-data";

const notificationSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.enum(["goal", "system"]),
  title: z.string().min(1).max(160),
  message: z.string().min(1).max(1000),
  createdAt: z.number().int().nonnegative().max(8.64e15).nullable(),
  sample: z.boolean(),
  read: z.boolean(),
});
export type WalletNotification = z.infer<typeof notificationSchema>;
const listSchema = z.array(notificationSchema).max(30).refine((items) => new Set(items.map((item) => item.id)).size === items.length);

export const sampleNotifications: WalletNotification[] = [
  { id: "sample-goal", kind: "goal", title: "Your emergency fund is growing", message: `${formatMoney(demoData.savingsGoal.savedCents)} of ${formatMoney(demoData.savingsGoal.targetCents)} saved in the sample profile.`, createdAt: null, sample: true, read: false },
  { id: "sample-system", kind: "system", title: "Your demo workspace is ready", message: `You’re viewing the ${demoData.month} ${demoData.year} sample profile.`, createdAt: null, sample: true, read: false },
];
export type NotificationAction = { type: "publish"; item: WalletNotification } | { type: "read"; id: string } | { type: "read-all" };

export function notificationReducer(items: WalletNotification[], action: NotificationAction) {
  if (action.type === "publish") return [{ ...action.item, read: false }, ...items.filter((item) => item.id !== action.item.id)].slice(0, 30);
  return items.map((item) => action.type === "read-all" || item.id === action.id ? { ...item, read: true } : item);
}

export function readNotifications(raw: string | null): WalletNotification[] {
  if (!raw) return sampleNotifications;
  try { return listSchema.parse(JSON.parse(raw)); } catch { return sampleNotifications; }
}
