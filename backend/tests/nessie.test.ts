import { describe, expect, it, vi } from "vitest";
import { createNessieClient, NessieProviderError, NessieUnavailableError, normalizeNessieAccount, normalizeNessiePurchase } from "../src/integrations/nessie.js";

const account = { _id: "account-1", customer_id: "customer-1", type: "Checking", nickname: "Hokie checking", balance: 123.45 };
const purchase = { _id: "purchase-1", merchant_id: "merchant-1", medium: "balance", purchase_date: "2026-09-19", amount: 12.34, status: "pending", description: "Books" };

describe("Nessie normalization", () => {
  it("converts documented sandbox account and purchase fields to integer cents", () => {
    expect(normalizeNessieAccount(account)).toEqual({ id: "account-1", customerId: "customer-1", type: "checking", name: "Hokie checking", balanceCents: 12_345 });
    expect(normalizeNessiePurchase(purchase)).toEqual({ id: "purchase-1", merchantId: "merchant-1", medium: "balance", date: "2026-09-19", amountCents: 1_234, status: "pending", description: "Books" });
  });

  it("rejects values that cannot be represented as integer cents", () => {
    expect(() => normalizeNessiePurchase({ ...purchase, amount: 1.234 })).toThrow(NessieProviderError);
  });
});

describe("Nessie client", () => {
  it("uses only GET requests and encodes customer IDs while retaining the key on the server", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify([account]), { status: 200 }));
    const client = createNessieClient({ baseUrl: "https://api.nessieisreal.com", apiKey: "sandbox-key", fetch });

    await expect(client.listCustomerAccounts("customer/1")).resolves.toEqual([expect.objectContaining({ id: "account-1" })]);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://api.nessieisreal.com/customers/customer%2F1/accounts?key=sandbox-key");
    expect(init?.method).toBe("GET");
  });

  it("does not expose a provider response body or key through an error", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("provider says key=sandbox-key", { status: 401 }));
    const client = createNessieClient({ baseUrl: "https://api.nessieisreal.com", apiKey: "sandbox-key", fetch });

    await expect(client.listAccountPurchases("account-1")).rejects.toMatchObject({ name: "NessieProviderError", statusCode: 401 });
    await client.listAccountPurchases("account-1").catch((error: unknown) => expect(String(error)).not.toContain("sandbox-key"));
  });

  it("refuses a missing key or a non-HTTPS provider base URL before making a request", () => {
    expect(() => createNessieClient({ baseUrl: "https://api.nessieisreal.com" })).toThrow(NessieUnavailableError);
    expect(() => createNessieClient({ baseUrl: "http://api.nessieisreal.com", apiKey: "key" })).toThrow(NessieUnavailableError);
  });
});
