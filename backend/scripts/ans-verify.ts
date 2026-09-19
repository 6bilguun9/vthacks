import { readConfig } from "../src/config/env.js";
import { runAnsCli } from "../src/integrations/ans-cli.js";

const [action, agentId] = process.argv.slice(2);
if ((action !== "dns" && action !== "acme") || !agentId) throw new Error("Usage: npm run ans:verify-acme -- <agent-id> or npm run ans:verify-dns -- <agent-id>");
const config = readConfig();
runAnsCli([action === "acme" ? "verify-acme" : "verify-dns", agentId], config, true);
