import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Client } from "@/lib/types";
import { requireApiKey } from "@/lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const rows = await sql`
    SELECT * FROM clients ORDER BY sort_order ASC
  `;
  return NextResponse.json(rows as Client[]);
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const { name } = body as { name: unknown };

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const maxOrderRows = await sql`SELECT COALESCE(MAX(sort_order), 0) AS max FROM clients`;
  const nextOrder = Number(maxOrderRows[0].max) + 1;

  const rows = await sql`
    INSERT INTO clients (name, sort_order)
    VALUES (${name.trim()}, ${nextOrder})
    RETURNING *
  `;
  return NextResponse.json(rows[0] as Client, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();
  const client = body as Client;
  const { id } = client;

  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await sql`
    UPDATE clients SET
      name                 = ${client.name},
      sort_order           = ${client.sort_order},
      enabled_tasks        = ${client.enabled_tasks},
      task_assignees       = ${client.task_assignees},
      withholding_assignee = ${client.withholding_assignee ?? null},
      fiscal_month         = ${client.fiscal_month ?? null},
      report_day           = ${client.report_day ?? null},
      withholding_type     = ${client.withholding_type ?? null},
      industry             = ${client.industry ?? null},
      entity_type          = ${client.entity_type ?? null},
      tax_agent            = ${client.tax_agent},
      no_visit             = ${client.no_visit}
    WHERE id = ${id}
    RETURNING *
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  return NextResponse.json(rows[0] as Client);
}

export async function DELETE(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await sql`DELETE FROM clients WHERE id = ${id} RETURNING id`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
