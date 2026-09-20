/** Mechanical contract generation: run deliberately after changing domain validators. */
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { planSchema, plannedPurchaseSchema, goalSchema, cashFlowSchema, previewSchema, commitSchema, chatSchema, manualSchema } from "../src/domain/model.js";

const root = new URL("../../contracts/", import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const write = (path: string, value: unknown) => writeFileSync(new URL(path, root), JSON.stringify(value, null, 2) + "\n");
const schemas = read("schemas.json");
const defs = schemas.$defs;
for (const [name, schema] of Object.entries({ Plan: planSchema, PlannedPurchase: plannedPurchaseSchema, Goal: goalSchema, CashFlow: cashFlowSchema, PlanPreviewRequest: previewSchema, PlanCommitRequest: commitSchema, ChatRequest: chatSchema, ManualDataRequest: manualSchema })) {
  const json = z.toJSONSchema(schema); delete json.$schema; defs[name] = json;
}
defs.FinancialSnapshot.properties.transactions = { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "accountId", "date", "amountCents", "status", "description", "source"], properties: { id: { type: "string" }, accountId: { type: "string" }, date: { $ref: "#/$defs/Date" }, amountCents: { $ref: "#/$defs/Money" }, status: { type: "string" }, description: { type: ["string", "null"] }, source: { enum: ["nessie_sandbox", "fixture"] } } } };
defs.FinancialSnapshot.required = [...new Set([...defs.FinancialSnapshot.required, "transactions"])];
defs.OverviewResponse.properties.capabilities = { type: "object", additionalProperties: false, required: ["ai", "nessieConfigured", "today"], properties: { ai: { type: "boolean" }, nessieConfigured: { type: "boolean" }, today: { $ref: "#/$defs/Date" } } };
defs.ScenarioComparison.properties.after = { anyOf: [{ $ref: "#/$defs/Projection" }, { type: "null" }] };
const impact = defs.ScenarioComparison.properties.goalImpacts.items;
for (const key of ["nextWeekAffordable", "remainingWeeklyAffordable"]) { impact.properties[key] = { type: ["boolean", "null"] }; impact.required = [...new Set([...impact.required, key])]; }
defs.ChatResponse.properties.executionSource = { enum: ["ans_remote", "local_fallback", "unavailable"] };
defs.ChatResponse.required = [...new Set([...defs.ChatResponse.required, "executionSource"])];
defs.DiningPlanResponse.properties.source = { enum: ["vt_arc", "openrouter"] };
defs.BootstrapRequest = { type: "object", additionalProperties: false, required: ["source"], properties: { source: { const: "fixture" } } };
defs.ManualDataResponse = { type: "object", additionalProperties: false, required: ["snapshot", "plan"], properties: { snapshot: { $ref: "#/$defs/FinancialSnapshot" }, plan: { $ref: "#/$defs/Plan" } } };
write("schemas.json", schemas);
const spec = read("openapi.json");
for (const path of Object.values(spec.paths) as Record<string, { [key: string]: unknown }>[]) for (const operation of Object.values(path)) operation["x-implementation-status"] = "implemented";
const response = (name: string) => ({ "200": { description: "Successful result", content: { "application/json": { schema: { $ref: `./schemas.json#/$defs/${name}` } } } }, default: { $ref: "#/components/responses/Error" } });
for (const [path, operationId, request, result] of [["/api/v1/session/bootstrap", "bootstrapSession", "BootstrapRequest", "OverviewResponse"], ["/api/v1/data/manual", "saveManualData", "ManualDataRequest", "ManualDataResponse"]]) spec.paths[path!] = { post: { operationId, "x-implementation-status": "implemented", requestBody: { required: true, content: { "application/json": { schema: { $ref: `./schemas.json#/$defs/${request}` } } } }, responses: response(result!) } };
delete spec.paths["/api/v1/dining-plans"].post.security;
spec.paths["/api/v1/dining-plans"].post.summary = "Presenter-authorized AI dining suggestions with deterministic totals";
spec.paths["/api/v1/agents/coach"] = { post: { operationId: "invokeCoach", "x-implementation-status": "implemented", requestBody: { required: true, content: { "application/json": { schema: { $ref: "./schemas.json#/$defs/ChatRequest" } } } }, responses: response("ChatResponse") } };
spec.paths["/api/v1/agents/planner"] = { post: { operationId: "invokePlanner", "x-implementation-status": "implemented", description: "Requires guest bearer token and authenticated coach signature, timestamp, audience, and single-use nonce. Reloads owned state.", requestBody: { required: true, content: { "application/json": { schema: { $ref: "./schemas.json#/$defs/ScenarioRequest" } } } }, responses: response("ScenarioComparison") } };
write("openapi.json", spec);
for (const entry of read("examples/manifest.json")) {
  const example = read(`examples/${entry.file}`);
  if (example.snapshot) example.snapshot.transactions ??= [];
  if (example.plan) Object.assign(example.plan, { selectedBankAccountIds: null, incomeComplete: false, expensesComplete: false, discretionaryPeriodStart: "2026-09-14", discretionaryConfirmedAt: null, extraContributions: [] });
  if (example.goalImpacts) for (const row of example.goalImpacts) Object.assign(row, { nextWeekAffordable: null, remainingWeeklyAffordable: null });
  if (entry.schema === "ChatResponse") example.executionSource = "unavailable";
  write(`examples/${entry.file}`, example);
}
