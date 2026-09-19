import { execFileSync } from "node:child_process";
import type { AppConfig } from "../config/env.js";

export function runAnsCli(
  args: readonly string[],
  config: Pick<AppConfig, "ANS_BASE_URL" | "ANS_API_KEY">,
  requiresCredential: boolean,
): void {
  if (requiresCredential && !config.ANS_API_KEY) {
    throw new Error("ANS_API_KEY is required and must contain the complete KEY:SECRET pair.");
  }

  try {
    execFileSync("ans-cli", [...args], {
      stdio: "inherit",
      env: {
        ...process.env,
        ANS_BASE_URL: config.ANS_BASE_URL,
        ...(config.ANS_API_KEY ? { ANS_API_KEY: config.ANS_API_KEY } : {}),
      },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      throw new Error("ans-cli is not installed or is not on PATH. Install agentnameservice/ans/ans-cli first.");
    }
    throw error;
  }
}
