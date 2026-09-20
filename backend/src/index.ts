import Fastify from "fastify";
import { createApp, createFastifyOptions } from "./create-app.js";
import { readConfig } from "./config/env.js";

const config = readConfig();
const fastify = Fastify(createFastifyOptions(config));
createApp(config, {}, fastify);

async function shutdown() {
  await fastify.close();
}

process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });

try {
  await fastify.listen({ port: config.PORT, host: config.HOST });
} catch {
  fastify.log.error("Unable to start the API. Check the port and server configuration.");
  process.exitCode = 1;
}
