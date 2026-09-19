import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getAgentDefinition, getAgentUrl, getConfiguredAgentHost } from "../agents/registry.js";
import type { AppConfig } from "../config/env.js";

const paramsSchema = z.object({ agentId: z.string() });

function unknownAgent(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }) {
  return reply.code(404).send({
    error: { code: "NOT_FOUND", message: "This agent is not configured." },
  });
}

export const agentRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, options) => {
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
      implementationStatus: "scaffolded",
      note: "This descriptor is ready for agent development; invoking an agent is not implemented yet.",
    });
  });

  app.post<{ Params: { agentId: string } }>("/agents/:agentId", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    const agent = parsed.success ? getAgentDefinition(parsed.data.agentId) : undefined;
    if (!agent) return unknownAgent(reply);

    return reply.code(501).send({
      error: {
        code: "AGENT_NOT_IMPLEMENTED",
        message: `${agent.displayName} is registered as a development endpoint but cannot process requests yet.`,
      },
    });
  });
};
