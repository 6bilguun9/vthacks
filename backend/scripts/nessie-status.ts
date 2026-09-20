import { z } from "zod";
import { readConfig } from "../src/config/env.js";

// Read-only sandbox discovery. Print IDs only, never keys, URLs, addresses, or provider errors.
const config = readConfig();
if (!config.NESSIE_API_KEY) {
  console.log("Nessie API key is not configured."); process.exitCode = 1;
} else {
  const url = new URL("/customers", config.NESSIE_BASE_URL);
  url.searchParams.set("key", config.NESSIE_API_KEY);
  try {
    const response = await fetch(url, { redirect: "error", headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) { console.log(`Nessie customer discovery returned HTTP ${response.status}.`); process.exitCode = 1; }
    else {
      const records = z.array(z.object({ _id: z.string().min(1) }).passthrough()).parse(await response.json());
      console.log(JSON.stringify({ source: "nessie_sandbox", customerIds: records.map(record => record._id), configuredCustomerFound: records.some(record => record._id === config.NESSIE_CUSTOMER_ID) }));
    }
  } catch { console.log("Nessie customer discovery is unavailable or returned an invalid response."); process.exitCode = 1; }
}
