import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(path.resolve(__dirname, "../../prisma/migrations/20261015000000_repair_schema_drift/migration.sql"), "utf8");
const statements = sql.replace(/--.*$/gm, "");

describe("schema drift repair migration", () => {
  it("never drops, truncates, or rewrites data", () => {
    expect(statements).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX|TYPE|CONSTRAINT|DEFAULT)\b/i);
    expect(statements).not.toMatch(/\b(TRUNCATE|DELETE\s+FROM|UPDATE\s+"|RENAME)\b/i);
    expect(statements).not.toMatch(/\bALTER\s+COLUMN\s+"[^"]+"\s+(TYPE|SET\s+NOT\s+NULL)\b/i);
  });

  it("is idempotent, so databases that already have these objects can apply it", () => {
    for (const match of statements.matchAll(/CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)\s+(?!IF NOT EXISTS)/gi)) {
      throw new Error(`Non-idempotent CREATE: ${match[0]}`);
    }
    for (const match of statements.matchAll(/ADD\s+COLUMN\s+(?!IF NOT EXISTS)/gi)) {
      throw new Error(`Non-idempotent ADD COLUMN: ${match[0]}`);
    }
    expect((statements.match(/CREATE TYPE/g) ?? []).length).toBe((statements.match(/WHEN duplicate_object THEN NULL/g) ?? []).length);
    expect((statements.match(/ADD CONSTRAINT/g) ?? []).length).toBe((statements.match(/IF NOT EXISTS \(SELECT 1 FROM pg_constraint/g) ?? []).length);
  });

  it("adds foreign keys without re-checking existing rows", () => {
    for (const fk of statements.match(/ADD CONSTRAINT[\s\S]*?;/g) ?? []) expect(fk).toMatch(/NOT VALID;$/);
  });
});
