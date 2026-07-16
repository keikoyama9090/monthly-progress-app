import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireApiKey } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  await sql`
    create table if not exists withholding_agent_tasks (
      id uuid primary key default gen_random_uuid(),
      client_id uuid references clients(id) on delete cascade,
      year integer not null,
      month integer not null check (month between 1 and 12),
      completed_at timestamptz,
      created_at timestamptz default now(),
      unique(client_id, year, month)
    )
  `;
  await sql`create index if not exists idx_withholding_agent_tasks_year on withholding_agent_tasks(year)`;
  await sql`create index if not exists idx_withholding_agent_tasks_year_client on withholding_agent_tasks(year, client_id)`;

  const check = await sql`SELECT to_regclass('public.withholding_agent_tasks') as t`;
  return NextResponse.json({ ok: true, table: check[0].t });
}
