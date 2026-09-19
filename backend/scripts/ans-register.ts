import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getAgentDefinition, getAgentUrl, getConfiguredAgentHost } from "../src/agents/registry.js";
import { readConfig } from "../src/config/env.js";
import { runAnsCli } from "../src/integrations/ans-cli.js";

const [agentId] = process.argv.slice(2);
const agent = agentId ? getAgentDefinition(agentId) : undefined;
const config = readConfig();
const agentHost = agent ? getConfiguredAgentHost(agent.id, config) : undefined;

if (!agent || !agentHost) {
  throw new Error("Set the matching COACH_AGENT_HOST or PLANNER_AGENT_HOST and run: npm run ans:register -- <coach|planner>");
}
if (!config.ANS_API_KEY) throw new Error("ANS_API_KEY is required. Use the complete KEY:SECRET pair issued for ANS.");

const materialDirectory = resolve(process.cwd(), ".ans", agent.id);
const identityCsrPath = resolve(materialDirectory, "identity.csr");
const serverCsrPath = resolve(materialDirectory, "server.csr");
if (!existsSync(identityCsrPath) || !existsSync(serverCsrPath)) {
  throw new Error(`Missing CSRs. First run: npm run ans:csr -- ${agent.id} ${agentHost}`);
}

const functionArgs = agent.functions.flatMap((item) => ["--function", `${item.id}:${item.name}:${item.tags.join(",")}`]);
runAnsCli([
  "register",
  "--name", agent.displayName,
  "--description", agent.description,
  "--host", agentHost,
  "--version", config.ANS_AGENT_VERSION,
  "--identity-csr", identityCsrPath,
  "--server-csr", serverCsrPath,
  "--endpoint-url", getAgentUrl(agent, agentHost),
  "--metadata-url", getAgentUrl(agent, agentHost),
  "--endpoint-protocol", "HTTP-API",
  "--endpoint-transports", "REST",
  ...functionArgs,
], config, true);

console.log("Registration request completed. Record the returned agent ID and DNS records before running ANS validation.");
