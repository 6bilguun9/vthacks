import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { chatSchema, commitSchema, manualSchema, previewSchema, scenarioSchema } from "../domain/model.js";
import type { Authenticator, Limits } from "../domain/ports.js";
import { createFinanceApi, publicSnapshot } from "../application/finance-api.js";
import type { createAgentService } from "../agents/service.js";
import type { Actor } from "../domain/model.js";

export interface FinancialRouteOptions {
  auth: Authenticator; limits: Limits; finance: ReturnType<typeof createFinanceApi>;
  agents: ReturnType<typeof createAgentService>; requireAi(actor: Actor): void; clock(): Date;
}
export const financialRoutes: FastifyPluginAsync<FinancialRouteOptions> = async (app, options) => {
  app.addHook("onRequest", async (_request, reply) => { reply.header("Cache-Control", "no-store"); });
  app.get("/overview", async request => {
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    const result = await options.finance.overview(actor);
    return { ...result, snapshot: publicSnapshot(result.snapshot), capabilities: options.finance.capabilities(actor) };
  });
  app.post("/session/bootstrap", async request => {
    z.object({ source: z.literal("fixture") }).strict().parse(request.body);
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    const release = await options.limits.acquire(actor, "write", options.clock());
    try { const result = await options.finance.bootstrap(actor); return { ...result, snapshot: publicSnapshot(result.snapshot), capabilities: options.finance.capabilities(actor) }; }
    finally { await release(); }
  });
  app.post("/data/refresh", async request => {
    z.object({}).strict().parse(request.body ?? {});
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    const release = await options.limits.acquire(actor, "write", options.clock());
    try { return publicSnapshot((await options.finance.refresh(actor)).snapshot); } finally { await release(); }
  });
  app.post("/data/manual", async request => {
    const body = manualSchema.parse(request.body);
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    const release = await options.limits.acquire(actor, "write", options.clock());
    try { const result = await options.finance.manual(actor, body); return { ...result, snapshot: publicSnapshot(result.snapshot) }; } finally { await release(); }
  });
  app.post("/plan/preview", async request => {
    const body = previewSchema.parse(request.body);
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    const release = await options.limits.acquire(actor, "write", options.clock());
    try { return await options.finance.preview(actor, body.expectedVersion, body.snapshotId, body.proposedPlan); } finally { await release(); }
  });
  app.post("/scenarios", async request => {
    const body = scenarioSchema.parse(request.body);
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    const release = await options.limits.acquire(actor, "write", options.clock());
    try { return await options.finance.scenario(actor, body); } finally { await release(); }
  });
  app.post("/plan/commit", async request => {
    const body = commitSchema.parse(request.body);
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    const release = await options.limits.acquire(actor, "write", options.clock());
    try { return await options.finance.commit(actor, body); } finally { await release(); }
  });
  app.post("/chat", async request => {
    const body = chatSchema.parse(request.body);
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    options.requireAi(actor);
    const release = await options.limits.acquire(actor, "ai", options.clock());
    try { return await options.agents.chat(actor, body); } finally { await release(); }
  });
};
