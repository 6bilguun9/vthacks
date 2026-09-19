import { readConfig } from "../src/config/env.js";
import { runAnsCli } from "../src/integrations/ans-cli.js";

const [agentId] = process.argv.slice(2);
if (!agentId) throw new Error("Usage: npm run ans:status -- <agent-id>");

runAnsCli(["status", agentId], readConfig(), true);
