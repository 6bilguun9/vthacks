import { z } from "zod";

const origin = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.origin === value;
  } catch {
    return false;
  }
}, "Use an exact HTTP(S) origin, without a path, credentials, or trailing slash");

const ansBaseUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:"
        && !url.username
        && !url.password
        && url.pathname === "/"
        && !url.search
        && !url.hash;
    } catch {
      return false;
    }
  }, "Use an HTTPS API origin without credentials, a path, query, or fragment").default("https://api.godaddy.com/"),
);

const agentHost = z.string().trim().min(1).max(253).refine((value) => {
  const hostname = value.toLowerCase();
  return !hostname.includes(":")
    && !hostname.includes("/")
    && hostname.includes(".")
    && hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}, "Use an agent FQDN without a protocol, port, or path");

const semver = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, "Use major.minor.patch semantic versioning");

const ansApiKey = z.string().trim().regex(/^[^:\s]+:[^:\s]+$/, "ANS_API_KEY must use the KEY:SECRET format");
const optionalNonEmptyString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);
const optionalAnsApiKey = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  ansApiKey.optional(),
);
const optionalAgentHost = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  agentHost.optional(),
);
const nessieBaseUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && url.origin === value;
    } catch {
      return false;
    }
  }, "Use an HTTPS Nessie API origin without credentials, a path, query, or fragment").default("https://api.nessieisreal.com"),
);

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().min(1).default("127.0.0.1"),
  CORS_ORIGINS: z.string().default("http://localhost:3000")
    .transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean))
    .pipe(z.array(origin).min(1)),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  ANS_BASE_URL: ansBaseUrl,
  ANS_API_KEY: optionalAnsApiKey,
  ANS_ORGANIZATION: z.string().trim().min(1).max(64).default("VTHacks"),
  COACH_AGENT_HOST: optionalAgentHost,
  PLANNER_AGENT_HOST: optionalAgentHost,
  ANS_AGENT_VERSION: semver.default("0.1.0"),
  ARC_BASE_URL: z.string().url().default("https://llm-api.arc.vt.edu/api/v1"),
  ARC_API_KEY: optionalNonEmptyString,
  llm_arc_api_key: optionalNonEmptyString,
  ARC_MODEL: z.string().min(1).default("gpt-oss-120b"),
  NESSIE_BASE_URL: nessieBaseUrl.default("https://api.nessieisreal.com"),
  NESSIE_API_KEY: optionalNonEmptyString,
  NESSIE_CUSTOMER_ID: optionalNonEmptyString,
  SUPABASE_URL: z.preprocess(value => value === "" ? undefined : value, z.string().url().optional()),
  SUPABASE_PUBLISHABLE_KEY: optionalNonEmptyString,
  SUPABASE_SECRET_KEY: optionalNonEmptyString,
  AI_MODE: z.enum(["off", "presenter"]).default("off"),
  PRESENTER_USER_IDS: z.string().default("").transform(value => value.split(",").map(item => item.trim()).filter(Boolean)),
  AGENT_SIGNING_SECRET: z.preprocess(value => value === "" ? undefined : value, z.string().min(32).optional()),
  PLANNER_ALLOW_LOCAL_FALLBACK: z.enum(["true", "false"]).default("false").transform(value => value === "true"),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  // Provider credentials are deliberately not required until their integrations exist.
  return environmentSchema.parse(environment);
}
