import Fastify from "fastify";
import cors from "@fastify/cors";
import { readConfig, type AppConfig } from "./config/env.js";
import { agentRoutes } from "./routes/agents.js";
import { healthRoutes } from "./routes/health.js";

export function createApp(config: AppConfig = readConfig()) {
  const app = Fastify({
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
  });

  app.register(cors, {
    origin: config.CORS_ORIGINS,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    credentials: false,
    maxAge: 600,
  });

  app.register(healthRoutes, { prefix: "/api/v1" });
  app.register(agentRoutes, { prefix: "/api/v1", config });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: { code: "NOT_FOUND", message: "This endpoint is not implemented." },
    });
  });

  app.setErrorHandler((error, request, reply) => {
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
