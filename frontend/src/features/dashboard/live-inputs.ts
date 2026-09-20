// Input conversion only. Financial projections always come from the API.
export function dollarsToCents(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Enter a nonnegative dollar amount with at most two decimal places.");
  const cents = BigInt(match[1]!) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("That amount is too large.");
  return Number(cents);
}

export function centsInput(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("An amount must be nonnegative integer cents.");
  const value = BigInt(cents);
  return `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`;
}

export function weekStart(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7);
  return value.toISOString().slice(0, 10);
}

export function displayDate(date: string | null): string {
  if (!date) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}
