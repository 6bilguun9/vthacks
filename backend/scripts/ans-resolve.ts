import { getAgentDefinition, getConfiguredAgentHost } from "../src/agents/registry.js";
import { readConfig } from "../src/config/env.js";
import { runAnsCli } from "../src/integrations/ans-cli.js";

const [agentId, version = ""] = process.argv.slice(2);
const agent = agentId ? getAgentDefinition(agentId) : undefined;
const config = readConfig();
const agentHost = agent ? getConfiguredAgentHost(agent.id, config) : undefined;

if (!agent || !agentHost) throw new Error("Set the matching agent host and run: npm run ans:resolve -- <coach|planner> [version-range]");
runAnsCli(["resolve", agentHost, "--version", version || "*"], config, true);
