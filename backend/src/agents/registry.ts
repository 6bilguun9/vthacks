export const agentIds = ["coach", "planner"] as const;

export type AgentId = (typeof agentIds)[number];

export interface AgentFunction {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
}

export interface AgentDefinition {
  readonly id: AgentId;
  readonly displayName: string;
  readonly description: string;
  readonly endpointPath: string;
  readonly functions: readonly AgentFunction[];
}

const registry: Record<AgentId, AgentDefinition> = {
  coach: {
    id: "coach",
    displayName: "Hokie Savings Coach",
    description: "Interprets savings and purchase-planning questions using grounded financial calculations.",
    endpointPath: "/api/v1/agents/coach",
    functions: [
      { id: "explain_purchase_plan", name: "Explain purchase plan", tags: ["financial-planning", "purchase", "goals"] },
      { id: "clarify_financial_input", name: "Clarify financial input", tags: ["financial-planning", "clarification"] },
    ],
  },
  planner: {
    id: "planner",
    displayName: "Hokie Deterministic Planner",
    description: "Calculates savings projections and hypothetical purchase impacts deterministically.",
    endpointPath: "/api/v1/agents/planner",
    functions: [
      { id: "calculate_savings_projection", name: "Calculate savings projection", tags: ["financial-planning", "savings", "projection"] },
      { id: "compare_purchase_scenario", name: "Compare purchase scenario", tags: ["financial-planning", "purchase", "scenario"] },
    ],
  },
};

export function getAgentDefinition(value: string): AgentDefinition | undefined {
  return Object.hasOwn(registry, value) ? registry[value as AgentId] : undefined;
}

export function getConfiguredAgentHost(
  agentId: AgentId,
  config: { COACH_AGENT_HOST?: string | undefined; PLANNER_AGENT_HOST?: string | undefined },
): string | undefined {
  return agentId === "coach" ? config.COACH_AGENT_HOST : config.PLANNER_AGENT_HOST;
}

export function getAgentUrl(agent: AgentDefinition, host: string): string {
  return `https://${host}${agent.endpointPath}`;
}
