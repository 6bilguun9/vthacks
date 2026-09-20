import { ApiError, type ChatResponse } from "../../lib/api";

export const executionLabels: Record<ChatResponse["executionSource"], string> = {
  ans_remote: "Signed ANS planner response",
  local_fallback: "Local planner fallback · ANS not used",
  unavailable: "No new planner comparison",
};

export function liveRequestError(cause: unknown, feature: "chat" | "dining") {
  if (cause instanceof ApiError) {
    if (cause.status === 403) return "AI access is limited to the team’s approved presenter guest. Your session does not have permission. Ask the backend team to enable this guest; reconnecting will not bypass the restriction.";
    if (cause.status === 401) return "Your guest session expired. Reconnect with the connection control, then retry.";
    if (cause.status === 409) return "Your saved plan changed. Reloading the latest data; review it, then retry your question.";
    if (cause.status === 429) return "The service has reached its request limit. Wait before trying again.";
  }
  return cause instanceof Error ? cause.message : `Could not complete your ${feature === "chat" ? "FinBot request" : "meal plan"}. Please retry.`;
}
