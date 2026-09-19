import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", {
    schema: {
      response: {
        200: {
          type: "object",
          additionalProperties: false,
          required: ["status", "service", "apiVersion"],
          properties: {
            status: { type: "string", const: "ok" },
            service: { type: "string", const: "student-finance-api" },
            apiVersion: { type: "string", const: "v1" },
          },
        },
      },
    },
  }, async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    return { status: "ok", service: "student-finance-api", apiVersion: "v1" };
  });
}
