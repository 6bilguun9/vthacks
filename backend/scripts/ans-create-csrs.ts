import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getAgentDefinition } from "../src/agents/registry.js";
import { readConfig } from "../src/config/env.js";
import { runAnsCli } from "../src/integrations/ans-cli.js";

const [agentId, agentHost] = process.argv.slice(2);
const agent = agentId ? getAgentDefinition(agentId) : undefined;

if (!agent || !agentHost) {
  throw new Error("Usage: npm run ans:csr -- <coach|planner> <agent-host.example.com>");
}
if (!/^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i.test(agentHost) || !agentHost.includes(".")) {
  throw new Error("Use an FQDN without a protocol, port, or path.");
}

const outputDirectory = resolve(process.cwd(), ".ans", agent.id);
const identityKeyPath = resolve(outputDirectory, "identity.key");
const identityCsrPath = resolve(outputDirectory, "identity.csr");
const serverKeyPath = resolve(outputDirectory, "server.key");
const serverCsrPath = resolve(outputDirectory, "server.csr");

if ([identityKeyPath, identityCsrPath, serverKeyPath, serverCsrPath].some(existsSync)) {
  throw new Error(`Refusing to overwrite existing ANS material in ${outputDirectory}. Use a new directory only after deliberately archiving the current material.`);
}

mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
const config = readConfig();
runAnsCli([
  "generate-csr",
  "--host", agentHost,
  "--version", config.ANS_AGENT_VERSION,
  "--org", config.ANS_ORGANIZATION,
  "--out-dir", outputDirectory,
], config, false);

console.log(`Created ANS CLI CSRs for ${agent.displayName} in ${outputDirectory}.`);
console.log("Keep the generated private keys local. Next, set the matching *_AGENT_HOST and complete ANS_API_KEY in backend/.env, then run ans:register.");
