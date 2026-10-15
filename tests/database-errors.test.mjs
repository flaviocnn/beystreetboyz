import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const source = await readFile(new URL("../app/lib/database-errors.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { isUniqueViolation } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
test("PostgreSQL uniqueness conflicts survive the Drizzle error wrapper", () => {
  assert.equal(isUniqueViolation({ cause: { code: "23505" } }), true);
  assert.equal(isUniqueViolation({ code: "23505" }), true);
  assert.equal(isUniqueViolation({ cause: { code: "23503" } }), false);
  assert.equal(isUniqueViolation(new Error("connection failed")), false);
});
