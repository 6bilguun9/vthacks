// Compatibility exports for callers that have not moved to the provider-neutral names yet.
export {
  AiUnavailableError as ArcUnavailableError,
  completeWithAi as completeWithArc,
} from "./ai.js";
export type { AiOptions as ArcOptions } from "./ai.js";
