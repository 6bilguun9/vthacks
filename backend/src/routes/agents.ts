import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getAgentDefinition, getAgentUrl, getConfiguredAgentHost } from "../agents/registry.js";
import type { AppConfig } from "../config/env.js";
import { chatSchema, scenarioSchema } from "../domain/model.js";
import type { FinancialRouteOptions } from "./financial.js";

const paramsSchema = z.object({ agentId: z.string() });

function unknownAgent(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }) {
  return reply.code(404).send({
    error: { code: "NOT_FOUND", message: "This agent is not configured." },
  });
}

export const agentRoutes: FastifyPluginAsync<{ config: AppConfig } & FinancialRouteOptions> = async (app, options) => {
  app.get<{ Params: { agentId: string } }>("/agents/:agentId", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    const agent = parsed.success ? getAgentDefinition(parsed.data.agentId) : undefined;
    if (!agent) return unknownAgent(reply);

    const agentHost = getConfiguredAgentHost(agent.id, options.config);
    return reply.header("cache-control", "no-store").send({
      agent: {
        id: agent.id,
        displayName: agent.displayName,
        description: agent.description,
        endpointPath: agent.endpointPath,
        agentHost: agentHost ?? null,
        agentUrl: agentHost ? getAgentUrl(agent, agentHost) : null,
        functions: agent.functions,
      },
      implementationStatus: "implemented",
      note: "Runtime available; this descriptor does not verify ANS registration or provider readiness.",
    });
  });

  app.post<{ Params: { agentId: string } }>("/agents/:agentId", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    const agent = parsed.success ? getAgentDefinition(parsed.data.agentId) : undefined;
    if (!agent) return unknownAgent(reply);

    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    reply.header("Cache-Control", "no-store");
    if (agent.id === "planner") {
      const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]));
      await options.agents.verifyPlannerRequest(actor, headers, request.body);
      return options.finance.scenario(actor, scenarioSchema.parse(request.body));
    }
    options.requireAi(actor);
    const release = await options.limits.acquire(actor, "ai", options.clock());
    try { return await options.agents.chat(actor, chatSchema.parse(request.body)); } finally { await release(); }
  });
};
