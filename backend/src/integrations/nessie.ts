import { z } from "zod";

const accountSchema = z.object({
  _id: z.string().trim().min(1),
  customer_id: z.string().trim().min(1),
  type: z.enum(["Checking", "Savings", "Credit Card"]),
  nickname: z.string().trim().min(1).optional(),
  balance: z.number().finite(),
}).passthrough();

const purchaseSchema = z.object({
  _id: z.string().trim().min(1),
  merchant_id: z.string().trim().min(1).optional(),
  medium: z.string().trim().min(1).optional(),
  purchase_date: z.string().date(),
  amount: z.number().finite().nonnegative(),
  status: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
}).passthrough();

export interface NessieAccount {
  readonly id: string;
  readonly customerId: string;
  readonly type: "checking" | "savings" | "credit";
  readonly name: string;
  readonly balanceCents: number;
}

export interface NessiePurchase {
  readonly id: string;
  readonly merchantId: string | null;
  readonly medium: string | null;
  readonly date: string;
  readonly amountCents: number;
  readonly status: string;
  readonly description: string | null;
}

export class NessieUnavailableError extends Error {
  constructor() {
    super("Nessie sandbox is not configured or unavailable.");
    this.name = "NessieUnavailableError";
  }
}

export class NessieProviderError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super("Nessie sandbox returned an invalid response.");
    this.name = "NessieProviderError";
    this.statusCode = statusCode;
  }
}

export interface NessieClientOptions {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

function assertSafeDollars(value: number): number {
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 0.000_001) {
    throw new NessieProviderError(502);
  }
  return cents;
}

function safeBaseUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new NessieUnavailableError(); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new NessieUnavailableError();
  }
  return url;
}

function accountType(value: z.infer<typeof accountSchema>["type"]): NessieAccount["type"] {
  if (value === "Checking") return "checking";
  if (value === "Savings") return "savings";
  return "credit";
}

export function normalizeNessieAccount(value: unknown): NessieAccount {
  const parsed = accountSchema.safeParse(value);
  if (!parsed.success) throw new NessieProviderError(502);
  return {
    id: parsed.data._id,
    customerId: parsed.data.customer_id,
    type: accountType(parsed.data.type),
    name: parsed.data.nickname ?? `${parsed.data.type} account`,
    balanceCents: assertSafeDollars(parsed.data.balance),
  };
}

export function normalizeNessiePurchase(value: unknown): NessiePurchase {
  const parsed = purchaseSchema.safeParse(value);
  if (!parsed.success) throw new NessieProviderError(502);
  return {
    id: parsed.data._id,
    merchantId: parsed.data.merchant_id ?? null,
    medium: parsed.data.medium ?? null,
    date: parsed.data.purchase_date,
    amountCents: assertSafeDollars(parsed.data.amount),
    status: parsed.data.status,
    description: parsed.data.description ?? null,
  };
}

/**
 * Read-only Nessie sandbox adapter. The provider key never leaves the backend;
 * callers receive validated, cents-based records or a safe provider error.
 */
export function createNessieClient(options: NessieClientOptions) {
  const baseUrl = safeBaseUrl(options.baseUrl);
  const apiKey = options.apiKey?.trim();
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5_000;
  if (!apiKey || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new NessieUnavailableError();
  }
  const configuredApiKey: string = apiKey;

  async function getArray(path: string): Promise<unknown[]> {
    const url = new URL(path, baseUrl);
    url.searchParams.set("key", configuredApiKey);
    let response: Response;
    try {
      response = await doFetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new NessieUnavailableError();
    }
    if (!response.ok) throw new NessieProviderError(response.status);
    let body: unknown;
    try { body = await response.json(); } catch { throw new NessieProviderError(502); }
    if (!Array.isArray(body)) throw new NessieProviderError(502);
    return body;
  }

  return {
    async listCustomerAccounts(customerId: string): Promise<NessieAccount[]> {
      if (customerId.trim().length === 0) throw new RangeError("customerId cannot be empty.");
      const body = await getArray(`customers/${encodeURIComponent(customerId)}/accounts`);
      return body.map(normalizeNessieAccount);
    },
    async listAccountPurchases(accountId: string): Promise<NessiePurchase[]> {
      if (accountId.trim().length === 0) throw new RangeError("accountId cannot be empty.");
      const body = await getArray(`accounts/${encodeURIComponent(accountId)}/purchases`);
      return body.map(normalizeNessiePurchase);
    },
  };
}
