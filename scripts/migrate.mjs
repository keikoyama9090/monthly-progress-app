import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// .env.local から DATABASE_URL を読む
const envLines = readFileSync(".env.local", "utf-8").split("\n");
const dbLine = envLines.find((l) => l.startsWith("DATABASE_URL="));
if (!dbLine) throw new Error("DATABASE_URL not found in .env.local");
const DATABASE_URL = dbLine.split("=").slice(1).join("=").replace(/^"|"$/g, "").trim();

const sql = neon(DATABASE_URL);

const statements = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  `CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled_tasks BOOLEAN[] NOT NULL DEFAULT ARRAY[true,true,true,true,true],
    task_assignees TEXT[] NOT NULL DEFAULT ARRAY[null,null,null,null,null]::TEXT[],
    withholding_assignee TEXT,
    fiscal_month INTEGER,
    report_day INTEGER,
    withholding_type TEXT,
    industry TEXT,
    entity_type TEXT,
    tax_agent BOOLEAN NOT NULL DEFAULT false,
    no_visit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS monthly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    task_index INTEGER NOT NULL,
    completed_at TIMESTAMPTZ,
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (client_id, year, month, task_index)
  )`,

  `CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    visited_on DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS withholding_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    salary_tax INTEGER,
    fee_tax INTEGER,
    tax_amount INTEGER,
    paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (client_id, year, month)
  )`,

  `CREATE TABLE IF NOT EXISTS year_end_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    adjustment_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (client_id, year)
  )`,
];

for (const stmt of statements) {
  await sql.query(stmt);
  console.log("OK:", stmt.trim().slice(0, 60));
}

console.log("\nAll tables created successfully!");
