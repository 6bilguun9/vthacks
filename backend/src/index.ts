import { createApp } from "./create-app.js";
import { readConfig } from "./config/env.js";

const config = readConfig();
const app = createApp(config);

async function shutdown() {
  await app.close();
}

process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch {
  app.log.error("Unable to start the API. Check the port and server configuration.");
  process.exitCode = 1;
}
