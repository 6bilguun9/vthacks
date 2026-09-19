import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const addFormats = require("ajv-formats") as (ajv: Ajv2020) => void;
const root = new URL("../../contracts/", import.meta.url);
const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const schemas = readJson("schemas.json");
const spec = readJson("openapi.json");
const examples = readJson("examples/manifest.json") as { file: string; schema: string }[];
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schemas);

function resolvePointer(document: unknown, pointer: string): unknown {
  return pointer.split("/").slice(1).reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[part.replaceAll("~1", "/").replaceAll("~0", "~")];
  }, document);
}

function checkReferences(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string") {
      const [file, pointer] = child.split("#");
      expect(file === "" || file === "./schemas.json", "Unexpected external reference: " + child).toBe(true);
      expect(resolvePointer(file ? schemas : spec, pointer ?? ""), child).toBeDefined();
    } else {
      checkReferences(child);
    }
  }
}

describe("shared API contract", () => {
  it("compiles every schema and resolves every OpenAPI reference", () => {
    for (const name of Object.keys(schemas.$defs)) {
      expect(ajv.getSchema("urn:vthacks:contracts:v1#/$defs/" + name)).toBeDefined();
    }
    checkReferences(spec);
  });

  for (const example of examples) {
    it("validates the synthetic " + example.file + " example", () => {
      const validate = ajv.getSchema("urn:vthacks:contracts:v1#/$defs/" + example.schema);
      expect(validate).toBeDefined();
      const valid = validate!(readJson("examples/" + example.file));
      expect(valid, JSON.stringify(validate!.errors)).toBe(true);
    });
  }

  it("rejects fractional cents and unsafe integers", () => {
    const validate = ajv.getSchema("urn:vthacks:contracts:v1#/$defs/Money")!;
    expect(validate(15000)).toBe(true);
    expect(validate(150.5)).toBe(false);
    expect(validate(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });

  it("rejects recurring purchases in the one-off purchase interface", () => {
    const validate = ajv.getSchema("urn:vthacks:contracts:v1#/$defs/ScenarioRequest")!;
    const request = readJson("examples/purchase-request.json");
    expect(validate({ ...request, cadence: "weekly" })).toBe(false);
  });
});
