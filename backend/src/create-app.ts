import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import { readConfig, type AppConfig } from "./config/env.js";
import { agentRoutes } from "./routes/agents.js";
import { healthRoutes } from "./routes/health.js";
import { diningPlanRoutes } from "./routes/dining-plan.js";
import { ZodError } from "zod";
import { AppError, type Actor } from "./domain/model.js";
import type { Authenticator, Repository, Limits } from "./domain/ports.js";
import { createInfrastructure } from "./persistence/infrastructure.js";
import { createFinanceApi } from "./application/finance-api.js";
import { createAgentService } from "./agents/service.js";
import { financialRoutes } from "./routes/financial.js";

export interface AppDependencies { auth?: Authenticator; repository?: Repository; limits?: Limits; clock?: () => Date; id?: () => string; fetch?: typeof fetch }

export function createFastifyOptions(config: AppConfig): FastifyServerOptions {
  return {
    logger: {
      level: config.LOG_LEVEL,
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
      // Do not log raw URLs: provider keys or user input may appear in query strings.
      serializers: {
        req(request) {
          return { method: request.method, url: request.url.split("?")[0] ?? "/" };
        },
      },
    },
    bodyLimit: 64 * 1024,
  };
}

export function createApp(
  config: AppConfig = readConfig(),
  dependencies: AppDependencies = {},
  app: FastifyInstance = Fastify(createFastifyOptions(config)),
) {
  const infrastructure = createInfrastructure(config);
  const auth = dependencies.auth ?? infrastructure.auth;
  const repository = dependencies.repository ?? infrastructure.repository;
  const limits = dependencies.limits ?? infrastructure.limits;
  const clock = dependencies.clock ?? (() => new Date());
  const finance = createFinanceApi(config, repository, clock, dependencies.id, dependencies.fetch);
  const agents = createAgentService(config, limits, { overview: finance.overview, planner: finance.scenario }, { now: clock, ...(dependencies.fetch ? { fetch: dependencies.fetch } : {}) });
  function requireAi(actor: Actor) {
    if (config.AI_MODE === "off") throw new AppError(503, "AI_DISABLED", "AI is disabled. Deterministic plan previews remain available.");
    if (!config.PRESENTER_USER_IDS.includes(actor.userId)) throw new AppError(403, "PRESENTER_REQUIRED", "AI is available to the authorized demo presenter only.");
  }
  app.register(cors, {
    origin: config.CORS_ORIGINS,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    credentials: false,
    maxAge: 600,
  });

  app.register(healthRoutes, { prefix: "/api/v1" });
  const runtime = { auth, repository, limits, clock, finance, agents, requireAi };
  app.register(financialRoutes, { prefix: "/api/v1", ...runtime });
  app.register(agentRoutes, { prefix: "/api/v1", config, ...runtime });
  app.register(diningPlanRoutes, { prefix: "/api/v1", config, ...runtime, ...(dependencies.fetch ? { fetch: dependencies.fetch } : {}) });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: { code: "NOT_FOUND", message: "This endpoint is not implemented." },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) return reply.code(error.statusCode).header("Cache-Control", "no-store").send({ error: { code: error.code, message: error.message } });
    if (error instanceof ZodError || error instanceof RangeError) return reply.code(422).send({ error: { code: "INVALID_REQUEST", message: "Check the input amounts, dates, and selected records." } });
    const statusCode = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
    const status = typeof statusCode === "number" && statusCode >= 400 && statusCode < 500 ? statusCode : 500;
    request.log.error({ statusCode: status }, "Request failed");
    return reply.code(status).send({
      error: {
        code: status >= 500 ? "INTERNAL_ERROR" : "INVALID_REQUEST",
        message: status >= 500 ? "The request could not be completed." : "Check the request and try again.",
      },
    });
  });

  return app;
}
