import { z } from "zod";

const origin = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.origin === value;
  } catch {
    return false;
  }
}, "Use an exact HTTP(S) origin, without a path, credentials, or trailing slash");

const ansBaseUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:"
    && !url.username
    && !url.password
    && url.pathname === "/"
    && !url.search
    && !url.hash;
}, "Use an HTTPS API origin without credentials, a path, query, or fragment");

const agentHost = z.string().trim().min(1).max(253).refine((value) => {
  const hostname = value.toLowerCase();
  return !hostname.includes(":")
    && !hostname.includes("/")
    && hostname.includes(".")
    && hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}, "Use an agent FQDN without a protocol, port, or path");

const semver = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, "Use major.minor.patch semantic versioning");

const ansApiKey = z.string().trim().regex(/^[^:\s]+:[^:\s]+$/, "ANS_API_KEY must use the KEY:SECRET format");

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().min(1).default("127.0.0.1"),
  CORS_ORIGINS: z.string().default("http://localhost:3000")
    .transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean))
    .pipe(z.array(origin).min(1)),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  ANS_BASE_URL: ansBaseUrl.default("https://api.godaddy.com/"),
  ANS_API_KEY: ansApiKey.optional(),
  ANS_ORGANIZATION: z.string().trim().min(1).max(64).default("VTHacks"),
  COACH_AGENT_HOST: agentHost.optional(),
  PLANNER_AGENT_HOST: agentHost.optional(),
  ANS_AGENT_VERSION: semver.default("0.1.0"),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  // Provider credentials are deliberately not required until their integrations exist.
  return environmentSchema.parse(environment);
}
